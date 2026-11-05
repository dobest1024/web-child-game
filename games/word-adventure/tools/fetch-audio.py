"""下载 Wikimedia Commons 上的开放许可真人发音，转成 mp3，并写 audio/CREDITS.txt、audio/manifest.json。
用法（在游戏目录）：python3 -I tools/fetch-audio.py <原始文件下载目录>
原始文件放在单独的目录里（不进仓库），只用 ffmpeg 读取。"""
import json, re, subprocess, sys, time, html, urllib.error, urllib.parse, urllib.request
from pathlib import Path

root = Path(__file__).resolve().parent.parent
raw_dir = Path(sys.argv[1]).resolve()
raw_dir.mkdir(parents=True, exist_ok=True)
UA = 'WordAdventureBuild/0.1 (https://github.com/dobest1024/web-child-game; offline build script for a children game)'
ALLOWED = {'CC BY-SA 3.0', 'CC BY-SA 2.5', 'CC BY-SA 4.0', 'CC BY 3.0', 'CC BY 4.0', 'CC0', 'Public domain'}

src = (root / 'js/words.js').read_text(encoding='utf-8')
word_ids = re.findall(r"^\s*\['([a-z]+)', '", src, re.M)
# Commons 上没有 En-us-<词>.ogg 的，用 Lingua Libre 同一位朗读者的录音（CC0）
LINGUA_LIBRE = {w: f'LL-Q1860 (eng)-Grendelkhan-{w}.wav' for w in ['black', 'orange', 'grandma', 'grandpa']}
jobs = [(f'words/{w}', LINGUA_LIBRE.get(w, f'En-us-{w}.ogg')) for w in word_ids]
jobs += [(f'letters/{c}', f'En-us-{c}.ogg') for c in 'abcdefghijklmnopqrstuvwxyz']


def fetch(url, binary=False):
    for attempt in range(10):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA})
            with urllib.request.urlopen(req, timeout=60) as r:
                return r.read() if binary else json.load(r)
        except urllib.error.HTTPError as e:
            # 被限流：按服务器给的 Retry-After 等（最多 2 分钟一次）
            wait = int(e.headers.get('Retry-After') or 10) if e.code == 429 else 5
            print(f'  {e.code}，{min(wait, 120)} 秒后重试 {url.rsplit("/", 1)[-1]}', flush=True)
            time.sleep(min(wait, 120))
        except Exception:
            time.sleep(5 + attempt * 5)
    raise RuntimeError('下载失败 ' + url)


def plain(s):
    s = re.sub(r'\[\[(?:User|user):[^|\]]+\|([^\]]+)\]\]', r'\1', s or '')
    s = re.sub(r'\[\[(?:User|user):([^\]]+)\]\]', r'\1', s)
    s = re.sub(r'\{\{[^}]*\|([^}|]+)\}\}', r'\1', s)
    return html.unescape(re.sub(r'<[^>]+>', '', s)).strip()


meta = {}
titles = [t for _, t in jobs]
for i in range(0, len(titles), 25):
    chunk = titles[i:i + 25]
    q = {'action': 'query', 'format': 'json', 'redirects': 1, 'prop': 'imageinfo|revisions', 'rvprop': 'content', 'rvslots': 'main',
         'iiprop': 'url|extmetadata', 'iiextmetadatafilter': 'LicenseShortName|Artist|LicenseUrl', 'titles': '|'.join('File:' + t for t in chunk)}
    data = fetch('https://commons.wikimedia.org/w/api.php?' + urllib.parse.urlencode(q))
    alias = {}
    for n in data['query'].get('normalized', []) + data['query'].get('redirects', []):
        alias[n['to']] = alias.get(n['from'], n['from'])
    for page in data['query']['pages'].values():
        asked = alias.get(page['title'], page['title'])
        asked = alias.get(asked, asked)
        if 'missing' in page:
            raise SystemExit('Commons 上没有 ' + asked)
        info = page['imageinfo'][0]
        em = info.get('extmetadata', {})
        artist = plain(em.get('Artist', {}).get('value'))
        if not artist or artist.startswith('No machine-readable'):
            text = page['revisions'][0]['slots']['main']['*']
            m = re.search(r'\|\s*author\s*=\s*([^\n]+)', text, re.I) or re.search(r'recorded by \[\[User:([^|\]]+)', text)
            artist = plain(m.group(1)) if m else '未署名'
        meta[asked[5:]] = {'file': page['title'], 'page': info['descriptionurl'], 'url': info['url'].split('?')[0],
                           'license': plain(em.get('LicenseShortName', {}).get('value')),
                           'licenseUrl': plain(em.get('LicenseUrl', {}).get('value')), 'artist': artist.replace('\n', ' / ')}
    time.sleep(1)

manifest = []
for out_id, title in jobs:
    m = meta[title]
    if m['license'] not in ALLOWED:
        raise SystemExit(f'{title} 的许可 {m["license"]} 不在白名单里')
    raw = raw_dir / (out_id.replace('/', '_') + Path(m['url']).suffix)
    if not raw.exists():
        raw.write_bytes(fetch(m['url'], binary=True))
        time.sleep(4)  # Commons 对下载限速很严，慢慢来
    mp3 = root / 'audio' / f'{out_id}.mp3'
    mp3.parent.mkdir(parents=True, exist_ok=True)
    # 裁掉首尾静音、统一音量、单声道 64k mp3，结尾留 0.1 秒
    trim = 'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.03'
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(raw), '-af',
                    f'{trim},areverse,{trim},areverse,loudnorm=I=-16:TP=-1.5,apad=pad_dur=0.1',
                    '-ac', '1', '-ar', '44100', '-b:a', '64k', str(mp3)], check=True)
    probe = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(mp3)],
                           capture_output=True, text=True, check=True)
    manifest.append({'id': out_id, 'source': m['file'], 'page': m['page'], 'license': m['license'], 'artist': m['artist'],
                     'seconds': round(float(probe.stdout.strip()), 2)})

(root / 'audio/manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=1), encoding='utf-8')
lines = ['单词大冒险 · 发音来源', '',
         '所有单词和字母读音都是真人录音，来自 Wikimedia Commons（含 Lingua Libre 项目），未用合成语音。',
         '处理：裁掉首尾静音、统一音量、转成单声道 mp3（按 CC BY-SA 的要求，处理后的文件同样以 CC BY-SA 共享）。', '']
for item in manifest:
    lines.append(f"{item['id']}.mp3  ←  {item['source']}  |  {item['artist']}  |  {item['license']}  |  {item['page']}")
(root / 'audio/CREDITS.txt').write_text('\n'.join(lines) + '\n', encoding='utf-8')
by_artist = {}
for item in manifest:
    by_artist.setdefault((item['artist'], item['license']), []).append(item['id'])
for (artist, lic), ids in by_artist.items():
    print(f'{artist} ({lic}): {len(ids)}')
print('最长/最短：', max(manifest, key=lambda x: x['seconds']), min(manifest, key=lambda x: x['seconds']))
