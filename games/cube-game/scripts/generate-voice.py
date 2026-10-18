"""Generate bundled narration with the user's installed BaoCut IndexTTS 2.5.
Run node scripts/voice-manifest.mjs first. Existing MP3s are reused by text hash.
Requires BaoCut, its model/preset voice, and ffmpeg on macOS.
"""
import json
import subprocess
import hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CLI = Path('/Applications/BaoCut.app/Contents/Resources/bin/audiocpp/audiocpp_cli')
MODEL = Path.home() / 'Library/Application Support/BaoCut/models/audio-cpp/audio.cpp-gguf-indextts2.5/IndexTTS2.5-GGUF/index-tts2_5-q8_0.gguf'
VOICE = Path('/Applications/BaoCut.app/Contents/Resources/model-assets/tts-voices/zh-female.wav')
work = ROOT / 'artifacts/voice'
out = ROOT / 'public/audio'
out.mkdir(exist_ok=True, parents=True)
records = json.loads((work / 'records.json').read_text())
missing = [r for r in records if not (out / r['filename']).exists()]
if missing:
    batch_key = hashlib.sha256(''.join(r['filename'] for r in missing).encode()).hexdigest()[:12]
    work = work / batch_key
    work.mkdir(parents=True, exist_ok=True)
    (work / 'batch.txt').write_text('\n'.join(r['spoken'] for r in missing)+'\n')
    print(f'IndexTTS 2.5: synthesizing {len(missing)} clips', flush=True)
    with (work / 'generation.log').open('w') as log:
        subprocess.run([str(CLI), '--task', 'tts', '--family', 'index_tts2', '--model', str(MODEL), '--backend', 'metal', '--voice-ref', str(VOICE), '--seed', '17', '--batch-text-file', str(work / 'batch.txt'), '--out-dir', str(work / 'raw'), '--batch-manifest-out', str(work / 'synthesis.json'), '--metrics'], stdout=log, stderr=log, check=True)
    for i, r in enumerate(missing,1):
        wav=work / 'raw' / f'line_{i}.wav'
        subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(wav),'-af','loudnorm=I=-18:TP=-2:LRA=7','-ar','24000','-ac','1','-codec:a','libmp3lame','-b:a','64k',str(out/r['filename'])],check=True)
        print(f'{i}/{len(missing)} {r["filename"]}',flush=True)
manifest={r['text']:'/audio/'+r['filename'] for r in records}
(out / 'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
print('Bundled voice library ready.',flush=True)
