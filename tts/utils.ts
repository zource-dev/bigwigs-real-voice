import CP from 'node:child_process';
import { promises as Fs, constants } from 'node:fs';
import Path from 'node:path';

export const exec = (command: string) => new Promise((resolve, reject) => CP.exec(command, (error, stdout, stderr) => {
  if (error) {
    reject({ error, stdout, stderr });
  } else {
    resolve({ stdout, stderr });
  }
}));

export const parse = (content: string) => content.split('\n')
        .map(spell => spell.split(/\t+/).filter(Boolean))
        .filter(spell => !!spell[0] && !/^\s*;/.test(spell[0]));

export const parseFile = async (filename: string) => {
  const content = await Fs.readFile(filename, 'utf-8');
  return parse(content);
};

export const fileNotExist = (filename: string) => Fs.access(filename, constants.F_OK).catch(() => true);

export async function* parseDir(dirname: string) {
  const files = await Fs.readdir(dirname);
  for (const file of files) {
    if (/^(spells|words)/.test(file)) {
      yield {
        file,
        spells: await parseFile(Path.join(dirname, file)),
      };
    }
  }
};
