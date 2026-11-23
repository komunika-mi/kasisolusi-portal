// Halaman KBI (/kelas) dan halaman detail kelas.
// Sumber: tracker "Task_Revisi_Website_Kasisolusi_KBI" dan folder Drive "Website KS"
// (Ricky, 8 Okt 2026): logo resmi school, poster kelas, contoh halaman "KBI di LP" dan
// "Detail per-kelas". Diperiksa 13 Okt 2026. Putaran 2 (materi PIC di tracker, 14 Okt 2026:
// sel merah = materi, baris kuning = tambahan task 63-65) dikerjakan 15 Okt 2026.
export const DIPERIKSA = '2026-10-15';

// Standar UTM mengikuti usulan di tracker (task 41 dan 42). Query yang sudah ada dipertahankan.
export function utm(url, content) {
  const u = new URL(url);
  u.searchParams.set('utm_source', 'kasisolusi_website');
  u.searchParams.set('utm_medium', 'referral');
  u.searchParams.set('utm_campaign', 'kbi');
  u.searchParams.set('utm_content', content);
  return u.toString();
}

export const kbiPage = {
  schools: {
    label: 'Pilih School',
    title: ['Belajar dari Praktisi.', 'Terapkan Langsung di Bisnis Anda.'],
    desc: 'Pilih school yang sesuai dengan kebutuhan Anda dan pelajari strategi bisnis yang relevan langsung dari praktisi berpengalaman.',
    igNote: 'Ikuti Instagram masing-masing school untuk update kelas, konten, dan informasi terbaru.',
    // Akun induk KBI dari daftar PIC (tracker H11, 14 Okt 2026).
    igInduk: 'https://www.instagram.com/kasisolusibusinessinstitute/',
    // Sepuluh school sesuai contoh halaman "KBI di LP" dan daftar Instagram PIC (14 Okt 2026).
    // Logo Branding School dikirim PIC 14 Okt; Media School dikeluarkan (keputusan pengguna
    // 15 Okt 2026) karena tidak ada di contoh halaman maupun daftar Instagram.
    // Kartu dengan `instagram` otomatis menjadi tautan "Lihat di Instagram" dengan UTM school_{slug}_card.
    items: [
      { slug: 'ai_digital', file: 'ai-digital', name: 'Kasisolusi AI Digital School', w: 720, h: 211, instagram: 'https://www.instagram.com/kasisolusiaidigital/' },
      { slug: 'branding', file: 'branding', name: 'Kasisolusi Branding School', w: 720, h: 201, instagram: 'https://www.instagram.com/kasisolusibrandingschool/' },
      { slug: 'investment', file: 'investment', name: 'Kasisolusi Investment School', w: 720, h: 196, instagram: 'https://www.instagram.com/kasisolusiinvestmentschool/' },
      { slug: 'executive', file: 'executive', name: 'Kasisolusi Executive School', w: 720, h: 211, instagram: 'https://www.instagram.com/kasisolusiexecutiveschool/' },
      { slug: 'finance', file: 'finance', name: 'Kasisolusi Finance School', w: 720, h: 205, instagram: 'https://www.instagram.com/kasisolusifinanceschool/' },
      { slug: 'marketing', file: 'marketing', name: 'Kasisolusi Marketing School', w: 720, h: 217, instagram: 'https://www.instagram.com/kasisolusimarketingschool/' },
      { slug: 'human_capital', file: 'human-capital', name: 'Kasisolusi Human Capital School', w: 720, h: 293, tinggi: 1.28, instagram: 'https://www.instagram.com/kasisolusihumancapital.school/' },
      { slug: 'operation', file: 'operation', name: 'Kasisolusi Operation School', w: 720, h: 206, instagram: 'https://www.instagram.com/kasisolusioperationschool/' },
      { slug: 'sales', file: 'sales', name: 'Kasisolusi Sales School', w: 720, h: 228, instagram: 'https://www.instagram.com/kasisolusisalesschool/' },
      { slug: 'self_improvement', file: 'self-improvement', name: 'Kasisolusi Self Improvement', w: 720, h: 199, instagram: 'https://www.instagram.com/kasisolusiselfimproveschool/' },
    ],
  },

  program: {
    label: 'Program Terdekat KBI',
    title: 'Amankan Kursi Anda Sebelum Pendaftaran Ditutup.',
    desc: 'Program pilihan bersama praktisi dengan jadwal dan kuota terbatas. Pilih kelas yang paling relevan dan daftar sekarang sebelum periode pendaftaran berakhir.',
    // `tutup` = saat pendaftaran dan klaim "akan datang" dimatikan otomatis (task 31).
    // `terbuka: true` hanya bila status pendaftaran sudah dicek di halaman pendaftarannya.
    items: [
      {
        slug: 'affiliate_blueprint',
        school: 'Sales School',
        title: 'Affiliate Blueprint',
        sub: 'Cara Mulai, Bangun Audience, dan Monetisasi Konten',
        poster: 'affiliate-blueprint',
        alt: 'Poster Sales School Affiliate Blueprint bersama Adli Hibatul dan Deryansha',
        fakta: [
          { ikon: 'kalender', teks: 'Sabtu, 31 Oktober 2026 · 09.00–12.00 WIB' },
          { ikon: 'layar', teks: 'Online Webinar via Zoom' },
          { ikon: 'mentor', teks: 'Adli Hibatul & Deryansha' },
        ],
        harga: [{ label: 'Investasi', nilai: 'Rp99.000' }],
        tutup: '2026-10-31T12:00:00+07:00',
        // Halaman kelas di Lynk.id menerima pemesanan ("Book Now", dicek 15 Okt 2026).
        terbuka: true,
        // Tautan kelas dari PIC (tracker H23, 14 Okt 2026).
        cta: [{ label: 'Daftar Sekarang', url: 'https://lynk.id/kasisolusi/4pql1o8947lp', utm: 'program_affiliate_blueprint_cta' }],
        posterUrl: { url: 'https://lynk.id/kasisolusi/4pql1o8947lp', utm: 'program_affiliate_blueprint_poster' },
      },
      {
        slug: 'strategi_investasi_2027',
        school: 'Investment School',
        title: 'Strategi Investasi 2027',
        sub: 'Cara Bikin Aset Tetap Cuan di Berbagai Kondisi Market',
        poster: 'strategi-investasi-2027',
        alt: 'Poster Investment School Strategi Investasi 2027 bersama Steven Anderson dan Deryansha',
        fakta: [
          { ikon: 'kalender', teks: 'Sabtu, 12 Desember 2026 · 09.00–17.00 WIB' },
          { ikon: 'lokasi', teks: 'Hotel Aloft, Jl. KH. Wahid Hasyim, Jakarta, dan online via Zoom' },
          { ikon: 'mentor', teks: 'Steven Anderson & Deryansha' },
        ],
        harga: [
          { label: 'Offline Pass', nilai: 'Rp799.000' },
          { label: 'Online Pass', nilai: 'Rp499.000' },
        ],
        tutup: '2026-12-12T17:00:00+07:00',
        // Kedua halaman paket di Lynk.id menerima pemesanan (dicek 15 Okt 2026).
        terbuka: true,
        // Task 48: kartu, poster, dan CTA kelas Investment menuju halaman detail lebih dulu.
        cta: [{ label: 'Daftar Sekarang', url: '/kelas/strategi-investasi-2027' }],
        posterUrl: { url: '/kelas/strategi-investasi-2027' },
      },
      {
        slug: 'mini_mba',
        school: 'ITB Executive Education Program',
        title: 'Mini MBA for Entrepreneur',
        sub: 'Dari Founder Jadi Leader',
        poster: 'mini-mba',
        alt: 'Poster Mini MBA for Entrepreneur: Dari Founder Jadi Leader bersama Deryansha Azhary, Achmad Ghazali, dan Achmad Zaky. Perkiraan mulai 27-28 November 2026 di ITB Kampus Jakarta. Harga presale kelas online Rp3.500.000, kelas offline Rp7.000.000.',
        // Jadwal, format, dan harga dari poster master yang dikirim PIC 14 Okt 2026 (task 27-28;
        // PIC: "yang betul yang november"). Batas pendaftaran dari halaman SG Academy.
        fakta: [
          { ikon: 'kalender', teks: 'Perkiraan mulai 27–28 November 2026' },
          { ikon: 'lokasi', teks: 'Offline/Hybrid di ITB Kampus Jakarta, atau kelas online' },
          { ikon: 'mentor', teks: 'Deryansha Azhary, Achmad Ghazali, Achmad Zaky' },
        ],
        harga: [
          { label: 'Presale Online', nilai: 'Rp3.500.000' },
          { label: 'Presale Offline', nilai: 'Rp7.000.000' },
        ],
        tutup: '2026-11-20T23:59:59+07:00',
        tutupLabel: 'Pendaftaran sampai 20 November 2026',
        terbuka: true,
        cta: [
          { label: 'Daftar Online', url: 'https://sgacademy.id/course/detail/42', utm: 'mini_mba_online_cta' },
          { label: 'Daftar Offline', url: 'https://sgacademy.id/course/detail/35', utm: 'mini_mba_offline_cta' },
        ],
        // Poster tidak langsung keluar situs: dua format punya tujuan berbeda (task 29),
        // jadi klik poster mengarah ke pilihan format di kartu yang sama.
        posterUrl: { url: '#daftar-mini-mba' },
      },
    ],
  },

  produk: {
    label: 'Produk Edukasi Kasisolusi',
    title: 'Belajar Lebih Dalam, Kapan Saja.',
    desc: 'Kumpulan produk edukasi yang dikembangkan Kasisolusi bersama mentor, praktisi, dan partner pilihan.',
    store: 'https://lynk.id/kasisolusi',
    // Susunan dari tim KBI (WA, dipasang 15 Nov 2026): Unboxing Your Purpose diganti buku
    // Saat Terpuruk, Mereka Bangkit; Personal Branding dan Creative Marketing pindah ke toko
    // Lynk.id KBI; rekaman Steven Anderson diganti 360 Materi Affiliate (toko Adli Hibatul).
    // Tautan dipasang persis seperti dikirim. utm_source dan utm_medium bawaannya (kontenx,
    // igdery) tertimpa standar UTM situs saat dirender. Tautan lama di lynk.id/kasisolusi
    // sudah Not Found atau terlempar ke beranda toko (dicek 15 Nov 2026).
    // Judul buku mengikuti sampulnya (pakai koma); sampul diambil dari gambar produk Lynk.id.
    items: [
      { slug: 'saat_terpuruk_mereka_bangkit', jenis: 'Buku', nama: 'Saat Terpuruk, Mereka Bangkit', url: 'https://lynk.id/kasisolusi/nxEN0DP?utm_source=kontenx&utm_medium=igdery', img: '/assets/produk/saat-terpuruk-mereka-bangkit.webp' },
      { slug: 'saat_aku_mengerti_diriku', jenis: 'Buku', nama: 'Saat Aku Mengerti Diriku', url: 'https://lynk.id/kasisolusi/96vmwgn4jml9', img: '/assets/produk/saat-aku-mengerti-diriku.webp' },
      { slug: 'personal_branding_master_class', jenis: 'Rekaman Kelas', nama: 'Personal Branding Master Class bersama Deryansha', url: 'https://lynk.id/kasisolusibusinessinstitute/2o0x10dex26m?utm_source=kontenx&utm_medium=igdery', img: '/assets/produk/personal-branding-master-class.webp' },
      { slug: 'creative_marketing_ideas', jenis: 'Rekaman Kelas', nama: 'Creative Marketing Ideas Course bersama Deryansha', url: 'https://lynk.id/kasisolusibusinessinstitute/vdg1qrnx75vy?utm_source=kontenx&utm_medium=igdery', img: '/assets/produk/creative-marketing-ideas.webp' },
      { slug: 'materi_affiliate_adli_hibatul', jenis: 'Materi Digital', nama: '360 Materi Affiliate oleh Adli Hibatul', url: 'https://lynk.id/adlihibatul/LgW58kP', img: '/assets/produk/360-materi-affiliate.webp' },
    ],
  },
};

// Halaman detail kelas Investment (task 48-62, 65).
// Keputusan pengguna 13 Okt 2026: yang tampil HANYA materi resmi. Sumbernya:
// - poster kelas;
// - slide deskripsi halaman kelas di Lynk.id yang ditunjuk PIC sebagai materi task 51-60
//   (tracker H53-H62, 14 Okt 2026): Tentang Kelas, keterangan Steven, Apa yang Akan Anda
//   Dapatkan, Topik. Slide testimoni dan grafik hasil investasi tidak dipakai;
// - dokumen PIC "kelas steven offline & online" + bio Deryansha (WA Ricky 19 Okt 2026):
//   fasilitas paket, cocok untuk siapa, prasyarat, jam, perkiraan susunan kelas, FAQ, reels.
// Keputusan pengguna 19 Okt 2026: fasilitas paket ditampilkan APA ADANYA sesuai dokumen
// (termasuk poin bersyarat "jika ..."), dan susunan kelas ditampilkan sebagai perkiraan.
// Sejak 15 Nov 2026 fasilitas paket diganti benefit dari tim KBI (lihat `paket`).
// Catatan internal dokumen ("prasyarat resmi tetap perlu dikonfirmasi kepada penyelenggara")
// sengaja tidak ditampilkan.
export const detailInvestment = {
  path: '/kelas/strategi-investasi-2027',
  school: 'Kasisolusi Investment School',
  title: 'Strategi Investasi 2027',
  sub: 'Cara Bikin Aset Tetap Cuan di Berbagai Kondisi Market',
  poster: 'strategi-investasi-2027',
  posterAlt: 'Poster resmi Kasisolusi Investment School: Strategi Investasi 2027 bersama Steven Anderson dan Deryansha, Sabtu 12 Desember 2026 di Hotel Aloft Jakarta. Offline Pass Rp799.000, Online Pass Rp499.000.',
  tutup: '2026-12-12T17:00:00+07:00',
  // Slide 2/6 Lynk.id.
  tentang: {
    judul: '2027 Bukan Hanya Tentang Menebak Aset Mana yang Akan Naik.',
    isi: 'Perubahan kondisi ekonomi dan market membuat investor perlu memiliki strategi yang lebih aktif, adaptif, dan terstruktur dalam mengelola portfolio.',
  },
  // Video jualan (task 65): dua reels Instagram @kasisolusi dari PIC (19 Okt 2026). Tiap entri
  // boleh tautan reel Instagram atau ID/tautan YouTube; daftar kosong = section tidak dirender.
  // `judul` = teks pembuka di videonya, dipakai sebagai judul pemutar untuk pembaca layar.
  video: [
    { url: 'https://www.instagram.com/reel/DeOxxT9i-5s/', judul: 'Bitcoin naik terus? Steven Anderson malah nunggu koreksi' },
    { url: 'https://www.instagram.com/reel/DePZSVMiqwF/', judul: 'Sebelum beli crypto, cek dulu proyeknya beneran menghasilkan uang atau tidak' },
  ],
  // Foto dipotong dari poster resmi (tools/olah-aset-kbi.py). Keterangan Steven dari slide 3/6
  // Lynk.id; bio Deryansha dari PIC (WA 19 Okt 2026).
  mentor: [
    { nama: 'Steven Anderson S.M. MSc.', peran: 'CEO of Crypto Class', foto: 'steven-anderson', bio: 'Membahas cara membangun strategi investasi menuju 2027 dengan melihat peluang di Crypto, Saham Amerika, dan Emas.' },
    { nama: 'Deryansha Azhary', peran: 'Founder & CEO Kasisolusi', foto: 'deryansha', bio: 'Deryansha Azhary, yang dikenal sebagai Deryansha, adalah pengusaha dan praktisi media, marketing, serta industri kreatif dengan pengalaman lebih dari 19 tahun. Sebagai Founder & CEO Kasisolusi, ia aktif berbagi wawasan seputar branding, marketing, dan pengembangan bisnis untuk membantu UMKM dan pelaku usaha membangun brand yang kuat serta mengembangkan bisnis melalui strategi digital.' },
  ],
  // Slide 5/6 Lynk.id (task 52).
  dapat: [
    'Insight dan perspektif Steven Anderson mengenai market menuju 2027',
    'Framework dalam membangun strategi portfolio',
    'Pemahaman mengenai Crypto, Saham Amerika, dan Emas',
    'Insight mengenai strategi menghadapi berbagai kondisi market',
    'Studi kasus dan contoh konkret',
    'Kesempatan mendapatkan insight langsung dari praktisi',
  ],
  // Slide 4/6 Lynk.id (task 53), urutan sesuai slide.
  topik: [
    { judul: 'Market Outlook 2027', isi: 'Memahami peluang dan risiko market menuju 2027.' },
    { judul: 'Crypto Strategy', isi: 'Bitcoin, Ethereum & peluang crypto yang perlu diperhatikan.' },
    { judul: 'US Stock Strategy', isi: 'Sektor dan peluang saham Amerika menuju 2027.' },
    { judul: 'Gold & Portfolio Strategy', isi: 'Peran emas dalam membangun portfolio yang lebih adaptif.' },
    { judul: 'Make Your Assets Work', isi: 'Strategi membuat aset yang idle menjadi lebih produktif.' },
    { judul: 'Hedging & Market Strategy', isi: 'Bagaimana menghadapi market bullish, sideways, maupun bearish.' },
  ],
  // Dokumen PIC bagian 3 (task 54).
  cocok: {
    intro: 'Kelas ini ditujukan bagi individu yang ingin menyusun strategi investasi lebih terarah untuk menghadapi berbagai kondisi pasar pada 2027.',
    items: [
      { judul: 'Investor pemula', isi: 'Ingin mulai memahami strategi investasi, mengenali risiko, dan mengetahui cara menyusun portofolio berdasarkan tujuan keuangan.' },
      { judul: 'Investor saham dan crypto', isi: 'Sudah berinvestasi, tetapi ingin memperdalam strategi menghadapi volatilitas, memahami kondisi pasar, dan mengevaluasi keputusan investasi.' },
      { judul: 'Profesional dan pelaku bisnis', isi: 'Ingin mengelola aset pribadi dengan lebih terstruktur serta memahami peran saham AS, emas, dan crypto dalam portofolio.' },
      { judul: 'Investor yang ingin melakukan diversifikasi', isi: 'Ingin mempelajari cara mempertimbangkan berbagai kelas aset dan strategi lindung nilai sesuai profil risiko.' },
    ],
    catatan: 'Kelas ini cocok bagi pemula maupun investor yang sudah berpengalaman dan ingin memperluas perspektif investasinya. Namun, peserta tetap perlu memahami bahwa investasi memiliki risiko dan tidak ada strategi yang menjamin keuntungan.',
  },
  // Dokumen PIC bagian 4 (task 54).
  prasyarat: [
    { judul: 'Pengetahuan investasi', isi: 'Tidak perlu menjadi investor berpengalaman. Ketertarikan mempelajari investasi sudah cukup sebagai titik awal.' },
    { judul: 'Pengetahuan keuangan dasar', isi: 'Dianjurkan memahami konsep sederhana seperti modal, keuntungan, kerugian, dan risiko.' },
    { judul: 'Perangkat untuk kelas online', isi: 'Laptop, tablet, atau smartphone dengan koneksi internet stabil.' },
    { judul: 'Persiapan untuk kelas offline', isi: 'Datang ke lokasi sesuai jadwal dan membawa perlengkapan pribadi yang diperlukan.' },
    { judul: 'Kesiapan belajar', isi: 'Bersedia mempelajari risiko, mengevaluasi strategi, dan tidak sekadar mencari rekomendasi aset untuk dibeli.' },
  ],
  prasyaratTanya: {
    judul: 'Apakah harus sudah punya saham atau crypto?',
    isi: 'Tidak harus. Kelas dapat diikuti peserta yang belum memiliki portofolio maupun investor aktif, tanpa syarat modal investasi minimum, karena kelas ini berfokus pada pembelajaran strategi.',
  },
  // Testimoni peserta (permintaan tim Kasisolusi lewat WA, 23 Nov 2026: "setiap kelas ada section
  // testimoni peserta"; bahan = folder Drive "TESTIMONIAL STEVEN ANDERSON"). Kutipan, nama, dan
  // pekerjaan disalin persis dari tangkapan layar kartu testimoni; yang dirapikan hanya satu tanda
  // kutip tanpa pasangan (Meiliana) dan satu spasi sebelum tanda kutip (Chandra). Urutan mengikuti
  // urutan tangkapan layar, testimoni WhatsApp tanpa nama dan foto di akhir. Foto dipotong dari
  // kartu yang sama (tools/olah-testimoni.py). Empat tangkapan layar angka profit di folder itu
  // tidak dipakai: bukan testimoni peserta.
  // Tiap kelas boleh punya `testimoni` sendiri; tanpa `items` section tidak dirender.
  testimoni: {
    intro: 'Cerita mereka yang pernah belajar langsung bersama Steven Anderson lewat sesi konsultasi dan webinar.',
    catatan: 'Testimoni di atas adalah pengalaman pribadi masing-masing peserta. Hasil investasi setiap orang berbeda dan tidak dijamin.',
    items: [
      {
        nama: 'Meiliana', peran: 'Business Owner', foto: 'meiliana',
        fotoAlt: 'Meiliana dalam sesi konsultasi online bersama Steven Anderson',
        kutipan: 'Sebelum konsultasi, saya punya beberapa aset tapi berantakan. Setelah ngobrol 1 on 1 bareng Steven dan Minjul, saya jadi tahu mana yang harus dipertahankan, mana yang terlalu berisiko, dan bagaimana menyusun strategi investasi yang lebih realistis. Thanks Coach, akhirnya saya bisa ngerasain punya mesin uang dan passive income dari aset investasi saya.',
      },
      {
        nama: 'Chandra', peran: 'Expatriate di Europe', foto: 'chandra',
        fotoAlt: 'Chandra dalam sesi online bersama Steven Anderson',
        kutipan: 'Experience Steven belasan tahun di Market itu Real, Financial Planningnya masuk akal. “Yang paling saya suka, sesi ini bukan cuma dikasih tahu beli apa. Steven dan minjul bantu saya memahami cara berpikir investor, cara mengatur risiko, dan bagaimana membuat keputusan tanpa panik saat market bergerak.” jadi rasanya more trusted dan nyaman.',
      },
      {
        nama: 'Fina', peran: 'Ibu Rumah Tangga', foto: 'fina',
        fotoAlt: 'Fina dalam sesi coaching online bersama Steven Anderson',
        kutipan: 'Buat Gue Yang IRT dan Masih NOL banget soal investasi penjelasan Steven dan Minjul sangat Eye Opener Banget. Mereka Pure Sharing dan selalu jawab semua pertanyaan gue bahkan overtime pun dijabanin. Alhamdulillah, Porto saya udah balik modal uang coaching dalam waktu 1 Minggu Sukses terus buat Ko Steven',
      },
      {
        nama: 'Bambang', peran: 'Developer Properti', foto: 'bambang',
        fotoAlt: 'Bambang berswafoto bersama Steven Anderson',
        kutipan: 'Ilmu Investasi Steven sangat bermanfaat untuk saya. Niatnya tulus berbagi dan beneran ngajar beda sama yang lain di satu grup besar disini Steven Coaching kita secara 1 on 1. Karena tersertifikasi profesional dan praktisi langsung, Info dari Steven Valid based on fact dan proven banget !',
      },
      {
        nama: 'Harjono', peran: 'Pegawai Negeri Swasta', foto: 'harjono',
        fotoAlt: 'Harjono dalam sesi konsultasi online bersama Steven Anderson',
        kutipan: 'Dulu sempet rugi miliaran di trading dan stres banget. Tapi setelah ketemu Coach Steven dan Jul, baru tau gimana cara manage keuangan yang benar. Ternyata investasi yang baik itu ga perlu muluk muluk cukup Growth diatas 30% per tahun aja udah cukup dan compounding is real ! Porto gw udah grow 10% sejak sesi Konsultasi Pertama Thanks Coach !',
      },
      {
        nama: 'Peserta webinar', peran: 'Dikirim lewat WhatsApp',
        kutipan: 'yg saya rasakan stelah ikut webminar Steven Anderson dan Minjul\nsaya merasa upgrade utk pengetahuan financial market dan juga alokasi porto dengan varian diversifikasi.\nsebelom nya sy heavy di IHSG, Gold, namun setelah ikut kelas itu tnyata d saat kita blm entry position, masi ada banyak pilihan parkir likuiditas kita di instrumen2 lain yg bisa memberi return lebih dari deposito.\nat the end, 1 kata, saya bersyukur bisa ktemu dengan webminar ini, membuat saya lebih upgrade skill utk prepare hari tua saya kedepan. dan yg jelas tetiba abis kelas ini, sy di tengah2 circle saya, mereka mengaggap saya tiba2 pintar 🤣🙏 bgitu juga d mata suami dan anak2\nhahahahha',
      },
    ],
  },
  // Dokumen PIC bagian 5.
  jadwal: {
    tanggal: 'Sabtu, 12 Desember 2026',
    jam: '09.00–17.00 WIB',
    durasi: 'Total durasi terjadwal 8 jam, termasuk kemungkinan jeda istirahat.',
    lokasi: 'Hotel Aloft Wahid Hasyim',
    alamat: 'Jl. K.H. Wahid Hasyim, Jakarta',
    online: 'Via Zoom Meeting, 09.00–17.00 WIB',
    // Dokumen menyebutnya "gambaran susunan kelas yang disarankan": tampil sebagai perkiraan.
    susunan: [
      ['09.00–09.30', 'Registrasi dan pembukaan'],
      ['09.30–11.00', 'Market Outlook 2027'],
      ['11.00–12.00', 'Crypto Strategy'],
      ['12.00–13.00', 'Istirahat dan makan siang'],
      ['13.00–14.00', 'US Stock Strategy'],
      ['14.00–15.00', 'Gold & Portfolio Strategy'],
      ['15.00–16.00', 'Hedging & Market Strategy'],
      ['16.00–17.00', 'Diskusi, tanya jawab, dan penutupan'],
    ],
  },
  // Dokumen PIC bagian 1-2 (task 56-57). Poin fasilitas diganti benefit dari tim KBI
  // (WA, dipasang 15 Nov 2026), persis seperti dikirim.
  paket: [
    {
      slug: 'offline', nama: 'Offline Pass', harga: 'Rp799.000',
      judul: 'Belajar langsung di lokasi acara',
      isi: 'Peserta mengikuti kelas secara tatap muka bersama Steven Anderson dan Deryansha, sehingga dapat belajar secara langsung, mengikuti pemaparan materi, serta berinteraksi selama sesi kelas.',
      ket: 'Hotel Aloft Wahid Hasyim, Jl. K.H. Wahid Hasyim, Jakarta',
      fasilitas: [
        'Kesempatan berinteraksi langsung dengan pembicara selama event dan setelah event',
        'Networking dengan sesama peserta',
        'Materi dan pembahasan studi kasus investasi',
        'E-Sertifikat',
        'Coffee break',
        'Lunch (makan siang)',
      ],
    },
    {
      slug: 'online', nama: 'Online Pass', harga: 'Rp499.000',
      judul: 'Belajar dari mana saja secara online',
      isi: 'Pilihan untuk peserta yang ingin mengikuti pembelajaran tanpa harus datang ke lokasi acara di Jakarta.',
      ket: 'Via Zoom Meeting',
      fasilitas: [
        'Materi dan pembahasan studi kasus investasi',
        'Belajar langsung dari pembicara secara virtual',
        'Mengikuti pembelajaran dari mana saja',
        'Bisa mengikuti sesi tanya jawab',
        'E-Sertifikat',
      ],
    },
  ],
  // Dokumen PIC bagian 6 (task 58). Jawaban dari PIC; hanya salah ketik yang dirapikan.
  faq: [
    { t: 'Bagaimana cara mendaftar kelas ini?', j: 'Pilih jenis tiket Offline Pass atau Online Pass melalui tautan pendaftaran yang sesuai. Isi data peserta, ikuti instruksi pembayaran, lalu simpan bukti transaksi dan konfirmasi pendaftaran yang diterima.' },
    { t: 'Berapa harga tiket kelas?', j: 'Offline Pass Rp799.000 dan Online Pass Rp499.000.' },
    { t: 'Bagaimana cara melakukan pembayaran?', j: 'Lakukan pembayaran melalui metode yang tersedia pada halaman pendaftaran resmi. Pastikan nominal dan tujuan pembayaran sesuai instruksi. Simpan bukti transfer apabila diperlukan untuk verifikasi.' },
    { t: 'Apakah tiket bisa di-refund?', j: 'Bisa, diproses melalui admin.' },
    { t: 'Apakah tiket bisa di-reschedule atau dialihkan ke orang lain?', j: 'Bisa di-reschedule atau pindah ke event yang lain.' },
    { t: 'Apakah kelas menyediakan rekaman?', j: 'Ya, kami akan menyediakan rekaman dari hasil video event tersebut.' },
    { t: 'Bagaimana peserta online mendapatkan akses kelas?', j: 'Setelah pendaftaran dan pembayaran terverifikasi, akan ada link grup WhatsApp di catatan.' },
    { t: 'Apakah pemula boleh mengikuti kelas?', j: 'Kelas bisa diikuti oleh siapa saja.' },
    { t: 'Apakah kelas menjamin keuntungan investasi?', j: 'Tidak. Kelas ini bersifat edukasi untuk membantu peserta memahami strategi dan risiko. Hasil investasi bergantung pada kondisi pasar, keputusan masing-masing peserta, dan faktor lain yang tidak dapat dipastikan.' },
  ],
  // Tautan checkout per paket dari PIC (WA 4 Nov 2026, dipasang persis seperti dikirim):
  // Offline Pass Rp799.000, Online Pass Rp499.000, keduanya di toko Lynk.id KBI.
  // Token berisi stempel waktu 4 Nov; halaman checkout juga terbuka tanpa `token` (dicek 5 Nov).
  // `umum` = halaman Lynk.id KBI di poster, cadangan bila salah satu paket dikosongkan.
  checkout: {
    offline: 'https://lynk.id/kasisolusibusinessinstitute/2kvz59ez8y7w/checkout?type=detail&token=.eJyrVipILErMLVayUoqOVdJRKslMzk4tgXOTMlPiC4oyk1OBAgZAfmFJJZCfn6JkZaijVJxaXJwJZCqB9OWXJObAlcIFSvMySyD80pLceLhV1bVKtQA9XSbt.aurZxw.twEhRt-heum59nAbDv5TOBG-g3g',
    online: 'https://lynk.id/kasisolusibusinessinstitute/3kv61k2r7ynw/checkout?type=detail&token=.eJyrVipILErMLVayUoqOVdJRKslMzk4tgXOTMlPiC4oyk1OBAgZAfmFJJZCfn6JkZaijVJxaXJwJZCqB9OWXJObAlcIFSvMySyD80pLceLhV1bVKtQA9XSbt.aurZow.3iCkiLyISPI0XGskImPXKzuDIRk',
    umum: 'https://lynk.id/kasisolusibusinessinstitute',
  },
  kontak: ['+62 817 7774 43', '+62 851 7688 1518'],
};
