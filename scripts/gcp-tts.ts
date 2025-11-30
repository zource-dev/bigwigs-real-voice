import Path from 'node:path';
import { promises as Fs } from 'node:fs';
import { TextToSpeechClient, protos } from '@google-cloud/text-to-speech';
import { exec } from './utils.js';

process.env['GOOGLE_APPLICATION_CREDENTIALS'] = Path.resolve('credentials.json');
console.log(process.env['GOOGLE_APPLICATION_CREDENTIALS']);

const client = new TextToSpeechClient();

export enum VoiceType {
  WG = 'WG',
  N2A = 'N2A',
  N2C = 'N2C',
  N2D = 'N2D',
  N2E = 'N2E',
  N2F = 'N2F',
  N2G = 'N2G',
  SQ = 'SQ',
  SO = 'SO',
  JD = 'JD',
  JF = 'JF',
  JO = 'JO',
  CO = 'CO',
  CD = 'CD',
  C3A = 'C3A',
  C3E = 'C3E',
}

export interface Voice {
  name: string;
  pitch: number;
  speakingRate: number;
}

const GCPVoice: Record<VoiceType, Voice> = {
  WG: {
    name: 'en-US-Wavenet-G',
    pitch: -20,
    speakingRate: 1.15,
  },
  N2A: {
    name: 'en-US-Neural2-A',
    pitch: -20,
    speakingRate: 1.15,
  },
  N2C: {
    name: 'en-US-Neural2-C',
    pitch: 0,
    speakingRate: 1.3,
  },
  N2D: {
    name: 'en-US-Neural2-D',
    pitch: -20,
    speakingRate: 1.15,
  },
  N2E: {
    name: 'en-US-Neural2-E',
    pitch: 0,
    speakingRate: 1.15,
  },
  N2F: {
    name: 'en-US-Neural2-F',
    pitch: 0,
    speakingRate: 1.2,
  },
  N2G: {
    name: 'en-US-Neural2-G',
    pitch: 3,
    speakingRate: 1.2,
  },
  SQ: {
    name: 'en-US-Studio-Q',
    pitch: 0,
    speakingRate: 1,
  },
  SO: {
    name: 'en-US-Studio-O',
    pitch: 0,
    speakingRate: 1,
  },
  CD: {
    name: 'en-US-Chirp-HD-D',
    pitch: 0,
    speakingRate: 1,
  },
  CO: {
    name: 'en-US-Chirp-HD-O',
    pitch: 0,
    speakingRate: 1,
  },
  JD: {
    name: 'en-US-Journey-D',
    pitch: 20,
    speakingRate: 1,
  },
  JF: {
    name: 'en-US-Journey-F',
    pitch: 0,
    speakingRate: 1,
  },
  JO: {
    name: 'en-US-Journey-O',
    pitch: 0,
    speakingRate: 1,
  },
  C3A: {
    name: 'en-US-Chirp3-HD-Algieba',
    // en-US-Chirp3-HD-Sadachbia
    pitch: 0,
    speakingRate: 1.15,
  },
  C3E: {
    name: 'en-US-Chirp3-HD-Erinome',
    pitch: 0,
    speakingRate: 1.15,
  },
};

export const textToFileGCP = async (filename: string, text: string, voice: VoiceType = VoiceType.N2D) => {
  if (!GCPVoice[voice]) {
    throw new Error(`No voice ${voice} found. Available voices: ${Object.keys(GCPVoice)}`);
  }
  const request: protos.google.cloud.texttospeech.v1.ISynthesizeSpeechRequest = {
    input: { text },
    audioConfig: {
      audioEncoding: 'MP3',
      pitch: GCPVoice[voice].pitch,
      speakingRate: GCPVoice[voice].speakingRate,
      sampleRateHertz: 22050,
      effectsProfileId: ['headphone-class-device'],
    },
    voice: {
      languageCode: 'en-US',
      name: GCPVoice[voice].name,
    },
  };
  const [response] = await client.synthesizeSpeech(request);
  await Fs.writeFile(`${filename}.mp3`, response.audioContent || '');
  await exec(`rm -f ${filename} && ffmpeg -i ${filename}.mp3 -c:a libvorbis -q:a 4 ${filename} && rm -f ${filename}.mp3`);
};

// https://www.ibm.com/demos/live/tts-demo/self-service/home
const sessionID = '07e1415d-250d-4e46-bc93-37e9b510da19';
//const voice = 'en-GB_JamesV3Voice';
const voice = 'en-US_MichaelV3Voice';

export const ibmTTS = async (filename: string, text: string) => {
  const payload = {
    sessionID,
    ssmlText: `<prosody pitch="default" rate="-0%">${text}</prosody>`,
  };
  await (
    await fetch('https://www.ibm.com/demos/live/tts-demo/api/tts/store', {
      method: 'post',
      headers: { accept: 'application/json, text/plain, */*', 'content-type': 'application/json;charset=UTF-8' },
      body: JSON.stringify(payload),
    })
  ).json();
  const content = await (await fetch(`https://www.ibm.com/demos/live/tts-demo/api/tts/newSynthesize?voice=${voice}&id=${sessionID}`)).text();
  await Fs.writeFile(filename, content);
};
