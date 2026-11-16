# Kasisolusi — media ekosistem

Redesain home.kasisolusi.co.id. Struktur dan tampilan beranda mengikuti mockup
yang disetujui (Sep 2026), direvisi sesuai tracker klien 23 Sep 2026: berita terbaru
sebagai hero, "Ramai Dibicarakan", podcast, cuplikan Shorts, Kasisolusi Business
Institute (KBI), dan produk pilihan dari toko Lynk.id Kasisolusi.

Revisi 13 Okt 2026 (tracker "Task_Revisi_Website_Kasisolusi_KBI" dan folder Drive
"Website KS" dari klien): halaman KBI disusun ulang menjadi 10 Schools, Program Terdekat
KBI, dan Produk Edukasi Kasisolusi; ada halaman detail kelas Strategi Investasi 2027;
section KBI di beranda disamakan; dan `/wellness` kembali menjadi halaman, berisi landing
page D.V.N yang dipasang persis panduan klien. Revisi putaran 2 (15 Okt 2026) memasang
materi PIC: Instagram 10 school, tautan Lynk.id kelas dan checkout, poster Mini MBA baru,
isi resmi detail kelas, produk tambahan, dan tempat video jualan.
Situs statis, tanpa dependensi saat build.

## Menjalankan

```bash
node build.mjs     # membangun ke dist/ (jumlah halaman ikut jumlah berita; /wellness hanya bila WELLNESS_TAYANG)
node server.mjs    # server lokal di http://localhost:4321
node audit.mjs     # audit tautan mati, meta, JSON-LD, gambar, sitemap
```

Tidak ada `npm install`. Build hanya memakai Node bawaan. Dependensi npm hanya ada di
`otomasi/` (pipeline berita otomatis, lihat bagian "Berita otomatis").

## Isi

| Berkas | Isi |
|---|---|
| `data/site.mjs` | fakta perusahaan, copy hero, menu, sosial media, program, pilar topik |
| `data/ekosistem.mjs` | founder, Shorts, identitas KBI, produk Lynk.id beranda, menu Bantuan |
| `data/kbi.mjs` | halaman KBI: 10 school, 3 program, produk edukasi, detail kelas, standar UTM |
| `data/episodes.mjs` | 36 episode dari kanal YouTube @kasisolusi |
| `data/news.mjs` | berita tulisan tangan (opsional), digabung dengan berita otomatis; kosong sejak 15 Nov 2026 |
| `data/berita/*.json` | berita dan tips otomatis, satu berkas per artikel (`<tanggal>-<slug>.json`), plus `_status.json` |
| `src/berita-otomatis.mjs` | pembaca dan pemeriksa bentuk berita otomatis (dipakai build dan pipeline) |
| `otomasi/` | pipeline berita otomatis: `jalan.mjs`, `lib/`, uji di `uji/`, `pasang-secrets.ps1` |
| `.github/workflows/berita-otomatis.yml` | jadwal GitHub Actions pipeline berita otomatis |
| `data/articles.mjs` | 24 artikel rangkuman editorial (urut tanggal terbaru) |
| `src/seo.mjs` | head, Open Graph, Twitter Card, JSON-LD |
| `src/ui.mjs` | header, footer, kartu, ikon |
| `src/kbi.mjs` | komponen halaman KBI, section KBI beranda, dan detail kelas |
| `src/wellness.mjs` | landing page D.V.N (dokumen berdiri sendiri, mengikuti panduan klien). **Tidak ada di repo publik**, lihat bagian Wellness |
| `src/styles.css` | sistem desain (navy + biru, Plus Jakarta Sans) |
| `src/app.js` | menu seluler, pemutar, filter, pencarian, event klik keluar KBI, pilihan paket |
| `build.mjs` | perakit halaman |
| `tools/clean-frames.py` | hapus timecode rekaman dari frame video (tidak dipakai lagi sejak 13 Okt 2026) |
| `tools/olah-aset-kbi.py` | logo school, poster kelas, dan foto mentor dari materi klien menjadi aset siap tayang |
| `tools/olah-aset-wellness.py` | gambar dan font panduan Wellness menjadi aset siap tayang (tidak ada di repo publik) |
| `tools/olah-sampul-berita.py` | gambar unggahan/thumbnail menjadi sampul berita 16:9 di `public/assets/berita/` |
| `tools/make-og.mjs` | pembuat kartu OG 1200x630 (sekali jalan, butuh `sharp`) |

## Sumber data

- **Episode**: judul, tanggal, durasi, dan tayangan dari kanal YouTube `@kasisolusi`
  (channel `UC5rEjJFYx03lhODA9uH9zew`). Kartu memakai thumbnail resmi YouTube.
- **Berita** (sejak 25 Okt 2026): unggahan Instagram @kasisolusi yang bertema UMKM atau
  evergreen (dibaca lewat jev lalu dipanjangkan), ditambah berita UMKM dari media nasional dan
  laman resmi lembaga (detikcom, Kompas.com, Kontan, Koran Jakarta/Antara, investortrust.id,
  BPJPH, DJP). Fakta hanya dari sumber yang dicantumkan, dicocokkan dengan teks aslinya; klaim
  narasumber ditulis sebagai pengakuan. Foto dari sumbernya dengan kredit (field `foto`).
  Sejak 26 Okt 2026 News (beranda, /berita, /berita/kanal/*) HANYA berisi berita. Rangkuman
  podcast tampil di halaman Podcast (bagian "Rangkuman Episode", /podcast#rangkuman); alamatnya
  tetap /berita/<slug>, tetapi remah roti, menu aktif, dan bacaan lanjutannya ikut Podcast.
  Sejak pipeline otomatis dipasang (15 Nov 2026), berita dan tips baru ditulis otomatis ke
  `data/berita/` (lihat "Berita otomatis"); `data/news.mjs` tetap dibaca dan digabung urut waktu.
  12 berita contoh 25 Okt 2026 dihapus saat otomasi mulai; arsipnya (beserta foto milik media
  sumber) hanya ada di laptop pengembang, tidak di repo.
- **Profil, program, pilar topik**: home.kasisolusi.co.id beserta subhalamannya.
- **KBI**: folder Drive "Website KS" dari klien (8 Okt 2026) dan materi PIC di tracker
  (14 Okt 2026). Logo resmi 10 school (Branding School masuk, Media School keluar),
  akun Instagram tiap school, poster Affiliate Blueprint, Strategi Investasi 2027, dan
  poster master Mini MBA for Entrepreneur. Poster portrait ditampilkan utuh di kanvas 1:1
  (`poster-*-1x1.webp`), tanpa memotong isinya. Tautan kelas dan checkout per paket dari
  PIC (Lynk.id); batas pendaftaran Mini MBA dari SG Academy (/course/detail/42 online,
  /35 offline). Isi detail kelas Investment dari poster, slide deskripsi halaman kelas
  di Lynk.id, dan dokumen PIC 19 Okt 2026 (fasilitas paket apa adanya, cocok untuk siapa,
  prasyarat, jam, perkiraan susunan kelas, FAQ, bio Deryansha); foto mentor dipotong dari
  poster. Sejak 15 Nov 2026 fasilitas paket = benefit kiriman tim KBI, dan susunan Produk
  Edukasi ikut kiriman tim KBI (dua produk pindah ke toko Lynk.id KBI, satu dari toko Adli
  Hibatul); sampul produk baru diambil dari gambar produk Lynk.id. Video jualan = dua reels Instagram (`detailInvestment.video`, tautan reel
  Instagram atau YouTube; daftar kosong = section tidak tampil).
- **Wellness**: artifact Claude "Landing Page D.V.N — Wireframe" dari klien. Teks, warna,
  font, dan gambar disalin apa adanya; daftar penyimpangan ada di kepala `src/wellness.mjs`.
  Formulir belum membuka WhatsApp sampai `WA_CS` diisi. Halaman ini noindex dan tidak
  masuk sitemap karena panduannya sendiri menyebut isinya masih draft. Font Canela Text
  dan Neue Haas Grotesk Display Pro adalah font berlisensi: pastikan klien punya lisensi web.
  **Repo ini publik**, jadi `src/wellness.mjs`, `public/assets/wellness/` (gambar dan font
  berlisensi), dan `tools/olah-aset-wellness.py` sengaja tidak di-commit (lihat `.gitignore`) dan
  hanya ada di laptop pengembang. Selama `WELLNESS_TAYANG = false`, build tidak membutuhkannya.
  Menayangkan lagi dari repo butuh jalan lain untuk fontnya, karena font berlisensi tidak boleh
  masuk repo publik.
  **Sejak 25 Okt 2026 disembunyikan sementara:** `WELLNESS_TAYANG = false` di
  `data/site.mjs` (menu hilang, `wellness.html` tidak dibangun) dan redirect sementara
  `/wellness` ke `/` di `vercel.json`. Menayangkan lagi = ubah flag ke `true` dan hapus redirect itu.
- **Sosial media**: linktree resmi home.kasisolusi.co.id/welcome (Spotify, TikTok),
  indeks Google (Instagram @kasisolusi, LinkedIn).

Yang **sengaja tidak dipasang** karena tidak ada sumbernya: kerja sama Cyber
University, angka "50K+ Community", handle @kbi.*, halaman Kontak dan Media Kit.

- **Produk**: 8 produk pilihan dari https://lynk.id/kasisolusi (diperiksa 23 Sep 2026),
  tanpa harga karena harga dan promo di Lynk.id berubah-ubah. Sampul disimpan di
  `public/assets/produk/`. Satu produk (Rumus Anti Nganggur) adalah tautan afiliasi
  Lynk yang dipajang di toko Kasisolusi.

Artikel di `/berita` adalah **rangkuman editorial** dari episode nyata, bukan
laporan peristiwa. Tidak ada kutipan narasumber yang dikarang.

## Struktur halaman

```
/                          beranda
/podcast                   indeks episode, saring per kanal
/podcast/<slug>            36 halaman episode
/berita                    News & Insights, saring per kanal
/berita/kanal/<kanal>      6 halaman kanal
/berita/<slug>             24 rangkuman podcast + berita (data/news.mjs dan data/berita/*.json)
/kelas                     KBI: 10 Schools, Program Terdekat KBI, Produk Edukasi
/kelas/strategi-investasi-2027   detail kelas Investment School
/wellness                  landing page D.V.N (noindex, di luar sitemap)
/program                   indeks program
/program/<slug>            4 halaman program
/tentang                   profil
/cari                      pencarian sisi klien
/404
sitemap.xml  robots.txt  rss.xml  search-index.json
```

## Deploy

Vercel, tanpa framework. `vercel.json` mengatur `buildCommand`, `cleanUrls`, dan
header cache. Domain kanonik diambil otomatis dari `VERCEL_PROJECT_PRODUCTION_URL`.
Untuk domain sendiri, isi env `SITE_ORIGIN`, misalnya `https://kasisolusi.co.id`.

**Pindah ke kasisolusi.co.id (16 Nov 2026, sedang berjalan).** Alamat utama `www.kasisolusi.co.id`;
`kasisolusi.co.id` 308 ke `www` (diatur di domain proyek Vercel). Kedua domain sudah didaftarkan
di proyek `kasisolusi-portal` dan menunggu verifikasi TXT `_vercel.kasisolusi.co.id` dari pengelola
DNS (Niagahoster). Domain baru pindah ke proyek ini SAAT TXT terverifikasi; DNS lama (A 76.76.21.21,
CNAME cname.vercel-dns.com) masih diterima Vercel, nilai anjurannya A 216.150.1.1 + 216.150.16.1 dan
CNAME `9b2b4225300c3f94.vercel-dns-017.com`. Sampai pindah, env `SITE_ORIGIN` (Production) sengaja
`https://kasisolusi-portal.vercel.app`, karena `VERCEL_PROJECT_PRODUCTION_URL` memilih domain kustom
terpendek (`kasisolusi.co.id`, yang masih menampilkan situs lama lalu jadi redirect). Begitu pindah:
ganti `SITE_ORIGIN` ke `https://www.kasisolusi.co.id` lalu deploy ulang. MX dan rekaman email jangan
disentuh. Tautan produk etalase lama `/343` sampai `/399` dialihkan permanen ke `/#produk`.

**Setelah berita otomatis menyala, situs HANYA boleh berubah lewat repo** (commit ke GitHub,
lalu Vercel membangun dari Git). Jangan lagi `vercel deploy` dari folder lokal: folder lokal
tidak punya berita yang ditulis otomasi di repo, jadi deploy manual akan menimpa situs hidup
dengan versi tanpa berita-berita itu sampai commit otomatis berikutnya. Sebelum menyunting
apa pun di laptop, `git pull` dulu.

## Berita otomatis

Keputusan pemilik 15 Nov 2026: berita dan tips terbit **otomatis tanpa review**, paling banyak
**12 berita UMKM + 3 tips per hari WIB** (kurang tidak apa-apa). Fokus isi: berita UMKM, tips dan
trik, solusi. Judul boleh memancing tetapi jujur. Penulis: model murah lewat OpenRouter. Sampul:
ilustrasi AI (OpenAI `gpt-image-2.6-flare` kualitas low; `gpt-image-1` sudah dimatikan OpenAI
23 Okt 2026). Cadangan Pollinations mati bawaan sejak 15 Nov 2026, lihat bagian Gambar.

### Alur satu putaran

GitHub Actions (`.github/workflows/berita-otomatis.yml`) jalan tiap jam 06.13-22.13 WIB lalu:

1. **Cek kuota dan jam** (`node otomasi/jalan.mjs --cek`, tanpa `npm ci`). Kalau kuota hari ini
   penuh atau belum waktunya, job selesai dalam hitungan detik.
2. **Kumpulkan kandidat** dari sumber resmi, RSS media, dan YouTube Kasisolusi.
3. **Saring**: kunci sumber yang sudah diproses (14 hari), judul yang mirip dengan yang sudah
   terbit, relevansi UMKM, umur bahan, dan topik yang dihindari (kriminal, kekerasan, kematian,
   asusila, judi, perkara hukum, politik praktis; bencana hanya bila soal pemulihan usaha).
4. **Ambil teks sumber** (Readability), dengan robots.txt dihormati.
5. **Tulis** lewat OpenRouter (keluaran JSON terstruktur), lalu **penjaga** di kode. Gagal =
   diulang sekali dengan daftar masalahnya; gagal lagi = dilewati dan alasannya dicatat.
6. **Ilustrasi** 1280x720 WebP, lalu tulis `data/berita/<tanggal>-<slug>.json` dan
   `public/assets/berita/<slug>.webp`, perbarui `data/berita/_status.json`.
7. **Gerbang**: `node build.mjs` dan `node audit.mjs` harus lolos. Kalau gagal, tidak ada yang
   di-commit (Vercel tetap menayangkan versi terakhir).
8. **Commit hanya** `data/berita/` dan `public/assets/berita/` (tidak pernah `git add -A`),
   push dengan `pull --rebase` sampai 5 kali. Bentrok rebase = berhenti, tidak menimpa apa pun.
9. **Kabar Telegram** (kalau secrets-nya ada): artikel yang terbit, yang dilewati, biaya, galat.

### Sumber

| Prioritas | Sumber | Catatan |
|---|---|---|
| 1 | DJP, Kemenko Perekonomian, Bank Indonesia, Kemendag, Kemenperin, BPJPH, DJKI, BPOM, PNM, Kementerian Ekraf | bahan paling lama 7 hari; Kemenperin dilewati di runner (memblokir IP pusat data) |
| 1 | umkm.go.id | hanya radar judul: isi artikelnya dimuat lewat API bertoken, halamannya cuma judul + 160 karakter |
| 2 | detikFinance, CNBC Indonesia (News, Entrepreneur), Liputan6 Bisnis | butir paling lama 3x24 jam, ditulis ulang, sumber disebut lengkap (media, judul asli, tautan) |
| 2 | Republika, ANTARA | terpasang tetapi otomatis dilewati: robots.txt keduanya menolak perayap AI; ANTARA juga melarang crawling untuk AI di kaki halamannya |
| tips | YouTube @kasisolusi: RSS kanal (episode baru) dan RSS playlist Sales, Finance, Branding, Marketing School, #CoachKasisolusi, Titik Arah | bahan hanya judul + deskripsi resmi episode; Shorts, siaran langsung, deskripsi tipis, topik investasi/medis, dan materi yang terikat tahun lewat dilewati |

Tidak dipakai: bisnis.com (403, proteksi bot tidak diakali), Google News RSS (robots.txt menutup
`/rss/`), OJK (WAF menolak), SMESCO (tanpa halaman daftar, isinya kiriman ulang media), RSS Tempo
(basi), indonesia.go.id dan Shopee Seller Education (kerangka JavaScript), kemenkop.go.id dan
halal.go.id (tidak terjangkau). Pola dan jebakan sumber resmi sebagian diwarisi dari The Signal
(`scripts/fetch-gov.mjs`): garis miring di ujung `asal` DJP, `/index.php` DJP dibuang, ekon.go.id
butuh `curl -k` di runner.

### Kuota dan laju

- Per putaran paling banyak 3 berita + 1 tips; per hari 12 + 3 (`otomasi/lib/konfigurasi.mjs`).
- Batas kumulatif naik tiap jam dari 06.00 dan penuh paling lambat pukul 19.00 WIB (berita: 06=1,
  08=3, 10=5, 12=6, 14=8, 16=10, 18=12); sesudahnya sampai 22.59 jadi waktu kejar. GitHub membuang kira-kira
  separuh event schedule; simulasi di `otomasi/uji/lain.test.mjs` (50% jadwal hilang) memberi
  rata-rata 11,9 berita dan 3 tips per hari.
- Penghitung harian dan kunci sumber ada di `data/berita/_status.json`. Jangan disunting tangan
  selagi otomasi aktif.

### Penjaga (ditegakkan di kode, `otomasi/lib/penjaga.mjs`)

- **Angka**: setiap nominal, persen, jumlah, tanggal, dan nomor aturan harus ada di bahan, dicocokkan
  sebagai NILAI beserta satuannya (Rp2 miliar = Rp2.000.000.000), tanpa cadangan "asal digitnya ada".
- **Superlatif** dari daftar eksplisit (paling sering/banyak/..., terbesar/tertinggi/..., mayoritas,
  kebanyakan, sebagian besar, pada umumnya, rata-rata) dan jumlah samar (ribuan, ratusan, ...) harus
  ada di bahan.
- **Tanda pisah panjang** diganti koma; **"Prabowo"** telanjang di luar kutipan menjadi "Presiden
  Prabowo"; kutipan langsung tidak disunting dan harus ada persis di bahan.
- Kata tidak baku (nunggu, dikasih, nanya, biar, buat, cuma, bikin, ...), judul (25-70 karakter,
  tanpa tanda seru, tidak kapital semua, tidak sensasional, wajib menyebut pokok soal), panjang isi
  (berita 300-800 kata, tips 200-650), bagian penutup "Apa artinya bagi pelaku usaha", kanal sah,
  tanpa tautan/markdown/emoji/tanda `< >`, tidak menyalin kalimat bahan, dan judul tidak kembar
  dengan yang terbit 14 hari terakhir.
- Kredit: `sumber` berisi tautan asli; `foto` berisi `"Dok. <lembaga>"` untuk foto rilis atau
  `"Ilustrasi AI"`.

### Gambar

**Foto rilis dulu** (keputusan pemilik 16 Nov 2026, pola The Signal): berita dari siaran pers
lembaga memakai foto dari halaman rilisnya, dikreditkan `Dok. <lembaga>` (misalnya Dok. Kemendag),
alamat aslinya disimpan di `fotoSumber`. Pemilihnya `otomasi/lib/foto-rilis.mjs`, yang memindah utuh
`cariFotoUtama` The Signal (og:image satu domain induk, lalu jalur penyimpanan foto berita, lalu nama
yang dekat dengan URL sumber; tanpa tingkat "gambar pertama apa pun" karena itu selalu logo atau
spanduk). Tambahan di sini: bucket awan milik lembaga sendiri (Ekraf di storage.googleapis.com),
og:image BI yang http dan turunan web SharePoint-nya. Foto harus mendatar, minimal 800x450, dan
belum pernah dipakai; kalau tidak, artikel memakai ilustrasi AI. Foto MEDIA (detik, CNBC, Liputan6)
tidak pernah diambil karena hak ciptanya sering milik kantor berita; berita media dan tips tetap
ilustrasi AI. Uji langsung 16 Nov 2026 dari laptop: DJP, Kemenko Perekonomian, BI, Kemendag,
Kemenperin, BPJPH, DJKI, Ekraf berfoto; PNM (og:image = favicon) dan BPOM jatuh ke ilustrasi.
Ganti sampul artikel yang sudah terbit: `node otomasi/ganti-foto-rilis.mjs <slug>`.

**Ilustrasi AI** (cadangan, dan untuk berita media serta tips): prompt hanya benda atau suasana, ditambah "no text, no lettering, no numbers, no logos, no faces,
no people". Objek yang pada dasarnya bertulisan atau berorang (dokumen, papan nama, uang, layar,
orang, bangunan terkenal) diganti objek cadangan per kanal sebelum dikirim. Sidik SHA-256 gambar
disimpan 180 hari; gambar kembar dibuat ulang dengan variasi prompt. Paling banyak 6 gambar per putaran.

Model OpenAI dicoba berurutan (`gpt-image-2.6-flare`, lalu `gpt-image-2.5-flare`); model yang ditolak
karena tidak ada dilewati untuk sisa putaran. Token keluaran tiap gambar tercatat di log Actions.
**Pollinations mati bawaan**: uji kering 15 Nov 2026 menunjukkan jalur tanpa kuncinya menempelkan
watermark "pollinations.ai" walau diminta `nologo=true`, dan menjawab 402 sesudah tiga gambar.
Kalau semua penyedia gagal, artikel itu dilewati dan dicoba lagi di putaran berikutnya.

### Kill switch, secrets, variabel

| Nama | Jenis | Isi |
|---|---|---|
| `OTOMASI_BERITA` | variabel | `aktif` = menerbitkan; nilai lain = job tidak jalan (uji kering manual tetap bisa) |
| `OPENROUTER_API_KEY` | secret | wajib |
| `OPENAI_API_KEY` | secret | wajib untuk mode terbit (ilustrasi), kecuali Pollinations dinyalakan |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | secret | opsional, kabar tiap putaran |
| `OPENROUTER_MODEL` | variabel | opsional; bawaan `deepseek/deepseek-v4.1-flash`, cadangan `z-ai/glm-5.3-flash`, `qwen/qwen3.8-flash` |
| `OPENAI_IMAGE_MODEL` | variabel | opsional; bawaan `gpt-image-2.6-flare`, cadangan `gpt-image-2.5-flare` |
| `GAMBAR_POLLINATIONS` | variabel | `ya` = nyalakan cadangan Pollinations (bertanda air di jalur gratis); bawaan mati |
| `SITE_ORIGIN` | variabel | opsional; alamat situs untuk tautan di kabar Telegram |

Pasang dengan skrip yang dijalankan pemilik sendiri (kunci diketik tersembunyi, tidak masuk berkas):

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File otomasi\pasang-secrets.ps1 -Repo pemilik/nama-repo
# saklar saja, tanpa mengetik ulang kunci:
powershell -NoProfile -ExecutionPolicy Bypass -File otomasi\pasang-secrets.ps1 -Repo pemilik/nama-repo -HanyaVariabel -Status aktif
```

### Menjalankan di laptop

```bash
cd otomasi && npm ci && cd ..
node otomasi/jalan.mjs --kering            # uji kering; tanpa kunci memakai penulis dan gambar tiruan
node otomasi/jalan.mjs --kering --tiruan --pollinations   # tiruan, gambar sungguhan dari Pollinations (bertanda air)
cd otomasi && npm test                     # uji penjaga, angka, laju, robots.txt, API tiruan
```

Hasil uji kering ada di `.scratch/kering/<waktu>/` (`ringkasan.md`, `kandidat.json`, artikel, gambar)
dan tidak menyentuh `data/` maupun `public/`. Mode terbit menolak jalan tanpa `OTOMASI_BERITA=aktif`
dan `OPENROUTER_API_KEY`, dan tidak pernah memakai penulis tiruan.

### Menarik artikel

Hapus `data/berita/<tanggal>-<slug>.json` dan gambarnya lewat commit. Kuncinya tetap tercatat di
`_status.json`, jadi sumber yang sama tidak ditulis ulang, dan slot kuota hari itu tidak terbuka lagi.

### Urutan go-live

1. Buat repo (publik) tanpa 12 berita contoh di `data/news.mjs` beserta gambarnya.
2. Pasang secrets dan variabel (`OTOMASI_BERITA=mati` dulu).
3. Actions > Berita otomatis > Run workflow dengan "kering" dicentang; periksa artifact-nya.
4. Nyalakan saklar (`-HanyaVariabel -Status aktif`), biarkan beberapa putaran mengisi `data/berita/`.
5. Baru sambungkan Vercel ke repo. Sejak itu, lihat peringatan di bagian Deploy.

Status: kelima langkah selesai 15 Nov 2026 (repo `komunika-mi/kasisolusi-portal`; dua uji kering
di runner; saklar `aktif` pukul 23.49 WIB; putaran pertama menerbitkan 3 berita + 1 tips; proyek
Vercel `kasisolusi-portal` tersambung ke repo). Sejak itu situs dibangun Vercel dari Git, termasuk
dari commit `github-actions[bot]`.

## Catatan

- YouTube dimuat dengan pola facade. Iframe baru dibuat setelah tombol putar
  ditekan, memakai `youtube-nocookie.com`.
- Animasi reveal hanya aktif bila JavaScript hidup. Tanpa JS isi halaman tetap
  terlihat penuh.
- Status "Jadwal terakhir" pada kelas KBI dihitung saat build dari `endDate`.
