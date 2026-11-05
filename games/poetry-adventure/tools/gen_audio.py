"""开发用：用本机 BaoCut 的 Qwen3-TTS 给每句诗生成朗读（游戏运行不依赖它）。
用法：QWEN_TTS_MODEL=<gguf 路径> python3 -I tools/gen_audio.py
每句用几个随机种子各生成一遍，挑时长合理（没多念、没截断）的那条，裁静音、统一音量、转 mp3。
结果写到 audio/lines/ 和 audio/manifest.json（id → 文本 → 文件 → 选中的 seed）。"""
import json, os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CLI = '/Applications/BaoCut.app/Contents/Resources/bin/audiocpp/audiocpp_cli'
MODEL = os.environ['QWEN_TTS_MODEL']
WORK = os.environ.get('TTS_WORK', '/tmp/poetry-tts')
SEEDS = [3, 11, 29, 47, 61, 83]
PUNCT = re.compile(r'[，。！？、；：《》]')

poems = json.loads(subprocess.run(['node', '-e', 'const p=require("./js/poems.js");console.log(JSON.stringify(p.POEMS))'],
                                  cwd=ROOT, capture_output=True, text=True, check=True).stdout)
items = []
for p in poems:
    items.append((f"{p['id']}-0", f"《{p['title'].split('（')[0]}》，{p['author']}。"))
    for i, line in enumerate(p['lines']):
        items.append((f"{p['id']}-{i + 1}", line))

os.makedirs(WORK, exist_ok=True)
lines_file = os.path.join(WORK, 'lines.txt')
with open(lines_file, 'w', encoding='utf-8') as f:
    f.write('\n'.join(text for _, text in items) + '\n')

for seed in SEEDS:
    out = os.path.join(WORK, f'seed{seed}')
    if os.path.isdir(out) and len(os.listdir(out)) >= len(items):
        continue
    print('seed', seed, flush=True)
    subprocess.run([CLI, '--task', 'tts', '--family', 'qwen3_tts', '--model', MODEL, '--backend', 'metal',
                    '--speaker', 'vivian', '--language', 'zh', '--seed', str(seed), '--max-tokens', '140',
                    '--batch-text-file', lines_file, '--out-dir', out], capture_output=True, check=True)


def voiced(path):
    log = subprocess.run(['ffmpeg', '-hide_banner', '-i', path, '-af', 'silencedetect=n=-38dB:d=0.25', '-f', 'null', '-'],
                         capture_output=True, text=True).stderr
    dur = float(re.search(r'Duration: \d+:\d+:([\d.]+)', log).group(1))
    starts = [float(x) for x in re.findall(r'silence_start: ([\d.]+)', log)]
    ends = [float(x) for x in re.findall(r'silence_end: ([\d.]+)', log)]
    silent = sum(min(e, dur) - s for s, e in zip(starts, ends + [dur]))
    return dur - silent


out_dir = os.path.join(ROOT, 'audio', 'lines')
os.makedirs(out_dir, exist_ok=True)
manifest, failed = [], []
for n, (aid, text) in enumerate(items, 1):
    chars = len(PUNCT.sub('', text))
    lo, hi, ideal = chars * 0.2, chars * 0.55 + 0.6, chars * 0.36
    best = None
    for seed in SEEDS:
        wav = os.path.join(WORK, f'seed{seed}', f'line_{n}.wav')
        if not os.path.exists(wav):
            continue
        v = voiced(wav)
        if lo <= v <= hi and (best is None or abs(v - ideal) < abs(best[1] - ideal)):
            best = (wav, v, seed)
    if not best:
        failed.append(aid)
        continue
    mp3 = os.path.join(out_dir, f'{aid}.mp3')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', best[0], '-af',
                    'silenceremove=start_periods=1:start_threshold=-42dB,areverse,silenceremove=start_periods=1:start_threshold=-42dB,areverse,loudnorm=I=-16,apad=pad_dur=0.15',
                    '-ac', '1', '-ar', '24000', '-b:a', '48k', mp3], check=True)
    manifest.append({'id': aid, 'text': text, 'file': f'lines/{aid}.mp3', 'seed': best[2], 'voiced': round(best[1], 2)})

with open(os.path.join(ROOT, 'audio', 'manifest.json'), 'w', encoding='utf-8') as f:
    json.dump(manifest, f, ensure_ascii=False, indent=1)
print(json.dumps({'ok': len(manifest), 'failed': failed}, ensure_ascii=False))
