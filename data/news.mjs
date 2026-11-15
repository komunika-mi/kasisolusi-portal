// Berita tulisan tangan Kasisolusi (opsional). Digabung urut waktu dengan berita otomatis di
// data/berita/*.json (lihat README, bagian "Berita otomatis").
//
// 12 berita contoh (25 Okt 2026: 6 dari unggahan Instagram @kasisolusi, 6 dari media nasional
// dan laman resmi lembaga, dengan foto dari sumbernya) DIHAPUS 15 Nov 2026 saat otomasi mulai,
// sesuai keputusan pengguna. Salinannya hanya ada di laptop pengembang (_arsip/, tidak di-commit)
// karena foto-fotonya milik media sumber dan repo ini publik.
//
// Aturan isi bila menambah berita di sini: fakta HANYA dari sumber yang dicantumkan. Angka,
// nama, dan klaim yang tidak ada di sumber tidak boleh ditambahkan; klaim narasumber ditulis
// sebagai pengakuan ("mengaku", "menurut"). Sampul: tools/olah-sampul-berita.py.
//
// Bentuk: slug, title, dek, kanal (lihat data/site.mjs), date (tanggal sumber), img, imgAlt,
// foto (kredit foto; bila kosong dipakai label sumber pertama), takeaways,
// body ({type: 'p'|'h2'|'quote', text}), sumber [{label, url}], video {id, title} opsional
// (episode YouTube yang dibahas), cta {label, href} opsional.
export const DIPERIKSA = '2026-10-25';

export const news = [];
