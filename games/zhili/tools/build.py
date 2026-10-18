#!/usr/bin/env python3
"""Bundle index.html + css + js into one self-contained file: dist/zhili.html"""
import re
from pathlib import Path

root = Path(__file__).resolve().parent.parent
html = (root / 'index.html').read_text(encoding='utf-8')
css = (root / 'css/style.css').read_text(encoding='utf-8')
scripts = re.findall(r'<script src="([^"]+)"></script>', html)
js = '\n'.join((root / s).read_text(encoding='utf-8') for s in scripts)

out = f'''<title>聪聪智力岛</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=ZCOOL+KuaiLe&display=swap">
<style>
{css}
</style>
<div id="app"></div>
<div id="fx" aria-hidden="true"></div>
<script>
{js}
</script>
'''
(root / 'dist').mkdir(exist_ok=True)
(root / 'dist/zhili.html').write_text(out, encoding='utf-8')
print('wrote dist/zhili.html', len(out.encode()), 'bytes,', len(scripts), 'scripts')
