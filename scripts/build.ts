import { writeFile, rm, mkdir, copyFile, readdir } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import Path from 'node:path';
import ProgressBar from 'progress';
import { queue } from 'async';
import { parseDir, fileNotExist } from './utils.js';
import { textToFileGCP, VoiceType } from './gcp-tts.js';

const VERSION = '11.0.3';

const INTERFACES = [
  11502,
  20504,
  30403,
  40401,
  100207,
  110000,
  110002,
];

const ADDONS: Record<string, { voiceType: VoiceType }> = {
  Male: {
    voiceType: VoiceType.SQ,
  },
  Female: {
    voiceType: VoiceType.SO,
  },
};

const createManifest = (name: string) => `
## Interface: ${INTERFACES.join(', ')}

## Title: BigWigs |cffff0000+|r|cffffffffReal Voice ${name}|r
## Version: v${VERSION}
## Notes: A plugin for BigWigs that will play Text-To-Speech sounds for boss abilities.
## Notes-zhCN: BigWigs附加模块，为团队首领技能播放语音合成（TTS）提示。
## Notes-zhTW: BigWigs附加模組，為團隊首領技能播放語音合成（TTS）提示。
## Notes-deDE: A plugin for BigWigs that will play Text-To-Speech sounds for boss abilities.
## Notes-frFR: A plugin for BigWigs that will play Text-To-Speech sounds for boss abilities.
## Notes-itIT: A plugin for BigWigs that will play Text-To-Speech sounds for boss abilities.
## Notes-koKR: 우두머리 능력에 대하여 텍스트 음성 변환 소리를 재생하는 BigWigs 플러그인입니다.
## Notes-ruRU: A plugin for BigWigs that will play Text-To-Speech sounds for boss abilities.
## Notes-ptBR: A plugin for BigWigs that will play Text-To-Speech sounds for boss abilities.
## Notes-esES: A plugin for BigWigs that will play Text-To-Speech sounds for boss abilities.
## Notes-esMX: A plugin for BigWigs that will play Text-To-Speech sounds for boss abilities.
## Author: Ivan Zakharchanka

## X-BigWigs-LoadOn-CoreEnabled: 1
## Dependencies: BigWigs
## LoadOnDemand: 1

## X-Category: Raid
## X-License: Apache-2.0

Core.lua
`;

const rmrf = (...paths: string[]) => Promise.all(paths.map(path => rm(path, { recursive: true, force: true })));

await rmrf('tmp');
execSync('git clone https://github.com/BigWigsMods/BigWigs_Voice.git tmp/BigWigs_Voice');

export interface EncodingQueueItem {
  text: string;
  filename: string;
  voiceType: VoiceType,
}

for (const [name, { voiceType }] of Object.entries(ADDONS)) {
  const projectName = `BigWigs_RealVoice_${name}`;
  const buildDir = `build/${projectName}`;

  const soundSource = `sounds/${voiceType}`;
  const soundsDir = `${buildDir}/Sounds`;

  await rmrf(buildDir);
  await mkdir(buildDir, { recursive: true });
  const manifest = createManifest(name);
  await writeFile(`${buildDir}/${projectName}.toc`, manifest);
  const assets = await readdir('assets');
  await Promise.all(assets.map(asset => copyFile(`assets/${asset}`, `${buildDir}/${asset}`)));

  const encodingQueue = queue<EncodingQueueItem>(async ({ voiceType, text, filename }) => {
    if (await fileNotExist(filename)) {
      await textToFileGCP(filename, text, voiceType);
    }
  }, 5);

  await mkdir(soundSource, { recursive: true });

  for await (const { file, spells } of parseDir('tmp/BigWigs_Voice/Tools')) {
    const encodingProgress = new ProgressBar(`${file} [:bar] :current/:total (:rate/s)  :percent :etas`, { total: spells.length });
    for (const [name, source] of spells) {
      const text = source.replace(/\:/g, '').replace(/=.*/g, '') + '!';
      const filename = Path.join(soundSource, `${name}.ogg`);
      encodingQueue.push({ text, filename, voiceType }, () => {
        encodingProgress.tick();
      });
    }
    await encodingQueue.drain();
    encodingProgress.terminate()
  }

  await rmrf(soundsDir);
  await mkdir(soundsDir, { recursive: true });
  const sounds = await readdir(soundSource);
  const copyProgress = new ProgressBar(`Copy ${voiceType} voice [:bar] :current/:total (:rate/s)  :percent :etas`, { total: sounds.length });
  for(const soundFile of sounds) {
    await copyFile(`sounds/${voiceType}/${soundFile}`, `${soundsDir}/${soundFile}`);
    copyProgress.tick();
  }
  copyProgress.terminate();

  console.log(`Packing ${projectName}`);
  execSync(`zip -r ${projectName}.zip ${projectName}`, { cwd: 'build' });
}
