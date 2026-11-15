# Mengolah gambar sumber berita (unggahan Instagram @kasisolusi / thumbnail YouTube Kasisolusi)
# menjadi sampul 16:9 siap tayang.
#   python -I tools/olah-sampul-berita.py <folder-unduhan>
# Keluaran: public/assets/berita/<slug>.webp (1280x720)
#   - gambar mendatar dipangkas tengah ke 16:9;
#   - gambar tegak/persegi (reels, carousel) tampil utuh di tengah, latarnya gambar yang sama
#     diperbesar dan dikaburkan, sehingga isi dan teks di gambar tidak terpotong.
# Gambar Instagram diambil versi 1080w dari halaman embed (tanpa ikon play bawaan og:image).
# Berkas sumber yang tidak ada dilewati.
import os
import sys
from PIL import Image, ImageFilter, ImageEnhance

SRC = sys.argv[1]
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'assets', 'berita')
os.makedirs(OUT, exist_ok=True)
W, H = 1280, 720

# slug berita -> berkas sumber (lihat `sumber` tiap berita di data/news.mjs)
SAMPUL = {
    'pedagang-sate-padang-sektor-9-pindah-lapak-akibat-pungutan': 'yt-NbjyL8luEpU.jpg',
    'dari-ojol-jadi-affiliator-kisah-agus': 'bersih-De6cRmdiu74.jpg',
    'podbus-konsep-karnus-kasisolusi-pecahkan-rekor-muri': 'bersih-DeX7LuaTS0m.jpg',
    'bpjs-ketenagakerjaan-untuk-pelaku-umkm-dan-freelancer': 'bersih-De3t8hIABUH.jpg',
    'views-gmv-affiliate-jalan-di-tempat-bangun-kepercayaan': 'bersih-DetgPBKGf6F.jpg',
    'tawarkan-value-bukan-diskon-agar-tak-dicap-brand-diskonan': 'bersih-Des6hk2ACIr.jpg',
    # 25 Okt 2026: berita dari sumber di luar Instagram; foto dari sumber beritanya (izin
    # pengguna: "foto ambil aja kan masih contoh"), kreditnya di field `foto` data/news.mjs.
    'realisasi-kur-tembus-rp260-triliun-hingga-21-oktober-2026': 'kur.jpg',
    'potongan-biaya-e-commerce-50-persen-untuk-umk-mulai-25-oktober': 'ecom.jpg',
    'wajib-halal-18-oktober-2026-dan-sertifikat-halal-gratis-untuk-umk': 'halal.jpg',
    'bunga-pnm-mekaar-ditargetkan-turun-jadi-8-persen': 'mekaar.jpg',
    'pp-20-2026-tarif-pajak-umkm-tetap-0-5-persen-ini-yang-berubah': 'pp20.jpg',
    'menteri-umkm-ikut-berburu-sepatu-bekas-di-tiktok': 'thrift.jpg',
}


def sampul(im):
    if im.width / im.height >= W / H:
        h = H
        w = round(im.width * H / im.height)
        im = im.resize((w, h), Image.LANCZOS)
        x = (w - W) // 2
        return im.crop((x, 0, x + W, H))
    bg = im.resize((W, round(im.height * W / im.width)), Image.LANCZOS)
    top = (bg.height - H) // 2
    bg = bg.crop((0, top, W, top + H)).filter(ImageFilter.GaussianBlur(40))
    bg = ImageEnhance.Brightness(bg).enhance(0.6)
    fg = im.resize((round(im.width * H / im.height), H), Image.LANCZOS)
    bg.paste(fg, ((W - fg.width) // 2, 0))
    return bg


for slug, nama in SAMPUL.items():
    p = os.path.join(SRC, nama)
    if not os.path.exists(p):
        print(f'lewati {nama} (tidak ada)')
        continue
    out = os.path.join(OUT, f'{slug}.webp')
    sampul(Image.open(p).convert('RGB')).save(out, 'WEBP', quality=84, method=6)
    print(f'{slug}.webp', os.path.getsize(out))
