"""Generate missing English word audio with local Qwen3-TTS; keep original recordings and credits."""
import json, os, subprocess
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
GAME = ROOT / 'games/word-adventure'
CLI = '/Applications/BaoCut.app/Contents/Resources/bin/audiocpp/audiocpp_cli'
MODEL = os.environ['QWEN_TTS_MODEL']
WORK = Path(os.environ.get('TTS_WORK', '/tmp/game-content/word-audio'))
WORK.mkdir(parents=True, exist_ok=True)
words = json.loads(subprocess.check_output(['node','-e','console.log(JSON.stringify(Object.values(require("./js/words.js").WORDS)))'],cwd=GAME))
manifest = json.loads((GAME/'audio/manifest.json').read_text())
existing = {x['id'] for x in manifest}
items = [w for w in words if w['audio'] not in existing]
for start in range(0,len(items),30):
    batch = items[start:start+30]
    folder = WORK/str(start); folder.mkdir(exist_ok=True)
    textfile = folder/'lines.txt'; textfile.write_text('\n'.join(w['show']+'.' for w in batch)+'\n')
    print(f'Generate {start+1}-{start+len(batch)} / {len(items)}',flush=True)
    with (folder/'synthesis.log').open('w') as log:
        subprocess.run([CLI,'--task','tts','--family','qwen3_tts','--model',MODEL,'--backend','metal','--speaker','ryan','--language','en','--seed','11','--max-tokens','70','--batch-text-file',str(textfile),'--out-dir',str(folder)],stdout=log,stderr=log,check=True)
    for i,w in enumerate(batch,1):
        dest=GAME/'audio'/f"{w['audio']}.mp3"
        subprocess.run(['ffmpeg','-y','-loglevel','error','-i',str(folder/f'line_{i}.wav'),'-af','silenceremove=start_periods=1:start_threshold=-42dB,areverse,silenceremove=start_periods=1:start_threshold=-42dB,areverse,loudnorm=I=-16,apad=pad_dur=0.15','-ac','1','-ar','24000','-b:a','48k',str(dest)],check=True)
        seconds=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',str(dest)]))
        if not 0.2 < seconds < 8: raise ValueError(f"Check recording: {w['id']} {seconds}")
        manifest.append({'id':w['audio'],'text':w['show'],'source':'Qwen3-TTS local synthesis','synthesized':True,'model':'Qwen3-TTS-12Hz-1.7B-CustomVoice','speaker':'ryan','seed':11,'seconds':seconds})
    (GAME/'audio/manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=1)+'\n')
credits=GAME/'audio/CREDITS.txt'
text=credits.read_text().replace('所有单词和字母读音都是真人录音','原有启蒙单词和字母读音是真人录音').replace('，未用合成语音。','。')
text+='\n新增二至六年级单词：本机 Qwen3-TTS 合成（ryan，seed 11），不是新增真人录音。\n'
for w in items:text+=f"{w['audio']}.mp3 | Qwen3-TTS local synthesis\n"
credits.write_text(text)
print('Generated',len(items),'recordings',flush=True)
