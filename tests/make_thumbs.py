# UX-04: vytvorí náhľady 480 px pre mriežku zbierky (spusti po pridaní novej ilustrácie do lib/card-art/)
import glob, os
from PIL import Image
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "lib", "card-art")
os.makedirs(os.path.join(root, "sm"), exist_ok=True)
for f in sorted(glob.glob(os.path.join(root, "*.webp"))):
    out = os.path.join(root, "sm", os.path.basename(f))
    if os.path.exists(out) and os.path.getmtime(out) >= os.path.getmtime(f): continue
    im = Image.open(f).convert("RGB"); w, h = im.size
    im.resize((480, round(h * 480 / w)), Image.LANCZOS).save(out, "WEBP", quality=72, method=6)
    print("náhľad", os.path.basename(f))
