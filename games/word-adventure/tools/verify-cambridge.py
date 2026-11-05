"""对照 Cambridge Dictionary 核对词库里每个单词的拼写和词义，结果写到 tests/sources/cambridge.json。
用法（在游戏目录）：python3 -I tools/verify-cambridge.py"""
import html, json, re, subprocess, time, urllib.request
from pathlib import Path

root = Path(__file__).resolve().parent.parent
src = (root / 'js/words.js').read_text(encoding='utf-8')
words = re.findall(r"^\s*\['([a-z]+)', '", src, re.M)
out = {}
for w in words:
    url = f'https://dictionary.cambridge.org/dictionary/english/{w}'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (word-adventure spelling check)'})
    try:
        page = urllib.request.urlopen(req, timeout=30).read().decode('utf-8', 'replace')
    except Exception as e:
        out[w] = {'url': url, 'error': str(e)}
        continue
    heads = [html.unescape(h) for h in re.findall(r'<span class="hw dhw">([^<]*)</span>', page)]
    m = re.search(r'class="def ddef_d db">(.*?)</div>', page, re.S)
    definition = html.unescape(re.sub(r'<[^>]+>', '', m.group(1))).strip() if m else ''
    out[w] = {'url': url, 'headword': heads[0] if heads else None, 'definition': definition[:160]}
    time.sleep(0.8)  # 别打太快
(root / 'tests/sources/cambridge.json').write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding='utf-8')
for w, v in out.items():
    print(w.ljust(11), v.get('headword'), '|', (v.get('definition') or v.get('error', ''))[:70])
