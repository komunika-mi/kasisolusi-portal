# Mengolah foto testimoni peserta untuk halaman detail kelas.
#   python -I tools/olah-testimoni.py <folder-unduhan>
# Sumber: folder Google Drive "TESTIMONIAL STEVEN ANDERSON" dari tim Kasisolusi (WA 23 Nov 2026).
# Tiap berkas adalah tangkapan layar kartu testimoni (foto di atas, kutipan, nama, pekerjaan).
# Yang diambil hanya fotonya; kutipan, nama, dan pekerjaan diketik ulang di data/kbi.mjs.
# Keluaran: public/assets/kbi/testimoni-<slug>.webp, 640x320 (2:1), tanpa bilah atas rapat
# (jam dan kode rapat Google Meet sengaja tidak ikut).
# Berkas sumber yang tidak ada di folder unduhan dilewati, jadi aset lama tetap dipakai.
import os
import sys
from PIL import Image

SRC = sys.argv[1]
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'assets', 'kbi')
os.makedirs(OUT, exist_ok=True)

UKURAN = (640, 320)

# nama berkas di Drive -> (slug, kotak potong 2:1 dalam piksel tangkapan layar)
FOTO = {
    'Screenshot 2026-11-19 at 16.37.02.png': ('meiliana', (82, 62, 710, 376)),
    'Screenshot 2026-11-19 at 16.37.12.png': ('chandra', (50, 42, 732, 383)),
    'Screenshot 2026-11-19 at 16.37.45.png': ('fina', (68, 48, 725, 376)),
    'Screenshot 2026-11-19 at 16.37.54.png': ('bambang', (72, 49, 714, 370)),
    'Screenshot 2026-11-19 at 16.38.14.png': ('harjono', (100, 60, 750, 385)),
}

for nama, (slug, kotak) in FOTO.items():
    p_src = os.path.join(SRC, nama)
    if not os.path.exists(p_src):
        print(f'lewati {nama} (tidak ada di folder unduhan)')
        continue
    im = Image.open(p_src).convert('RGB').crop(kotak).resize(UKURAN, Image.LANCZOS)
    p = os.path.join(OUT, f'testimoni-{slug}.webp')
    im.save(p, 'WEBP', quality=82, method=6)
    print(f'testimoni-{slug}.webp', im.size, os.path.getsize(p))
