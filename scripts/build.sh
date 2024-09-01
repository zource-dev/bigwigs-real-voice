#!/bin/sh
rm -rf tmp BigWigs_VoiceGCP BigWigs_VoiceGCP.zip
git clone https://github.com/BigWigsMods/BigWigs_Voice.git tmp/BigWigs_Voice

mkdir -p BigWigs_VoiceGCP/Sounds/
node --loader ts-node/esm --no-warnings --experimental-specifier-resolution=node tts/index.ts tmp/BigWigs_Voice/Tools sounds SO

cp assets/* BigWigs_VoiceGCP/
cp sounds/* BigWigs_VoiceGCP/Sounds/

zip -r BigWigs_VoiceGCP.zip BigWigs_VoiceGCP
