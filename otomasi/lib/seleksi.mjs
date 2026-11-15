// Penyaring kandidat: relevansi UMKM, topik yang dihindari, dan kemiripan judul (anti-duplikat).
import { satuBaris } from './alat.mjs';

// Kata kunci UMKM. KUAT = jelas soal usaha kecil; SEDANG = sering muncul di berita UMKM tetapi
// juga di berita lain (ekspor emas, merek mobil), jadi hanya menambah bobot.
const KUAT = [
  /\bumkm\b/, /\bukm\b/, /\bumk\b/, /\busaha mikro\b/, /\busaha kecil\b/, /\busaha menengah\b/, /\bultra ?mikro\b/,
  /\bkur\b/, /\bkredit usaha( rakyat)?\b/, /\bkoperasi\b/, /\bikm\b/, /\bindustri kecil\b/, /\bpelaku usaha\b/,
  /\bwirausaha\w*\b/, /\bpengusaha (kecil|mikro|muda|lokal)\b/, /\bpnm\b/, /\bmekaar\b/, /\bulamm\b/, /\bqris\b/,
  /\bsertifika(t|si) halal\b/, /\bhalal gratis\b/, /\bsehati\b/, /\bp-?irt\b/, /\bnib\b/, /\bnomor induk berusaha\b/,
  /\bpajak umkm\b/, /\bpph final\b/, /\bpedagang\b/, /\bwarung\b/, /\btoko kelontong\b/, /\bpasar rakyat\b/,
  /\bpkl\b/, /\bwaralaba\b/, /\bfranchise\b/, /\bekonomi kreatif\b/, /\bpelaku ekraf\b/, /\bsmesco\b/,
  /\bpendaftaran merek\b/, /\bhak merek\b/, /\bmerek dagang\b/, /\bkekayaan intelektual\b/, /\bproduk lokal\b/,
  /\bbrand lokal\b/, /\bpenjual (online|daring)\b/, /\bseller\b/, /\baffiliat(e|or)\b/, /\bsapa umkm\b/,
  /\bpembiayaan (mikro|usaha|ultra)\b/, /\bmodal usaha\b/, /\bkemenkop\b/, /\bkementerian umkm\b/, /\bmenteri umkm\b/,
];
const SEDANG = [
  /\bekspor\b/, /\bpembiayaan\b/, /\bmerek\b/, /\bpajak\b/, /\bkredit\b/, /\bhalal\b/, /\be-?commerce\b/,
  /\bmarketplace\b/, /\bdigitalisasi\b/, /\bpelatihan\b/, /\bpendampingan\b/, /\binkubasi\b/, /\bbantuan\b/,
  /\bproduk dalam negeri\b/, /\bpasar\b/, /\bbazar\b/, /\bpameran\b/, /\bkurasi\b/, /\bomzet\b/, /\bmodal\b/,
  /\bkemasan\b/, /\bizin edar\b/, /\bsertifikasi\b/, /\bkonsumen\b/, /\bpedesaan\b|\bdesa\b/, /\bperempuan prasejahtera\b/,
];

// Topik yang dihindari untuk berita otomatis tanpa redaksi: kriminal, kekerasan, kematian,
// asusila, judi, perkara hukum, dan politik praktis. Bencana hanya boleh bila beritanya
// tentang pemulihan usaha (lihat BENCANA di bawah).
const HINDARI = /\b(narkoba|narkotika|sabu|ganja|pembunuhan|dibunuh|membunuh|tewas|meninggal dunia|jenazah|korban jiwa|kecelakaan|tabrakan|pemerkosaan|perkosa|pelecehan|cabul|asusila|begal|perampokan|perampok|pencurian|penganiayaan|teroris|terorisme|judi|judol|ditangkap|diamankan polisi|dibekuk|diringkus|tersangka|terdakwa|divonis|vonis|korupsi|suap|gratifikasi|ott|kpk|pemilu|pilkada|kampanye|partai politik|unjuk rasa|kerusuhan|tawuran|bunuh diri|penipuan|penggelapan|ilegal)\b/i;
const BENCANA = /\b(bencana|banjir|gempa|longsor|tsunami|erupsi|kebakaran|kekeringan|puting beliung)\b/i;
const PEMULIHAN = /\b(pemulihan|pulihkan|pulih|pascabencana|pasca-bencana|bantuan|rehabilitasi|bangkit)\b/i;

// Untuk tips dari episode: hindari nasihat investasi dan medis (berisiko tanpa redaksi manusia).
const HINDARI_TIPS = /\b(saham|ihsg|kripto|crypto|bitcoin|forex|trading|trader|reksa ?dana|obligasi|emiten|investasi emas|buyback|porto(folio)?|dokter|dr\.|penyakit|kanker|kemoterapi|obat|jerawat|kulit|gigi|diet|operasi|terapi|vaksin|ustadz|ustaz|habib|mistis|santet|politik|pejabat|mafia|korupsi|tersangka)\b/i;
const TOPIK_TIPS = /\b(bisnis|usaha|umkm|jualan|menjual|penjualan|omzet|cuan|untung|laba|affiliat\w*|marketing|pemasaran|branding|brand|konten|kreator|pelanggan|customer|karyawan|tim|sales|modal|keuangan|uang|gaji|utang|cicilan|franchise|waralaba|toko|produk|ekspor|digital|ai|pengusaha|wirausaha|founder|startup|kerja|karier|karir|negosiasi|harga|promo|leadership|pemimpin|manajemen|strategi)\b/i;

export function skorRelevansi(teks) {
  const t = String(teks || '').toLowerCase();
  let kuat = 0;
  let sedang = 0;
  for (const re of KUAT) if (re.test(t)) kuat++;
  for (const re of SEDANG) if (re.test(t)) sedang++;
  return kuat * 3 + sedang;
}

/** '' bila boleh, atau alasan penolakan topik. */
export function topikDihindari(teks) {
  const t = String(teks || '');
  const m = t.match(HINDARI);
  if (m) return `topik dihindari (${m[0].toLowerCase()})`;
  if (BENCANA.test(t) && !PEMULIHAN.test(t)) return 'berita bencana tanpa sudut pemulihan usaha';
  return '';
}

export function topikTipsDihindari(teks) {
  const m = String(teks || '').match(HINDARI_TIPS);
  if (m) return `topik tips dihindari (${m[0].toLowerCase()})`;
  if (!TOPIK_TIPS.test(teks)) return 'bukan topik bisnis/karier';
  return '';
}

// ------------------------------------------------------------------ kemiripan

const BUANG = new Set(`yang dan di ke dari untuk dengan ini itu pada dalam akan juga bagi oleh atau para lebih telah sudah masih karena agar supaya serta hingga sampai tak tidak bisa dapat jadi menjadi ada kini baru begini caranya cara apa siapa bagaimana kenapa mengapa soal terkait rp persen pun lagi saja hanya kata simak berikut ternyata makin semakin jangan harus wajib mulai tahun hari bulan the and of for to in on is are be by with`.split(/\s+/));

export function token(s) {
  return new Set(
    satuBaris(s)
      .toLowerCase()
      .normalize('NFKD').replace(/[̀-ͯ]/g, '')
      .replace(/(\d)[.,](\d)/g, '$1$2')
      .split(/[^a-z0-9]+/)
      .filter((w) => w && !BUANG.has(w) && (w.length >= 3 || /\d/.test(w))),
  );
}

export function kemiripan(a, b) {
  const A = a instanceof Set ? a : token(a);
  const B = b instanceof Set ? b : token(b);
  if (!A.size || !B.size) return { jaccard: 0, tumpang: 0, sama: 0 };
  let sama = 0;
  for (const x of A) if (B.has(x)) sama++;
  return { jaccard: sama / (A.size + B.size - sama), tumpang: sama / Math.min(A.size, B.size), sama };
}

/** Dua judul dianggap membahas hal yang sama. Ambang dipilih longgar ke arah "lewati". */
export function judulKembar(a, b) {
  const k = kemiripan(a, b);
  return k.jaccard >= 0.5 || (k.tumpang >= 0.75 && k.sama >= 3);
}

/** Cari judul kembar di daftar. Mengembalikan judul yang cocok atau ''. */
export function adaKembar(judul, daftar) {
  const A = token(judul);
  for (const j of daftar) if (judulKembar(A, token(j))) return j;
  return '';
}
