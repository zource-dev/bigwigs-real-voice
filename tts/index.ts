import Fs from 'node:fs/promises';
import Path from 'node:path';
import { queue } from 'async';
import ProgressBar from 'progress';
import { parseDir, fileNotExist } from './utils.js';
import { textToFileGCP, VoiceType } from './gcp-tts.js';

const VOICE = VoiceType[process.argv[4] as VoiceType] || VoiceType.SO;
const SOURCE = Path.resolve(process.argv[2]);
const TARGET = Path.resolve(`${process.argv[3]}`);

await Fs.mkdir(TARGET, { recursive: true });

const createCounter = (limitPerMinute: number) => {
  const start = Date.now();
  let count = 0;
  return async () => {
    const currentLimit = Math.ceil((Date.now() - start) / 60000) * limitPerMinute;
    if (count >= currentLimit) {
      const nextTick = start + Math.ceil(count/limitPerMinute) * 60000 - Date.now();
      console.log('\nawait', Math.ceil(nextTick / 1000), 's', count, 'of', currentLimit);
      await new Promise(resolve => setTimeout(resolve, nextTick));
    }
    count++;
  };
};

const count = createCounter(10000);

export interface EncodingQueueItem {
  text: string;
  filename: string;
}

const encodingQueue = queue<EncodingQueueItem>(async ({ text, filename }) => {
  if (await fileNotExist(filename)) {
    // const timeout = new Promise(r => setTimeout(r, 600));
    await textToFileGCP(filename, text, VOICE);
    // await timeout;
    // await count();
  }
}, 2);

for await (const { file, spells } of parseDir(SOURCE)) {
  const progress = new ProgressBar(`${file} [:bar] :current/:total (:rate/s)  :percent :etas`, { total: spells.length });
  for (const [name, source] of spells) {
    const text = source.replace(/\:/g, '').replace(/=.*/g, '') + '!';
    const filename = Path.join(TARGET, `${name}.ogg`);
    encodingQueue.push({ text, filename }, () => {
      progress.tick();
    });
  }
  await encodingQueue.drain();
  progress.terminate()
}


