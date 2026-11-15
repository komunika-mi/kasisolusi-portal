// Fakta situs. Semua isi di file ini diambil dari home.kasisolusi.co.id
// (homepage, /welcome, /kasisolusibusinessclub, /content-creator-kasisolusi,
// /bukunyaumkm-muslimpreneur) dan sitemap Yoast-nya.

// Halaman Wellness (landing D.V.N) DISEMBUNYIKAN sementara atas permintaan pengguna
// (25 Okt 2026): menu hilang, dist/wellness.html tidak dibuat, dan vercel.json mengalihkan
// /wellness ke beranda (307). Untuk menayangkan lagi: ubah ke true DAN hapus redirect
// /wellness di vercel.json. Kode halamannya tetap di src/wellness.mjs.
export const WELLNESS_TAYANG = false;

export const site = {
  name: 'Kasisolusi',
  legalName: 'PT Kasisolusi Usaha Indonesia',
  // Canonical dan og:url wajib absolut. Di Vercel, domain produksi diambil
  // otomatis supaya tidak perlu diisi tangan setiap kali deploy.
  origin:
    process.env.SITE_ORIGIN ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`) ||
    (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`) ||
    'https://kasisolusi-portal.vercel.app',
  themeColor: '#0A1530',
  twitter: '',
  tagline: 'Kita kasi solusi buat kamu yang mau bisnisnya jalan, ownernya bisa jalan jalan.',
  headline: 'Bantuin UMKM naik kelas dengan belajar lewat podcast',
  // Copy beranda mengikuti mockup yang disetujui (Sep 2026).
  slogan: 'Obrolan. Solusi. Aksi Nyata.',
  signoff: 'Lebih Baik Setiap Hari.',
  hero: {
    eyebrow: 'Media Ekosistem Kasisolusi',
    title: 'Insight, Program, dan Solusi untuk',
    highlight: 'Hidup yang Lebih Baik.',
    body: 'Kasisolusi adalah media yang membahas solusi nyata untuk kehidupan modern, lewat percakapan, pendidikan, dan program yang mendukung kamu tumbuh secara mental, finansial, dan fisik.',
  },
  description:
    'Portal berita dan podcast bisnis Kasisolusi. Liputan, rangkuman episode, dan ilmu praktis untuk UMKM Indonesia. Tayang tiap hari pukul 20.00 WIB.',
  defaultImage: '/assets/og-default.png',
  schedule: 'Tayang tiap hari pukul 20.00 WIB',
  about: [
    'Kasisolusi adalah milik PT Kasisolusi Usaha Indonesia, perusahaan media digital dengan misi memperkuat perekonomian Indonesia dengan mengedukasi UMKM lewat podcast.',
    'Kasisolusi mengundang narasumber dari berbagai latar belakang seperti para founder atau pemilik bisnis, wirausaha, dan C-level terkemuka. Di podcast Kasisolusi, mereka berbagi pembahasan penuh daging untuk pertumbuhan bisnis kamu.',
    'Kasisolusi menjadi salah satu kanal media digital dengan pertumbuhan tercepat di YouTube.',
  ],
  // Diperiksa 15 Sep 2026. Spotify show & TikTok dari linktree resmi
  // home.kasisolusi.co.id/welcome; Instagram @kasisolusi dan LinkedIn dari indeks Google.
  social: [
    { name: 'Instagram', handle: '@kasisolusi', url: 'https://www.instagram.com/kasisolusi/', icon: 'instagram' },
    { name: 'YouTube', handle: '@kasisolusi', url: 'https://www.youtube.com/@kasisolusi', icon: 'youtube' },
    { name: 'TikTok', handle: '@kasisolusi', url: 'https://www.tiktok.com/@kasisolusi', icon: 'tiktok' },
    { name: 'Spotify', handle: 'kasisolusi', url: 'https://open.spotify.com/show/14heho55ucj7OoBveGGiTy', icon: 'spotify' },
    { name: 'LinkedIn', handle: 'Kasisolusi', url: 'https://www.linkedin.com/company/kasisolusi/', icon: 'linkedin' },
  ],
  nav: [
    { label: 'Beranda', path: '/' },
    { label: 'Podcast', path: '/podcast' },
    { label: 'News', path: '/berita' },
    { label: 'KBI', path: '/kelas' },
    { label: 'Wellness', path: '/wellness' },
    { label: 'Tentang Kami', path: '/tentang' },
  ].filter((n) => n.path !== '/wellness' || WELLNESS_TAYANG),
};

export const socialBy = (icon) => site.social.find((s) => s.icon === icon);

// Empat pilar topik, persis seperti di situs lama.
export const pillars = [
  {
    slug: 'bisnis-dunia-kerja',
    name: 'Bisnis & Dunia Kerja',
    short: 'Bisnis',
    blurb: 'Cara membangun, merapikan, dan menjalankan usaha sehari-hari.',
    accent: '#3D84F0',
  },
  {
    slug: 'revenue-keuangan',
    name: 'Revenue Stream, Cuan & Keuangan',
    short: 'Keuangan',
    blurb: 'Arus kas, margin, harga, dan cara usaha kecil tetap sehat.',
    accent: '#22C55E',
  },
  {
    slug: 'branding-marketing',
    name: 'Strategi Branding & Marketing',
    short: 'Marketing',
    blurb: 'Membangun merek dan mencari pembeli tanpa bakar uang.',
    accent: '#F59E0B',
  },
  {
    slug: 'industri-kreatif',
    name: 'Industri Kreatif & Pengembangannya',
    short: 'Kreatif',
    blurb: 'Konten, desain, dan produksi sebagai mesin pertumbuhan.',
    accent: '#A855F7',
  },
];

export const programs = [
  {
    slug: 'kasisolusi-podcast',
    name: 'Kasisolusi Podcast',
    tagline: 'Obrolan panjang dengan pemilik bisnis dan praktisi.',
    description:
      'Program utama Kasisolusi. Narasumber dikurasi ketat, dipandu host yang sudah berpengalaman di dunia bisnis dan karir. Tayang tiap hari pukul 20.00 WIB di YouTube dan Spotify.',
  },
  {
    slug: 'coach-kasisolusi',
    name: 'Coach Kasisolusi',
    tagline: 'Kelas dan workshop yang dipandu coach.',
    description:
      'Sesi pendampingan dan workshop untuk pemilik usaha. Materinya masuk ke keuangan, branding, marketing, SDM, operasional, sampai inovasi produk.',
  },
  {
    slug: 'talkjil',
    name: 'Talkjil',
    tagline: 'Obrolan ringan menjelang malam.',
    description:
      'Format percakapan yang lebih santai. Tetap membahas bisnis, tetapi dengan tempo yang lebih longgar dan sudut pandang sehari-hari.',
  },
  {
    slug: 'kasimonolog',
    name: 'Kasimonolog',
    tagline: 'Satu ide, dibedah sampai tuntas.',
    description:
      'Format monolog. Satu topik dibahas langsung tanpa tamu, cocok untuk ditonton saat perjalanan atau sebelum tidur.',
  },
];

export const reasons = [
  {
    title: 'Ilmunya membumi',
    body: 'Bukan cuma teori. Yang dibahas bisa langsung dicoba di usaha yang sedang kamu jalankan.',
  },
  {
    title: 'Belajar dari struggle-nya',
    body: 'Kamu bisa belajar dari kesulitan para pebisnis dan melihat cara mereka memecahkan masalah.',
  },
  {
    title: 'Sesuai syariat Islam',
    body: 'Membantu kamu menjalankan bisnis dengan cara yang sesuai syariat Islam.',
  },
  {
    title: 'Narasumber dikurasi',
    body: 'Narasumber dipilih ketat, dipandu host yang sudah berpengalaman di dunia bisnis dan karir.',
  },
  {
    title: 'Untuk ekonomi Indonesia',
    body: 'Punya impian besar menumbuhkan perekonomian Indonesia dengan mengedukasi UMKM agar bisa naik kelas.',
  },
];
