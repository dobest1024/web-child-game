"""Generate missing poetry recordings locally with BaoCut Qwen3-TTS; preserve existing audio."""
import json, os, subprocess
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
GAME = ROOT / 'games/poetry-adventure'
CLI = '/Applications/BaoCut.app/Contents/Resources/bin/audiocpp/audiocpp_cli'
MODEL = os.environ['QWEN_TTS_MODEL']
WORK = Path(os.environ.get('TTS_WORK', '/tmp/game-content/poetry-audio'))
WORK.mkdir(parents=True, exist_ok=True)
poems = json.loads(subprocess.check_output(['node', '-e', 'console.log(JSON.stringify(require("./js/poems.js").POEMS))'], cwd=GAME))
manifest = json.loads((GAME / 'audio/manifest.json').read_text())
existing = {x['id'] for x in manifest}
items = [(f"{p['id']}-{i + 1}", line) for p in poems for i, line in enumerate(p['lines']) if f"{p['id']}-{i + 1}" not in existing]
# Small batches retain completed work if a synthesis process fails.
for start in range(0, len(items), 20):
    batch = items[start:start + 20]
    folder = WORK / str(start)
    folder.mkdir(exist_ok=True)
    textfile = folder / 'lines.txt'
    textfile.write_text('\n'.join(t for _, t in batch) + '\n')
    print(f'Generate {start + 1}-{start + len(batch)} / {len(items)}', flush=True)
    with (folder / 'synthesis.log').open('w') as log:
        subprocess.run([CLI, '--task','tts','--family','qwen3_tts','--model',MODEL,'--backend','metal','--speaker','vivian','--language','zh','--seed','11','--max-tokens','110','--batch-text-file',str(textfile),'--out-dir',str(folder)], stdout=log, stderr=log, check=True)
    for i,(aid,text) in enumerate(batch,1):
        wav = folder / f'line_{i}.wav'
        dest = GAME / 'audio/lines' / f'{aid}.mp3'
        subprocess.run(['ffmpeg','-y','-loglevel','error','-i',str(wav),'-af','silenceremove=start_periods=1:start_threshold=-42dB,areverse,silenceremove=start_periods=1:start_threshold=-42dB,areverse,loudnorm=I=-16,apad=pad_dur=0.15','-ac','1','-ar','24000','-b:a','48k',str(dest)],check=True)
        seconds = float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',str(dest)]))
        if not 0.4 < seconds < 12: raise ValueError(f'Check recording: {aid} {seconds}')
        manifest.append({'id':aid,'text':text,'file':f'lines/{aid}.mp3','source':'Qwen3-TTS local synthesis','seed':11,'seconds':seconds})
    (GAME / 'audio/manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=1)+'\n')
print(f'Generated {len(items)} recordings', flush=True)
