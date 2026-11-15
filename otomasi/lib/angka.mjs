// Penjaga angka: setiap angka di tulisan harus ada di bahan sumber.
//
// Yang dibandingkan adalah NILAI beserta satuannya, bukan deretan digit. "Rp2 miliar" hanya
// lolos kalau sumber memuat 2 miliar rupiah dalam bentuk apa pun (Rp2 miliar, Rp 2 miliar,
// Rp2.000.000.000, 2 miliar rupiah). Angka "2" yang kebetulan ada di tempat lain TIDAK cukup.
// Pelajaran dari proyek lain: cadangan "asal digitnya ada" pernah meloloskan Rp2 miliar karena
// ada angka 2 di sumber. Cadangan seperti itu sengaja tidak ada di sini.
//
// Jenis token:
//   nilai   { nilai, satuan: rp|usd|persen|polos }  nominal, persen, jumlah, tahun
//   tanggal { d, m, y }                             18 Oktober 2026, 22/10/2026, (22/10)
//   aturan  { n, y }                                PP Nomor 20 Tahun 2026, PMK-71/2026, POJK 13/2025
//   teks    { t }                                   5G, B2B, 4.0, pukul 09.00 (dibandingkan sebagai teks)

const BULAN = {
  januari: 1, jan: 1, februari: 2, pebruari: 2, feb: 2, maret: 3, mar: 3, april: 4, apr: 4, mei: 5,
  juni: 6, jun: 6, juli: 7, jul: 7, agustus: 8, agu: 8, agt: 8, ags: 8, september: 9, sep: 9, sept: 9,
  oktober: 10, okt: 10, november: 11, nopember: 11, nov: 11, desember: 12, des: 12,
};
const NAMA_BULAN = Object.keys(BULAN).sort((a, b) => b.length - a.length).join('|');
const SKALA = { ribu: 1e3, rb: 1e3, juta: 1e6, jt: 1e6, miliar: 1e9, milyar: 1e9, triliun: 1e12, trilyun: 1e12, kuadriliun: 1e15 };
// Singkatan yang hanya sah sesudah tanda mata uang (Rp 260 T, Rp2M, Rp50rb).
const SKALA_UANG = { t: 1e12, m: 1e9, jt: 1e6, rb: 1e3, k: 1e3 };

const kunciNilai = (v) => String(Number(Number(v).toPrecision(12)));

/** Ganti rentang [a,b) dengan spasi supaya indeks teks tetap. */
function tutup(s, a, b) {
  return s.slice(0, a) + ' '.repeat(b - a) + s.slice(b);
}

function uraiDigit(s) {
  if (/^\d{1,3}(?:\.\d{3})+(?:,\d+)?$/.test(s)) return Number(s.replace(/\./g, '').replace(',', '.')); // 17.637.774 / 1.500,5
  if (/^\d{1,3}(?:,\d{3})+(?:\.\d+)?$/.test(s) && s.split(',').length > 2) return Number(s.replace(/,/g, '')); // 1,500,000 (gaya Inggris)
  if (/^\d+,\d+$/.test(s)) return Number(s.replace(',', '.')); // 2,5
  if (/^\d+\.\d{1,2}$/.test(s)) return Number(s); // 1.5 (gaya Inggris)
  if (/^\d+$/.test(s)) return Number(s);
  return NaN;
}

/**
 * Ambil semua token angka dari teks.
 * @returns {Array<{jenis:string, asli:string, [k:string]:any}>}
 */
export function ambilAngka(teksAsli) {
  let s = String(teksAsli || '').replace(/[   ]/g, ' ');
  const hasil = [];
  const pakai = (re, buat) => {
    for (const m of [...s.matchAll(re)]) {
      const t = buat(m);
      if (!t) continue;
      hasil.push({ ...t, asli: m[0].trim() });
      s = tutup(s, m.index, m.index + m[0].length);
    }
  };

  // 1. Tanggal angka lengkap: 22/10/2026, 01-10-2026, 22.10.2026
  pakai(/(?<![\d/])(\d{1,2})\s*[/.-]\s*(\d{1,2})\s*[/.-]\s*((?:19|20)\d{2})(?![\d/])/g, (m) => {
    const d = +m[1], b = +m[2];
    return d >= 1 && d <= 31 && b >= 1 && b <= 12 ? { jenis: 'tanggal', d, m: b, y: +m[3] } : null;
  });
  // 2. Tanggal dalam kurung tanpa tahun: Kamis (22/10)
  pakai(/\((\d{1,2})\/(\d{1,2})\)/g, (m) => {
    const d = +m[1], b = +m[2];
    return d >= 1 && d <= 31 && b >= 1 && b <= 12 ? { jenis: 'tanggal', d, m: b, y: null } : null;
  });
  // 3. Tanggal teks: 18 Oktober 2026, 18 Okt
  pakai(new RegExp(`(?<![\\p{L}\\d])(\\d{1,2})\\s+(${NAMA_BULAN})\\.?(?:,?\\s+((?:19|20)\\d{2}))?(?![\\p{L}])`, 'giu'), (m) => {
    const d = +m[1];
    return d >= 1 && d <= 31 ? { jenis: 'tanggal', d, m: BULAN[m[2].toLowerCase()], y: m[3] ? +m[3] : null } : null;
  });
  // 4. Nomor aturan: "Nomor 20 Tahun 2026", "No. 74 Tahun 2026", "20/2026", "PMK-71/2026"
  pakai(/(?:nomor|nomer|no\.?)\s*(\d{1,4})\s*(?:tahun|thn\.?)\s*((?:19|20)\d{2})/gi, (m) => ({ jenis: 'aturan', n: +m[1], y: +m[2] }));
  pakai(/(?<![\d/])(\d{1,4})\s*\/\s*((?:19|20)\d{2})(?![\d/])/g, (m) => ({ jenis: 'aturan', n: +m[1], y: +m[2] }));
  // 5. Jam: pukul 09.00, 20.00 WIB
  pakai(/(?:pukul|jam|pkl\.?)\s*(\d{1,2})[.:](\d{2})(?!\d)/gi, (m) => ({ jenis: 'teks', t: `jam ${+m[1]}.${m[2]}` }));
  pakai(/(?<![\d.,])(\d{1,2})[.:](\d{2})\s*(?:WIB|WITA|WIT)\b/g, (m) => ({ jenis: 'teks', t: `jam ${+m[1]}.${m[2]}` }));

  // 6. Nilai: mata uang, skala, persen.
  const reNilai = /(?<![\p{L}\d.,])(Rp\.?\s?|IDR\s?|US\$\s?|USD\s?|S\$\s?|\$\s?)?(\d+(?:[.,]\d+)*)(\s?(?:ribu|rb|juta|jt|miliar|milyar|triliun|trilyun|kuadriliun)(?![\p{L}])|\s?(?:T|M|Jt|Rb|K|rb|jt)(?![\p{L}\d]))?(\s?(?:%|persen(?![\p{L}])|percent(?![\p{L}])|rupiah(?![\p{L}])|dolar(?: AS)?(?![\p{L}])))?/giu;
  for (const m of [...s.matchAll(reNilai)]) {
    const [utuh, mataUang = '', digit, skalaMentah = '', satuanMentah = ''] = m;
    const sesudah = s[m.index + utuh.length] || '';
    // Digit yang menempel ke huruf (5G, 3x) diurus sebagai token teks di langkah 7.
    if (!skalaMentah && !satuanMentah && /\p{L}/u.test(sesudah)) continue;
    let nilai = uraiDigit(digit);
    if (Number.isNaN(nilai)) continue;
    const sk = skalaMentah.trim().toLowerCase();
    if (sk) {
      if (SKALA[sk]) nilai *= SKALA[sk];
      else if (mataUang && SKALA_UANG[sk]) nilai *= SKALA_UANG[sk];
      else if (!mataUang) continue; // "2 M" tanpa Rp: bukan angka yang bisa dipastikan
    }
    const sat = satuanMentah.trim().toLowerCase();
    const mu = mataUang.trim().toLowerCase();
    let satuan = 'polos';
    if (sat === '%' || sat === 'persen' || sat === 'percent') satuan = 'persen';
    else if (mu.startsWith('rp') || mu === 'idr' || sat === 'rupiah') satuan = 'rp';
    else if (mu.includes('$') || mu === 'usd' || sat.startsWith('dolar')) satuan = 'usd';
    hasil.push({ jenis: 'nilai', nilai, satuan, asli: utuh.trim() });
    s = tutup(s, m.index, m.index + utuh.length);
  }
  // 7. Sisa campuran huruf+angka: 5G, B2B, COVID-19, 4.0
  for (const m of s.matchAll(/(?<![\p{L}\d])[\p{L}\d]*\d[\p{L}\d]*(?:[-.][\p{L}\d]+)*/gu)) {
    if (!/\p{L}/u.test(m[0]) && !/\d\.\d/.test(m[0])) continue;
    hasil.push({ jenis: 'teks', t: m[0].toLowerCase(), asli: m[0] });
  }
  return hasil;
}

// ------------------------------------------------------------------ bilangan dalam kata (sisi sumber)

const SATUAN_KATA = { nol: 0, satu: 1, dua: 2, tiga: 3, empat: 4, lima: 5, enam: 6, tujuh: 7, delapan: 8, sembilan: 9 };
const SE = { sepuluh: 10, sebelas: 11, seratus: 100, seribu: 1e3, sejuta: 1e6, semiliar: 1e9 };

/** Nilai bilangan yang ditulis dengan kata di sumber ("dua miliar", "seratus ribu", "tiga"). */
export function bilanganKata(teks) {
  return bilanganKataSatuan(teks).map((x) => x.nilai);
}

/** Seperti bilanganKata, ditambah satuan dari kata sesudahnya ("dua miliar rupiah" = rp). */
export function bilanganKataSatuan(teks) {
  const kata = String(teks || '').toLowerCase().split(/[^a-z]+/).filter(Boolean);
  const nilai = [];
  for (let i = 0; i < kata.length; i++) {
    let v = null;
    let j = i;
    const w = kata[j];
    if (w in SATUAN_KATA) v = SATUAN_KATA[w];
    else if (w in SE) v = SE[w];
    else continue;
    j++;
    if (kata[j] === 'belas' && v < 10) { v += 10; j++; }
    else if (kata[j] === 'puluh' && v < 10) {
      v *= 10; j++;
      if (kata[j] in SATUAN_KATA) { v += SATUAN_KATA[kata[j]]; j++; }
    } else if (kata[j] === 'ratus' && v < 10) {
      v *= 100; j++;
    }
    const sk = SKALA[kata[j]];
    if (sk) { v *= sk; j++; }
    const satuan = kata[j] === 'rupiah' ? 'rp' : kata[j] === 'persen' ? 'persen' : kata[j] === 'dolar' ? 'usd' : 'polos';
    nilai.push({ nilai: v, satuan });
    i = j - 1; // kata yang sudah terbaca tidak dihitung lagi
  }
  return nilai;
}

// ------------------------------------------------------------------ indeks sumber dan pencocokan

export function indeksSumber(teks) {
  const idx = { semua: new Set(), satuan: { rp: new Set(), usd: new Set(), persen: new Set() }, tanggal: new Set(), aturan: new Set(), teks: new Set() };
  for (const t of ambilAngka(teks)) {
    if (t.jenis === 'nilai') {
      idx.semua.add(kunciNilai(t.nilai));
      if (t.satuan !== 'polos') idx.satuan[t.satuan].add(kunciNilai(t.nilai));
    } else if (t.jenis === 'tanggal') {
      idx.tanggal.add(`${t.d}-${t.m}`);
      if (t.y) idx.tanggal.add(`${t.d}-${t.m}-${t.y}`);
      idx.semua.add(kunciNilai(t.d));
      if (t.y) idx.semua.add(kunciNilai(t.y));
    } else if (t.jenis === 'aturan') {
      idx.aturan.add(`${t.n}/${t.y}`);
      idx.semua.add(kunciNilai(t.n));
      idx.semua.add(kunciNilai(t.y));
    } else if (t.jenis === 'teks') {
      idx.teks.add(t.t);
    }
  }
  for (const x of bilanganKataSatuan(teks)) {
    idx.semua.add(kunciNilai(x.nilai));
    if (x.satuan !== 'polos') idx.satuan[x.satuan].add(kunciNilai(x.nilai));
  }
  return idx;
}

export function angkaBersumber(t, idx) {
  if (t.jenis === 'nilai') {
    const k = kunciNilai(t.nilai);
    return t.satuan === 'polos' ? idx.semua.has(k) : idx.satuan[t.satuan].has(k);
  }
  if (t.jenis === 'tanggal') {
    if (t.y) return idx.tanggal.has(`${t.d}-${t.m}-${t.y}`) || (idx.tanggal.has(`${t.d}-${t.m}`) && idx.semua.has(kunciNilai(t.y)));
    return idx.tanggal.has(`${t.d}-${t.m}`);
  }
  if (t.jenis === 'aturan') return idx.aturan.has(`${t.n}/${t.y}`);
  return idx.teks.has(t.t);
}

/** Daftar angka di `teks` yang tidak ada di sumber (bentuk aslinya, tanpa duplikat). */
export function angkaTakBersumber(teks, idx) {
  const tolak = [];
  for (const t of ambilAngka(teks)) if (!angkaBersumber(t, idx)) tolak.push(t.asli);
  return [...new Set(tolak)];
}

// Bilangan berupa kata di judul dan dek ("Tiga Cara ...") juga harus ada di sumber, sebagai
// kata maupun angka. "satu" sengaja tidak diperiksa (terlalu umum: salah satu, satu per satu).
const KATA_BILANGAN = /\b(dua|tiga|empat|lima|enam|tujuh|delapan|sembilan|sepuluh|sebelas|(?:dua|tiga|empat|lima|enam|tujuh|delapan|sembilan) (?:belas|puluh))\b/gi;
export function kataBilanganTakBersumber(teks, idx, teksSumber) {
  const sumberKecil = String(teksSumber || '').toLowerCase();
  const tolak = [];
  for (const m of String(teks || '').matchAll(KATA_BILANGAN)) {
    const w = m[1].toLowerCase();
    const v = bilanganKata(w)[0];
    if (!idx.semua.has(kunciNilai(v)) && !new RegExp(`\\b${w}\\b`).test(sumberKecil)) tolak.push(m[1]);
  }
  return [...new Set(tolak)];
}
