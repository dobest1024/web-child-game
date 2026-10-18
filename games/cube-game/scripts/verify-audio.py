"""Measure bundled narration and fail on missing, silent, or truncated media."""
import array
import json
import math
import subprocess
from pathlib import Path

root=Path(__file__).resolve().parent.parent
manifest=json.loads((root/'src/voice-manifest.json').read_text())
results=[]
for text,url in manifest.items():
    path=root/'public'/url.lstrip('/')
    probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration:stream=sample_rate,channels','-of','json',str(path)]))
    duration=float(probe['format']['duration'])
    pcm=subprocess.check_output(['ffmpeg','-v','error','-i',str(path),'-f','s16le','-ac','1','-ar','16000','-'])
    samples=array.array('h',pcm)
    rms=math.sqrt(sum(s*s for s in samples)/len(samples))/32768
    assert duration>.35 and rms>.003, (text,duration,rms)
    # Flag plausible omission or looping for manual review, not as an ASR substitute.
    chars=len(text)
    assert duration<max(20,chars*1.2), (text,'unexpectedly long',duration)
    results.append({'text':text,'file':url,'seconds':round(duration,3),'rms':round(rms,4)})
report={'model':'IndexTTS 2.5 Q8 (local BaoCut)','voice':'zh-female','count':len(results),'totalSeconds':round(sum(x['seconds'] for x in results),2),'humanListening':'Not completed','clips':results}
(root/'artifacts/voice/verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps({k:v for k,v in report.items() if k!='clips'},ensure_ascii=False))
