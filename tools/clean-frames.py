"""Hapus timecode rekaman yang terbakar di frame video studio Kasisolusi.

Frame i.ytimg.com/vi/<id>/maxresN.jpg memuat timecode "00:00:00:00" semi-transparan
di posisi tetap (sekitar x 480-810, y 462-525 pada 1280x720). Skrip ini hanya
menghapus teks timecode itu (deteksi piksel terang tak berwarna di dalam kotak,
lalu diisi dari piksel sekitarnya). Isi foto tidak diubah.

Pakai: python tools/clean-frames.py   (butuh Pillow + numpy, tanpa OpenCV)
Hasil: public/assets/hero/<id>-<n>.jpg dan pratinjau sebelum/sesudah di tools/_cek/.
"""
import io
import os
import sys
import urllib.request

import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'assets', 'hero')
CEK = os.path.join(ROOT, 'tools', '_cek')

# (video id, nomor frame) yang dipakai situs. Harus sama dengan data/ekosistem.mjs.
# Hanya frame yang timecode-nya berada di atas latar gelap: di sana hasilnya bersih.
# Frame dengan timecode di atas kain bermotif/terang (mis. iePZ2OxOW-I) menyisakan bekas.
# Sejak revisi 13 Okt 2026 kartu Mini MBA lama juga dihapus, jadi tidak ada frame yang dipakai.
# Daftar dikosongkan; isi lagi dengan (id_video, nomor_frame) bila alat ini dibutuhkan.
FRAMES = []

BOX = (470, 452, 830, 522)  # x0, y0, x1, y1: pita baris timecode saja


def fetch(video_id, n):
    url = f'https://i.ytimg.com/vi/{video_id}/maxres{n}.jpg'
    with urllib.request.urlopen(url, timeout=30) as r:
        return Image.open(io.BytesIO(r.read())).convert('RGB')


def clean(img):
    arr = np.asarray(img).astype(np.float32)
    x0, y0, x1, y1 = BOX
    region = img.crop(BOX)

    gray = np.asarray(region.convert('L')).astype(np.float32)
    bg = np.asarray(region.convert('L').filter(ImageFilter.MedianFilter(31))).astype(np.float32)
    rgb = arr[y0:y1, x0:x1]
    sat = rgb.max(axis=2) - rgb.min(axis=2)

    # Teks timecode: jauh lebih terang dari latar gelap di sekitarnya dan tanpa warna.
    # Di atas latar terang (kemeja putih) teksnya nyaris tak terlihat, jadi dilewati
    # supaya kain, botol, dan tangan tidak ikut tersentuh.
    mask = (gray - bg > 22) & (sat < 40) & (bg < 125)
    m_img = Image.fromarray((mask * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5))
    mask = np.asarray(m_img) > 0

    out = rgb.copy()
    known = ~mask
    # Isi dari tepi ke dalam: rata-rata tetangga yang sudah diketahui.
    for _ in range(400):
        if known.all():
            break
        pad = np.pad(out * known[..., None], ((1, 1), (1, 1), (0, 0)))
        kpad = np.pad(known.astype(np.float32), 1)
        s = pad[:-2, 1:-1] + pad[2:, 1:-1] + pad[1:-1, :-2] + pad[1:-1, 2:]
        c = kpad[:-2, 1:-1] + kpad[2:, 1:-1] + kpad[1:-1, :-2] + kpad[1:-1, 2:]
        fill = (~known) & (c > 0)
        out[fill] = s[fill] / c[fill][:, None]
        known = known | fill
    # Haluskan hanya area yang diisi supaya tidak berpola.
    for _ in range(60):
        pad = np.pad(out, ((1, 1), (1, 1), (0, 0)), mode='edge')
        avg = (pad[:-2, 1:-1] + pad[2:, 1:-1] + pad[1:-1, :-2] + pad[1:-1, 2:]) / 4
        out[mask] = avg[mask]

    arr[y0:y1, x0:x1] = out
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8)), mask.mean()


def main():
    # Mode uji: python tools/clean-frames.py --uji ID:N ID:N ... (hasil hanya ke tools/_cek/uji)
    global OUT, CEK
    frames = FRAMES
    if len(sys.argv) > 2 and sys.argv[1] == '--uji':
        frames = [(a.split(':')[0], int(a.split(':')[1])) for a in sys.argv[2:]]
        OUT = CEK = os.path.join(ROOT, 'tools', '_cek', 'uji')
    os.makedirs(OUT, exist_ok=True)
    os.makedirs(CEK, exist_ok=True)
    for vid, n in frames:
        src = fetch(vid, n)
        done, ratio = clean(src)
        path = os.path.join(OUT, f'{vid}-{n}.jpg')
        done.save(path, quality=84, optimize=True, progressive=True)
        done.resize((640, 360), Image.LANCZOS).save(path.replace('.jpg', '-640.jpg'), quality=82, optimize=True, progressive=True)
        # pratinjau: potongan sebelum di atas, sesudah di bawah, diperbesar 2x
        x0, y0, x1, y1 = BOX
        a, b = src.crop(BOX), done.crop(BOX)
        w, h = a.size
        sheet = Image.new('RGB', (w, h * 2 + 6), (255, 0, 0))
        sheet.paste(a, (0, 0))
        sheet.paste(b, (0, h + 6))
        sheet.resize((w * 2, (h * 2 + 6) * 2)).save(os.path.join(CEK, f'{vid}-{n}.png'))
        print(f'{vid}-{n}: mask {ratio:.1%} -> {os.path.relpath(path, ROOT)} ({os.path.getsize(path) // 1024} KB)')


if __name__ == '__main__':
    sys.exit(main())
