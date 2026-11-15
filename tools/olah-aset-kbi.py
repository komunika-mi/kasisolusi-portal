# Mengolah aset KBI dari folder Drive "Website KS" (Ricky, 8 dan 14 Okt 2026) menjadi berkas siap tayang.
#   python -I tools/olah-aset-kbi.py <folder-unduhan>
# Keluaran: public/assets/kbi/
#   school-<slug>.webp          logo resmi school, dipangkas ruang kosongnya saja (rasio dan warna tetap)
#   poster-<slug>.webp          poster resmi utuh (portrait), lebar maksimal 1080 px
#   poster-<slug>-1x1.webp      adaptasi persegi: poster utuh di tengah kanvas 1:1, tanpa memotong isi
# Berkas sumber yang tidak ada di folder unduhan dilewati, jadi aset lama tetap dipakai.
# 14 Okt: Media School diganti Branding School (logo-branding.png), poster Mini MBA diganti
# poster master dari PIC (poster-itb-baru.png, 4320x5400) sehingga tidak perlu dibersihkan lagi.
import os
import sys
from PIL import Image, ImageFilter, ImageEnhance

SRC = sys.argv[1]
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'assets', 'kbi')
os.makedirs(OUT, exist_ok=True)

SCHOOLS = ['ai-digital', 'branding', 'investment', 'executive', 'finance',
           'marketing', 'human-capital', 'operation', 'sales', 'self-improvement']


def ada(nama):
    if os.path.exists(os.path.join(SRC, nama)):
        return True
    print(f'lewati {nama} (tidak ada di folder unduhan)')
    return False


def logo(slug):
    if not ada(f'logo-{slug}.png'):
        return
    im = Image.open(os.path.join(SRC, f'logo-{slug}.png')).convert('RGBA')
    im = im.crop(im.getbbox())
    w = 720
    im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
    p = os.path.join(OUT, f'school-{slug}.webp')
    im.save(p, 'WEBP', lossless=True, method=6)
    print(f'school-{slug}.webp', im.size, os.path.getsize(p))


def persegi(poster, gelap):
    """Poster utuh di tengah kanvas 1:1. Latar = poster yang sama, diperbesar dan dikaburkan."""
    s = 1080
    bg = poster.resize((s, round(poster.height * s / poster.width)), Image.LANCZOS)
    top = (bg.height - s) // 2
    bg = bg.crop((0, top, s, top + s)).filter(ImageFilter.GaussianBlur(48))
    bg = ImageEnhance.Brightness(bg).enhance(0.62 if gelap else 1.04)
    fg = poster.resize((round(poster.width * s / poster.height), s), Image.LANCZOS)
    bg.paste(fg, ((s - fg.width) // 2, 0))
    return bg


def poster(nama, slug, gelap=True):
    if not ada(nama):
        return
    im = Image.open(os.path.join(SRC, nama)).convert('RGB')
    if im.width > 1080:
        im = im.resize((1080, round(im.height * 1080 / im.width)), Image.LANCZOS)
    p = os.path.join(OUT, f'poster-{slug}.webp')
    im.save(p, 'WEBP', quality=88, method=6)
    sq = persegi(im, gelap)
    q = os.path.join(OUT, f'poster-{slug}-1x1.webp')
    sq.save(q, 'WEBP', quality=86, method=6)
    print(f'poster-{slug}.webp', im.size, os.path.getsize(p), '| 1x1', sq.size, os.path.getsize(q))


def mentor(slug, kotak):
    """Foto mentor (task 51) dipotong dari poster resmi kelas yang sudah diolah; CSS membulatkannya."""
    im = Image.open(os.path.join(OUT, 'poster-strategi-investasi-2027.webp')).convert('RGB')
    im = im.crop(kotak).resize((320, 320), Image.LANCZOS)
    p = os.path.join(OUT, f'mentor-{slug}.webp')
    im.save(p, 'WEBP', quality=86, method=6)
    print(f'mentor-{slug}.webp', im.size, os.path.getsize(p))


for s in SCHOOLS:
    logo(s)
poster('poster-adli.png', 'affiliate-blueprint')
poster('poster-steven.png', 'strategi-investasi-2027')
poster('poster-itb-baru.png', 'mini-mba', gelap=False)
# Kotak di poster 1080x1350: tepat di bawah judul "Investment", berpusat di wajah.
mentor('steven-anderson', (135, 255, 485, 605))
mentor('deryansha', (555, 255, 905, 605))
