// Pipeline berita dan tips otomatis Kasisolusi. Penjelasan lengkap: README, bagian "Berita otomatis".
//
//   node otomasi/jalan.mjs            TERBIT. Hanya jalan bila OTOMASI_BERITA=aktif dan OPENROUTER_API_KEY ada.
//   node otomasi/jalan.mjs --kering   UJI KERING. Tidak menyentuh data/ dan public/; hasilnya ke --keluaran.
//                                     Tanpa OPENROUTER_API_KEY otomatis memakai penulis dan gambar tiruan.
//   node otomasi/jalan.mjs --cek      Cek cepat kuota dan jam, tanpa dependensi npm (dipakai workflow).
//   node otomasi/jalan.mjs --kabari   Kirim ringkasan putaran ke Telegram (bila secrets ada).
//
// Opsi: --paksa (abaikan jendela jam dan laju per jam; batas harian dan per putaran tetap),
//       --tiruan (paksa penulis dan gambar tiruan; hanya untuk --kering),
//       --pollinations (bersama --tiruan: gambar sungguhan dari Pollinations, gratis),
//       --keluaran <folder>, --ringkasan <berkas>.
//
// Urutan satu putaran: kuota dan laju -> kumpulkan kandidat -> buang duplikat -> ambil teks sumber
// -> tulis lewat OpenRouter -> penjaga (ulang sekali bila gagal) -> ilustrasi -> tulis JSON + WebP
// -> perbarui _status.json -> ringkasan (dikirim ke Telegram oleh langkah workflow sesudah push).
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  ROOT, DIR_BERITA, DIR_GAMBAR, DIR_PUBLIC, PER_PUTARAN, COBA_TULIS_MAKS, GAMBAR_MAKS_PER_PUTARAN,
  BATAS_WAKTU_MS, HARI_SIMPAN, BAHAN_MIN, UMUR_MAKS_JAM, KUOTA, SUMBER_MEDIA,
} from './lib/konfigurasi.mjs';
import { log, wib, slugify, umurJam, kunciUrl, tanggalPanjang, ringkas } from './lib/alat.mjs';
import {
  bacaStatus, simpanStatus, pangkas, hitungan, catatTerbit, catatBiaya, catatKunci, bolehDiproses, jatahPutaran,
} from './lib/status.mjs';
import { bacaBeritaOtomatis, periksaBentuk, jalurGambar, waktuTerbit } from '../src/berita-otomatis.mjs';

const argv = process.argv.slice(2);
const ada = (f) => argv.includes(f);
const nilai = (f) => {
  const i = argv.indexOf(f);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : undefined;
};
const KERING = ada('--kering');
const PAKSA = ada('--paksa') || process.env.PAKSA === '1';
const BERKAS_RINGKASAN = nilai('--ringkasan') || process.env.RINGKASAN || join(ROOT, '.scratch', 'ringkasan-berita.json');
const DIR_CACHE = join(ROOT, '.scratch', 'cache-berita');
const impor = (rel) => import(pathToFileURL(join(ROOT, rel)).href);

// ------------------------------------------------------------------ data situs

/** Artikel yang sudah ada: slug, kunci sumber, judul 14 hari terakhir, hitungan hari ini. */
async function muatSitus(tanggal) {
  const { berita, galat } = bacaBeritaOtomatis(DIR_BERITA, { publicDir: DIR_PUBLIC });
  if (galat.length) throw new Error(`data/berita berisi berkas cacat, perbaiki dulu:\n  ${galat.join('\n  ')}`);
  const { news } = await impor('data/news.mjs');
  const { articles } = await impor('data/articles.mjs');
  const { episodes } = await impor('data/episodes.mjs');
  const slug = new Set([...news, ...articles, ...berita].map((a) => a.slug));
  if (existsSync(DIR_GAMBAR)) for (const f of readdirSync(DIR_GAMBAR)) slug.add(f.replace(/\.webp$/, ''));
  const kunci = new Set([
    ...berita.map((b) => b.kunci),
    ...news.flatMap((n) => (n.sumber || []).map((s) => kunciUrl(s.url))),
    ...[...news, ...berita].filter((n) => n.video?.id).map((n) => `yt:${n.video.id}`),
  ]);
  const batas = Date.now() - HARI_SIMPAN * 86400e3;
  const judulTerbaru = [...berita, ...news]
    .filter((a) => waktuTerbit(a) >= batas)
    .sort((a, b) => waktuTerbit(b) - waktuTerbit(a))
    .map((a) => a.title);
  const hariIni = { berita: 0, tips: 0 };
  for (const b of berita) if (b.date === tanggal) hariIni[b.jenis]++;
  return { slug, kunci, judulTerbaru, hariIni, episodes };
}

function terbitHariIni(st, situs, tanggal) {
  const h = hitungan(st, tanggal);
  // Angka terbesar dipakai: berkas yang dihapus tangan (ditarik) tidak membuka slot baru,
  // dan catatan yang hilang tidak membuat kuota terlampaui.
  return { berita: Math.max(h.berita || 0, situs.hariIni.berita), tips: Math.max(h.tips || 0, situs.hariIni.tips) };
}

// ------------------------------------------------------------------ cache "sudah dilihat"

// Kandidat yang sudah diperiksa dan ditolak SEBELUM ditulis (terlalu lama, bukan topik UMKM,
// robots.txt). Disimpan 3 hari di .scratch/cache-berita (di runner lewat actions/cache), bukan
// di _status.json, supaya putaran tanpa artikel baru tidak menghasilkan commit dan deploy.
function bacaCache() {
  try {
    const c = JSON.parse(readFileSync(join(DIR_CACHE, 'dilihat.json'), 'utf8'));
    for (const [k, v] of Object.entries(c)) if (umurJam(v.t) > 72) delete c[k];
    return c;
  } catch {
    return {};
  }
}
function simpanCache(c) {
  mkdirSync(DIR_CACHE, { recursive: true });
  writeFileSync(join(DIR_CACHE, 'dilihat.json'), `${JSON.stringify(c)}\n`, 'utf8');
}

// ------------------------------------------------------------------ mode --cek

async function cek() {
  const w = wib();
  const st = pangkas(bacaStatus(), w.tanggal);
  const { berita, galat } = bacaBeritaOtomatis(DIR_BERITA);
  if (galat.length) throw new Error(`data/berita cacat: ${galat[0]}`);
  const hariIni = { berita: 0, tips: 0 };
  for (const b of berita) if (b.date === w.tanggal) hariIni[b.jenis]++;
  const h = hitungan(st, w.tanggal);
  const sudah = { berita: Math.max(h.berita || 0, hariIni.berita), tips: Math.max(h.tips || 0, hariIni.tips) };
  let lanjut;
  let alasan;
  if (KERING) {
    lanjut = true;
    alasan = 'uji kering';
  } else if (process.env.OTOMASI_BERITA !== 'aktif') {
    lanjut = false;
    alasan = 'OTOMASI_BERITA bukan "aktif"';
  } else {
    const j = jatahPutaran({ terbit: sudah, jam: w.jam, paksa: PAKSA });
    lanjut = j.berita > 0 || j.tips > 0;
    alasan = lanjut ? `jatah putaran ${j.berita} berita, ${j.tips} tips` : j.alasan.join('; ');
  }
  log(`${w.iso} | hari ini ${sudah.berita}/${KUOTA.berita} berita, ${sudah.tips}/${KUOTA.tips} tips | ${lanjut ? 'LANJUT' : 'BERHENTI'}: ${alasan}`);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `lanjut=${lanjut ? 'ya' : 'tidak'}\n`);
}

// ------------------------------------------------------------------ mode --kabari

async function kabari() {
  const { susunPesan, kirimTelegram } = await import('./lib/telegram.mjs');
  const { site } = await impor('data/site.mjs');
  let r = null;
  try {
    r = JSON.parse(readFileSync(BERKAS_RINGKASAN, 'utf8'));
  } catch { /* putaran bisa gagal sebelum ringkasan ditulis */ }
  const pesan = susunPesan(r, { hasilPush: process.env.HASIL_PUSH || '', hasilJob: process.env.HASIL_JOB || '', origin: site.origin });
  await kirimTelegram(pesan);
}

// ------------------------------------------------------------------ putaran utama

async function jalankan() {
  const t0 = Date.now();
  const habisWaktu = () => Date.now() - t0 > BATAS_WAKTU_MS;
  const w = wib();
  const kunciOR = (process.env.OPENROUTER_API_KEY || '').trim();
  const kunciOA = (process.env.OPENAI_API_KEY || '').trim();
  const R = {
    versi: 1, mode: KERING ? 'kering' : 'terbit', waktu: w.iso, waktuTeks: `${tanggalPanjang(w.tanggal)} ${String(w.jam).padStart(2, '0')}.${String(w.menit).padStart(2, '0')} WIB`,
    jatah: null, terbitHariIni: null, terbit: [], dilewati: [], diperiksa: [], sumber: [], biayaUsd: 0, gambar: 0, galat: [], statusBerubah: false,
  };
  const selesai = (kode = 0) => {
    R.durasiDetik = Math.round((Date.now() - t0) / 1000);
    mkdirSync(dirname(BERKAS_RINGKASAN), { recursive: true });
    writeFileSync(BERKAS_RINGKASAN, `${JSON.stringify(R, null, 1)}\n`, 'utf8');
    return kode;
  };

  if (!KERING) {
    if (process.env.OTOMASI_BERITA !== 'aktif') {
      log('OTOMASI_BERITA bukan "aktif": tidak ada yang diterbitkan.');
      return selesai(0);
    }
    if (ada('--tiruan')) throw new Error('--tiruan hanya boleh bersama --kering');
    if (!kunciOR) throw new Error('OPENROUTER_API_KEY belum diisi; mode terbit tidak jalan tanpa penulis sungguhan');
  }
  const tiruan = ada('--tiruan') || (KERING && !kunciOR);
  // Pollinations mati bawaan (watermark "pollinations.ai" dan 402 di jalur tanpa kunci, lihat gambar.mjs).
  const pakaiPollinations = ada('--pollinations') || process.env.GAMBAR_POLLINATIONS === 'ya';
  if (!KERING && !kunciOA && !pakaiPollinations) {
    throw new Error('OPENAI_API_KEY belum diisi dan Pollinations mati; tidak ada penyedia ilustrasi untuk mode terbit');
  }
  const stempel = w.iso.slice(0, 16).replace(/[:T]/g, '');
  const keluaran = KERING ? (nilai('--keluaran') || join(ROOT, '.scratch', 'kering', stempel)) : null;

  const st = pangkas(bacaStatus(), w.tanggal);
  const statusAwal = JSON.stringify(st);
  const situs = await muatSitus(w.tanggal);
  const sudah = terbitHariIni(st, situs, w.tanggal);
  const jatah = KERING ? { berita: PER_PUTARAN.berita, tips: PER_PUTARAN.tips, alasan: ['uji kering: jendela jam dan kuota harian diabaikan'] } : jatahPutaran({ terbit: sudah, jam: w.jam, paksa: PAKSA });
  R.jatah = jatah;
  R.terbitHariIni = { ...sudah };
  log(`${R.waktuTeks} | mode ${R.mode}${tiruan ? ' (penulis dan gambar tiruan)' : ''} | hari ini ${sudah.berita}/${KUOTA.berita} berita, ${sudah.tips}/${KUOTA.tips} tips | jatah ${jatah.berita} berita, ${jatah.tips} tips`);
  if (!jatah.berita && !jatah.tips) {
    log(`Selesai tanpa kerja: ${jatah.alasan.join('; ')}`);
    return selesai(0);
  }

  // Modul berat dimuat sesudah tahu ada pekerjaan (mode --cek tidak butuh npm ci).
  const [{ kumpulkanLembaga, ambilIsi }, { kumpulkanMedia, radarUmkm }, { kumpulkanTips, episodeDariWatch }, sel, jaga, tulisMod, gbr, fotoRilis] = await Promise.all([
    import('./lib/sumber-lembaga.mjs'), import('./lib/sumber-media.mjs'), import('./lib/sumber-youtube.mjs'),
    import('./lib/seleksi.mjs'), import('./lib/penjaga.mjs'), import('./lib/penulis.mjs'), import('./lib/gambar.mjs'),
    import('./lib/foto-rilis.mjs'),
  ]);
  const penulis = tiruan ? tulisMod.buatPenulisTiruan() : tulisMod.buatPenulisAsli(kunciOR);
  // Uji kering tanpa kunci OpenAI dan tanpa Pollinations tetap menghasilkan sampul (gradasi tiruan).
  const gambarTiruan = (tiruan && !pakaiPollinations) || (KERING && !kunciOA && !pakaiPollinations);
  const pembuatGambar = gbr.buatPembuatGambar({
    kunciOpenAI: tiruan ? '' : kunciOA, tiruan: gambarTiruan, pollinations: pakaiPollinations, riwayat: st.gambar, maks: GAMBAR_MAKS_PER_PUTARAN,
  });
  const cache = bacaCache();

  // --- kumpulkan
  const episodeLokal = new Map(situs.episodes.map((e) => [e.id, e]));
  const [lembaga, media, radar, tips] = await Promise.all([
    jatah.berita ? kumpulkanLembaga() : { kandidat: [], laporan: [] },
    // Sumber media dimatikan (keputusan pemilik 23 Nov 2026, lihat konfigurasi.SUMBER_MEDIA).
    jatah.berita && SUMBER_MEDIA ? kumpulkanMedia() : { kandidat: [], laporan: [] },
    jatah.berita ? radarUmkm() : { judul: [], laporan: [] },
    jatah.tips ? kumpulkanTips({ episodeLokal }) : { kandidat: [], laporan: [], ditolak: [], sudah: new Set() },
  ]);
  R.sumber = [...lembaga.laporan, ...media.laporan, ...radar.laporan, ...tips.laporan];
  log(`Kandidat: ${lembaga.kandidat.length} lembaga, ${media.kandidat.length} media, ${tips.kandidat.length} tips (radar umkm.go.id ${radar.judul.length} judul)`);

  const judulTerbaru = [...situs.judulTerbaru];
  const judulDiproses = Object.values(st.kunci).map((v) => v.judul).filter(Boolean);
  const periksa = (k, alasan, permanen = false) => {
    R.diperiksa.push({ jenis: k.jenis, sumber: k.sumberId, judul: k.judul, url: k.url, alasan });
    if (permanen) cache[k.kunci] = { t: w.iso, alasan };
  };
  const sudahAda = (k) => {
    if (situs.kunci.has(k.kunci)) return 'sudah ada di situs';
    if (!bolehDiproses(st, k.kunci)) return `sudah diproses (${st.kunci[k.kunci].hasil})`;
    if (cache[k.kunci]) return `sudah diperiksa: ${cache[k.kunci].alasan}`;
    return '';
  };

  let galatFatal = '';
  const coba = { berita: 0, tips: 0 };
  const hasilTerbit = { berita: 0, tips: 0 };
  // Hasil ambil isi per URL, supaya uji per sumber di mode kering tidak mengambil halaman dua kali.
  const memoIsi = new Map();
  const ambilIsiSekali = async (k) => {
    if (!memoIsi.has(k.url)) {
      const hasil = await ambilIsi(k);
      memoIsi.set(k.url, { hasil, data: { isi: k.isi, terbit: k.terbit, judul: k.judul, fotoUrl: k.fotoUrl } });
      return hasil;
    }
    const m = memoIsi.get(k.url);
    Object.assign(k, m.data);
    return m.hasil;
  };

  /** Tulis, perbaiki otomatis, periksa, ulang sekali. Mengembalikan artikel atau alasan tolak/gagal. */
  async function tulisDanPeriksa(k) {
    coba[k.jenis]++;
    const konteks = { jenis: k.jenis, asal: k.asal, bahan: tulisMod.susunBahan(k), judulSumber: k.judul, judulTerbaru };
    let h;
    try {
      h = await penulis.tulis({ kandidat: k, judulTerbaru });
    } catch (e) {
      return { gagal: e.message, fatal: /\b(401|402|403)\b/.test(e.message) };
    }
    R.biayaUsd += h.biayaUsd;
    if (h.artikel?.layak === false) return { tolak: `model menilai tidak layak: ${ringkas(h.artikel.alasan || '-', 120)}`, singkat: 'tidak layak' };
    let { artikel } = jaga.perbaikiOtomatis(h.artikel);
    let masalah = jaga.periksaArtikel(artikel, konteks);
    let model = h.model;
    if (masalah.length) {
      log(`  penjaga putaran 1: ${masalah.length} masalah: ${jaga.intiMasalah(masalah)}`);
      let h2;
      try {
        h2 = await penulis.tulis({ kandidat: k, judulTerbaru, percakapan: h.percakapan, masalah });
      } catch (e) {
        return { gagal: e.message, fatal: /\b(401|402|403)\b/.test(e.message) };
      }
      R.biayaUsd += h2.biayaUsd;
      if (h2.artikel?.layak === false) return { tolak: `model menilai tidak layak: ${ringkas(h2.artikel.alasan || '-', 120)}`, singkat: 'tidak layak' };
      ({ artikel } = jaga.perbaikiOtomatis(h2.artikel));
      masalah = jaga.periksaArtikel(artikel, konteks);
      model = h2.model;
      if (masalah.length) return { tolak: `gagal penjaga dua kali: ${masalah.slice(0, 4).join(' | ')}`, singkat: jaga.intiMasalah(masalah) || 'penjaga' };
    }
    return { artikel, model };
  }

  const slugUnik = (dasar) => {
    let s = dasar || `berita-${Date.now()}`;
    for (let n = 2; situs.slug.has(s); n++) s = `${dasar.slice(0, 68)}-${n}`;
    situs.slug.add(s);
    return s;
  };

  /** Terbitkan satu kandidat yang sudah punya bahan. true = terbit. */
  async function proses(k) {
    const h = await tulisDanPeriksa(k);
    if (h.gagal) {
      log(`  GAGAL tulis: ${h.gagal}`);
      R.dilewati.push({ jenis: k.jenis, sumber: k.sumberId, judul: k.judul, url: k.url, tahap: 'tulis', alasan: h.gagal, alasanSingkat: 'galat penulis' });
      catatKunci(st, k.kunci, { t: w.tanggal, hasil: 'gagal', alasan: ringkas(h.gagal, 160), judul: ringkas(k.judul, 160) });
      if (h.fatal) galatFatal = `penulis: ${h.gagal}`;
      return false;
    }
    if (h.tolak) {
      log(`  DITOLAK: ${ringkas(h.tolak, 220)}`);
      R.dilewati.push({ jenis: k.jenis, sumber: k.sumberId, judul: k.judul, url: k.url, tahap: 'tulis', alasan: h.tolak, alasanSingkat: h.singkat });
      catatKunci(st, k.kunci, { t: w.tanggal, hasil: 'ditolak', alasan: ringkas(h.tolak, 200), judul: ringkas(k.judul, 160) });
      return false;
    }
    const a = h.artikel;
    const slug = slugUnik(slugify(a.title));
    let g = null;
    // Keputusan pemilik 16 Nov 2026: siaran pers lembaga memakai foto rilisnya (pola The Signal);
    // yang tidak berfoto layak, berita media, dan tips memakai ilustrasi AI.
    if (k.asal === 'lembaga' && k.fotoUrl) {
      try {
        const f = await fotoRilis.unduhFotoRilis(k.fotoUrl, { riwayat: st.gambar, jadikanSampul: gbr.jadikanSampul });
        g = { webp: f.webp, sidik: f.sidik, sumber: 'foto-rilis', rilis: true };
        log(`  foto rilis ${f.lebar}x${f.tinggi}: ${k.fotoUrl}`);
      } catch (e) {
        log(`  foto rilis tidak dipakai (${e.message}): ${k.fotoUrl}`);
      }
    }
    if (!g) {
      try {
        g = await pembuatGambar.buat({ slug, kanal: a.kanal, frasa: a.illustration });
      } catch (e) {
        log(`  GAGAL gambar: ${e.message}`);
        situs.slug.delete(slug);
        R.dilewati.push({ jenis: k.jenis, sumber: k.sumberId, judul: a.title, url: k.url, tahap: 'gambar', alasan: e.message, alasanSingkat: 'gambar gagal' });
        catatKunci(st, k.kunci, { t: w.tanggal, hasil: 'gagal', alasan: ringkas(`gambar: ${e.message}`, 160), judul: ringkas(k.judul, 160) });
        return false;
      }
    }
    R.gambar = pembuatGambar.dipakai;
    const kini = wib();
    const label = k.jenis === 'tips' ? `Podcast Kasisolusi di YouTube: ${k.video.title}` : `${k.sumberLabel || k.sumberNama}: ${k.judul}`;
    const jadi = {
      slug,
      title: a.title,
      dek: a.dek,
      kanal: a.kanal,
      date: kini.tanggal,
      dibuat: kini.iso,
      jenis: k.jenis,
      otomatis: true,
      kunci: k.kunci,
      img: jalurGambar(slug),
      imgAlt: g.rilis ? `Foto dokumentasi ${fotoRilis.kreditFotoRilis(k).replace(/^Dok\. /, '')}: ${a.title}`.slice(0, 200) : a.imgAlt,
      foto: g.rilis ? fotoRilis.kreditFotoRilis(k) : 'Ilustrasi AI',
      takeaways: a.takeaways,
      body: a.body,
      sumber: [{ label: ringkas(label.replace(/[<>]/g, ''), 290), url: k.url }],
      ...(k.video ? { video: { id: k.video.id, title: ringkas(k.video.title.replace(/[<>]/g, ''), 290) } } : {}),
      penulis: h.model,
      ilustrasi: g.sumber,
      ...(g.rilis ? { fotoSumber: k.fotoUrl } : {}),
    };
    const bentuk = periksaBentuk(jadi);
    if (bentuk.length) {
      // Seharusnya tidak pernah terjadi (penjaga lebih ketat); kalau terjadi, itu bug pipeline.
      R.galat.push(`bentuk artikel tidak sah (${bentuk.join('; ')}): ${a.title}`);
      situs.slug.delete(slug);
      return false;
    }
    const dirJson = KERING ? join(keluaran, 'data', 'berita') : DIR_BERITA;
    const dirImg = KERING ? join(keluaran, 'public', 'assets', 'berita') : DIR_GAMBAR;
    mkdirSync(dirJson, { recursive: true });
    mkdirSync(dirImg, { recursive: true });
    // Gambar dulu: JSON tidak boleh pernah menunjuk gambar yang belum ada.
    writeFileSync(join(dirImg, `${slug}.webp`), g.webp);
    writeFileSync(join(dirJson, `${jadi.date}-${slug}.json`), `${JSON.stringify(jadi, null, 2)}\n`, 'utf8');
    catatTerbit(st, w.tanggal, k.jenis);
    catatKunci(st, k.kunci, { t: w.tanggal, hasil: 'terbit', slug, judul: ringkas(k.judul, 160) });
    st.gambar[g.sidik] = { t: w.tanggal, slug };
    judulTerbaru.unshift(a.title);
    judulDiproses.push(k.judul);
    hasilTerbit[k.jenis]++;
    R.terbit.push({ jenis: k.jenis, judul: a.title, slug, kanal: a.kanal, sumber: k.sumberNama, url: k.url, model: h.model, gambar: g.sumber, kb: Math.round(g.webp.length / 1024) });
    log(`  TERBIT${KERING ? ' (kering)' : ''}: ${a.title} [${a.kanal}] gambar ${g.sumber} ${Math.round(g.webp.length / 1024)} KB${g.frasaDiganti ? ' (objek ilustrasi diganti cadangan)' : ''}`);
    return true;
  }

  // --- berita: saring, kelompokkan, urutkan
  if (jatah.berita) {
    const BERPUSAT_UMKM = new Set(['pnm', 'bpjph', 'ekraf']);
    const lolos = [];
    for (const k of [...lembaga.kandidat, ...media.kandidat]) {
      const s = sudahAda(k);
      if (s) { periksa(k, s); continue; }
      const teks = `${k.judul}\n${k.ringkas}`;
      const skor = sel.skorRelevansi(teks);
      if (k.asal === 'media' && skor < 3) { periksa(k, 'judul/ringkasan tidak menyinggung UMKM'); continue; }
      if (k.asal === 'lembaga' && skor < 1 && !BERPUSAT_UMKM.has(k.sumberId)) { periksa(k, 'judul tidak menyinggung UMKM'); continue; }
      const topik = sel.topikDihindari(teks);
      if (topik) { periksa(k, topik, true); continue; }
      const kembar = sel.adaKembar(k.judul, [...judulTerbaru, ...judulDiproses]);
      if (kembar) { periksa(k, `sudah dibahas: ${ringkas(kembar, 80)}`, true); continue; }
      k.skor = skor;
      lolos.push(k);
    }
    // Kelompok topik yang sama dari beberapa sumber: satu wakil, sisanya cadangan. Makin banyak
    // sumber yang membahas, makin tinggi peringkatnya (radar topik ramai).
    const prioritas = (k) => {
      const segar = k.asal === 'media' ? Math.max(0, 72 - umurJam(k.terbit)) / 3 : Math.max(0, 9 - (k.urutanDaftar || 9)) * 2;
      const radarCocok = radar.judul.some((j) => sel.kemiripan(k.judul, j).sama >= 3) ? 15 : 0;
      return (k.asal === 'lembaga' ? 100 : 50) + k.skor * 4 + segar + radarCocok;
    };
    lolos.sort((a, b) => prioritas(b) - prioritas(a));
    const kelompok = [];
    for (const k of lolos) {
      const T = sel.token(k.judul);
      const g = kelompok.find((x) => sel.judulKembar(T, x.token));
      if (g) g.anggota.push(k);
      else kelompok.push({ token: T, anggota: [k] });
    }
    kelompok.sort((a, b) => prioritas(b.anggota[0]) + (b.anggota.length - 1) * 10 - (prioritas(a.anggota[0]) + (a.anggota.length - 1) * 10));
    // Keragaman: paling banyak 2 kelompok berturut dari sumber yang sama di depan antrean.
    const perSumber = {};
    const depan = [];
    const belakang = [];
    for (const g of kelompok) {
      const id = g.anggota[0].sumberId;
      perSumber[id] = (perSumber[id] || 0) + 1;
      (perSumber[id] <= 2 ? depan : belakang).push(g);
    }
    const antre = [...depan, ...belakang];
    log(`Berita: ${lolos.length} kandidat lolos saring awal, ${antre.length} topik`);

    let ambilKe = 0;
    for (const g of antre) {
      if (hasilTerbit.berita >= jatah.berita || coba.berita >= COBA_TULIS_MAKS.berita || galatFatal || habisWaktu()) break;
      for (const k of g.anggota) {
        if (ambilKe >= 24 || habisWaktu()) break;
        ambilKe++;
        log(`- [${k.sumberId}] ${ringkas(k.judul, 90)}`);
        const a = await ambilIsiSekali(k);
        if (!a.ok) { periksa(k, a.alasan, a.permanen); log(`  lewat: ${a.alasan}`); continue; }
        let alasan = '';
        if (k.isi.length < BAHAN_MIN.berita) alasan = `bahan tipis (${k.isi.length} karakter)`;
        else if (!k.terbit) alasan = 'tanggal terbit tidak terbaca';
        else if (umurJam(k.terbit) > UMUR_MAKS_JAM[k.asal]) alasan = `terlalu lama (${tanggalPanjang(k.terbit)})`;
        else if (sel.skorRelevansi(`${k.judul}\n${k.isi.slice(0, 1500)}`) < 3) alasan = 'isinya bukan soal UMKM';
        else {
          alasan = sel.topikDihindari(`${k.judul}\n${k.ringkas}\n${k.isi.slice(0, 600)}`);
          const kembar = !alasan && sel.adaKembar(k.judul, [...judulTerbaru, ...judulDiproses]);
          if (kembar) alasan = `sudah dibahas: ${ringkas(kembar, 80)}`;
        }
        if (alasan) { periksa(k, alasan, true); log(`  lewat: ${alasan}`); continue; }
        await proses(k);
        break; // satu kelompok cukup satu percobaan tulis
      }
    }
  }

  // --- tips
  if (jatah.tips && !galatFatal) {
    for (const d of tips.ditolak) R.diperiksa.push({ jenis: 'tips', sumber: 'youtube', judul: d.judul, alasan: d.alasan });
    let calon = tips.kandidat.filter((k) => {
      const s = sudahAda(k);
      if (s) periksa(k, s);
      return !s;
    });
    calon.sort((a, b) => (b.baru - a.baru) || (a.baru ? Date.parse(b.terbit) - Date.parse(a.terbit) : b.tayangan - a.tayangan));
    // Cadangan arsip data/episodes.mjs lewat halaman watch, hanya bila RSS tidak memberi calon.
    if (!calon.length) {
      const arsip = [...situs.episodes]
        .filter((e) => !tips.sudah.has(e.id) && !situs.kunci.has(`yt:${e.id}`) && bolehDiproses(st, `yt:${e.id}`) && !cache[`yt:${e.id}`])
        .sort((a, b) => b.views - a.views)
        .slice(0, 2);
      for (const ep of arsip) {
        const h = await episodeDariWatch(ep);
        if (!h) { R.diperiksa.push({ jenis: 'tips', sumber: 'youtube', judul: ep.title, alasan: 'halaman watch tanpa deskripsi' }); continue; }
        if (h.alasan) { periksa(h.k, h.alasan, true); continue; }
        calon.push(h.k);
      }
    }
    log(`Tips: ${calon.length} episode layak`);
    for (const k of calon) {
      if (hasilTerbit.tips >= jatah.tips || coba.tips >= COBA_TULIS_MAKS.tips || galatFatal || habisWaktu()) break;
      log(`- [youtube] ${ringkas(k.judul, 90)}`);
      await proses(k);
    }
  }

  // --- uji kering: ekstraksi artikel teratas dari TIAP sumber (laporan "teks terbaca atau tidak")
  if (KERING) {
    R.ujiSumber = [];
    for (const s of [...lembaga.laporan, ...media.laporan]) {
      const k = [...lembaga.kandidat, ...media.kandidat].find((x) => x.sumberId === s.id);
      if (!k) { R.ujiSumber.push({ id: s.id, nama: s.nama, hasil: `${s.status}${s.catatan ? `: ${s.catatan}` : ''}` }); continue; }
      const salin = { ...k };
      const a = await ambilIsiSekali(salin);
      R.ujiSumber.push(a.ok
        ? { id: s.id, nama: s.nama, hasil: 'ekstraksi OK', judul: salin.judul, terbit: salin.terbit, karakter: salin.isi.length, url: k.url, ...(salin.asal === 'lembaga' ? { foto: salin.fotoUrl || '' } : {}) }
        : { id: s.id, nama: s.nama, hasil: `ekstraksi gagal: ${a.alasan}`, url: k.url });
    }
  }

  // --- simpan
  R.gambar = pembuatGambar.dipakai;
  R.terbitHariIni = { berita: sudah.berita + hasilTerbit.berita, tips: sudah.tips + hasilTerbit.tips };
  catatBiaya(st, w.tanggal, R.biayaUsd);
  if (galatFatal) R.galat.push(galatFatal);
  if (!KERING) {
    R.statusBerubah = JSON.stringify(st) !== statusAwal && simpanStatus(st);
    // Uji kering hanya membaca cache: penilaian "sudah dibahas" di uji kering tidak boleh
    // menahan artikel di putaran terbit sungguhan.
    simpanCache(cache);
  }
  if (KERING) tulisLaporanKering(keluaran, R, { lembaga, media, tips });
  cetakRingkas(R);
  // Galat fatal (kunci salah, saldo habis) membuat job merah, KECUALI sebagian artikel sudah
  // jadi: yang sudah jadi tetap di-commit, galatnya tetap dikabarkan lewat ringkasan/Telegram.
  return selesai(galatFatal && !R.terbit.length ? 1 : 0);
}

// ------------------------------------------------------------------ laporan

function cetakRingkas(R) {
  log('--- sumber');
  for (const s of R.sumber) log(`  ${s.status.padEnd(8)} ${s.nama}: ${s.tautan ?? 0} butir${s.segar !== undefined ? `, ${s.segar} segar (<=72 jam)` : ''}${s.layak !== undefined ? `, ${s.layak} layak` : ''}${s.judul !== undefined ? `, ${s.judul} judul` : ''}${s.catatan ? ` | ${s.catatan}` : ''}`);
  if (R.ujiSumber) {
    log('--- uji ekstraksi per sumber');
    for (const u of R.ujiSumber) log(`  ${u.nama}: ${u.hasil}${u.karakter ? ` (${u.karakter} karakter, terbit ${u.terbit ? tanggalPanjang(u.terbit) : '?'}) "${ringkas(u.judul, 70)}"` : ''}${u.foto !== undefined ? ` | foto rilis: ${u.foto || 'tidak ada'}` : ''}`);
  }
  log(`--- hasil: ${R.terbit.length} terbit, ${R.dilewati.length} dilewati sesudah ditulis, ${R.diperiksa.length} disaring sebelum ditulis, biaya teks $${R.biayaUsd.toFixed(4)}, gambar ${R.gambar}`);
  for (const g of R.galat) log(`  GALAT: ${g}`);
}

function tulisLaporanKering(dir, R, { lembaga, media, tips }) {
  mkdirSync(dir, { recursive: true });
  const kandidat = [...lembaga.kandidat, ...media.kandidat, ...tips.kandidat].map((k) => ({
    jenis: k.jenis, sumber: k.sumberId, judul: k.judul, url: k.url, terbit: k.terbit || '', karakterBahan: k.isi ? k.isi.length : null,
  }));
  writeFileSync(join(dir, 'kandidat.json'), `${JSON.stringify(kandidat, null, 1)}\n`, 'utf8');
  writeFileSync(join(dir, 'ringkasan.json'), `${JSON.stringify(R, null, 1)}\n`, 'utf8');
  const md = [
    `# Uji kering berita otomatis, ${R.waktuTeks}`,
    '',
    `Jatah: ${R.jatah.berita} berita, ${R.jatah.tips} tips. Terbit (kering): ${R.terbit.length}. Dilewati sesudah ditulis: ${R.dilewati.length}. Biaya teks: $${R.biayaUsd.toFixed(4)}. Gambar: ${R.gambar}.`,
    '',
    '## Artikel',
    ...R.terbit.map((a) => `- **${a.judul}** (${a.jenis}, ${a.kanal}, ${a.sumber}, penulis ${a.model}, gambar ${a.gambar}): data/berita/*-${a.slug}.json`),
    '',
    '## Dilewati sesudah ditulis',
    ...R.dilewati.map((d) => `- ${d.judul} (${d.sumber}): ${d.alasan}`),
    '',
    '## Sumber',
    ...R.sumber.map((s) => `- ${s.nama}: ${s.status}, ${s.tautan ?? 0} butir${s.segar !== undefined ? `, ${s.segar} segar` : ''}${s.layak !== undefined ? `, ${s.layak} layak` : ''}${s.catatan ? `. ${s.catatan}` : ''}`),
    '',
    '## Uji ekstraksi per sumber',
    ...(R.ujiSumber || []).map((u) => `- ${u.nama}: ${u.hasil}${u.karakter ? ` (${u.karakter} karakter, terbit ${u.terbit || '?'}) ${u.judul}` : ''}`),
    '',
    '## Disaring sebelum ditulis',
    ...R.diperiksa.slice(0, 200).map((d) => `- [${d.sumber}] ${d.judul}: ${d.alasan}`),
    '',
  ].join('\n');
  writeFileSync(join(dir, 'ringkasan.md'), md, 'utf8');
  log(`Hasil uji kering: ${dir}`);
}

// ------------------------------------------------------------------ masuk

const utama = ada('--cek') ? cek : ada('--kabari') ? kabari : jalankan;
utama()
  .then((kode) => process.exit(typeof kode === 'number' ? kode : 0))
  .catch((e) => {
    console.error(`GAGAL: ${e.stack || e.message}`);
    try {
      if (utama === jalankan) {
        mkdirSync(dirname(BERKAS_RINGKASAN), { recursive: true });
        writeFileSync(BERKAS_RINGKASAN, `${JSON.stringify({ versi: 1, mode: KERING ? 'kering' : 'terbit', terbit: [], dilewati: [], galat: [`putaran gagal: ${e.message}`] }, null, 1)}\n`);
      }
    } catch { /* abaikan */ }
    process.exit(1);
  });
