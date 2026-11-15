// Penulis artikel lewat OpenRouter (keputusan pemilik: model Cina murah), plus penulis tiruan
// untuk uji kering tanpa kunci API.
//
// Format permintaan dicocokkan dengan dokumentasi resmi OpenRouter (dibaca 15 Nov 2026):
// - POST https://openrouter.ai/api/v1/chat/completions, hanya `messages` yang wajib.
// - `models`: daftar id berurutan; kalau model pertama galat (down, rate limit, moderasi,
//   panjang konteks), OpenRouter mencoba berikutnya. Model yang akhirnya dipakai ada di
//   kolom `model` balasan, dan biayanya mengikuti model itu.
// - `response_format` {type: json_schema, json_schema: {name, strict, schema}} untuk keluaran
//   terstruktur; `provider.require_parameters: true` supaya hanya diarahkan ke penyedia yang
//   mendukungnya. Ketiga model bawaan mendaftarkan response_format dan structured_outputs di
//   /api/v1/models (dicek 15 Nov 2026).
// - plugin `response-healing` memperbaiki JSON yang cacat (kurung kurang, koma sisa).
// - `usage.cost` di balasan = biaya permintaan dalam USD.
import { KANAL_SAH } from '../../src/berita-otomatis.mjs';
import { kanal as KANAL } from '../../src/ui.mjs';
import { daftarModel } from './konfigurasi.mjs';
import { tanggalPanjang, satuBaris, log } from './alat.mjs';
import { ambilAngka } from './angka.mjs';

export const SKEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['layak', 'alasan', 'title', 'dek', 'kanal', 'takeaways', 'body', 'imgAlt', 'illustration'],
  properties: {
    layak: { type: 'boolean', description: 'false bila bahan tidak layak ditulis' },
    alasan: { type: 'string', description: 'alasan singkat bila tidak layak, kosong bila layak' },
    title: { type: 'string', description: 'judul, paling banyak 70 karakter' },
    dek: { type: 'string', description: 'ringkasan 1-2 kalimat' },
    kanal: { type: 'string', enum: KANAL_SAH },
    takeaways: { type: 'array', items: { type: 'string' }, description: 'tepat 3 poin' },
    body: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['type', 'text'],
        properties: { type: { type: 'string', enum: ['p', 'h2', 'quote'] }, text: { type: 'string' } },
      },
    },
    imgAlt: { type: 'string' },
    illustration: { type: 'string', description: 'frasa benda/suasana bahasa Inggris untuk ilustrasi, tanpa orang dan tulisan' },
  },
};

const DAFTAR_KANAL = KANAL_SAH.map((k) => `${k} = ${KANAL[k].name} (${KANAL[k].blurb})`).join('\n');

export const PROMPT_SISTEM = `Kamu redaktur Kasisolusi, portal berita dan podcast untuk pelaku UMKM Indonesia.
Tugasmu menulis artikel baru dari BAHAN yang diberikan, dengan kata-katamu sendiri.

FAKTA (wajib, diperiksa mesin):
1. Semua fakta hanya dari BAHAN. Jangan menambah angka, nama orang, jabatan, lembaga, tanggal, nomor aturan, peringkat, atau klaim yang tidak tertulis di BAHAN.
2. Setiap angka (nominal, persen, jumlah, tanggal, tahun, nomor aturan) harus persis ada di BAHAN. Jangan membulatkan, menjumlahkan, mengonversi, atau menghitung sendiri. Jangan menulis jumlah butir buatanmu sendiri ("3 cara", "lima langkah") kecuali jumlah itu tertulis di BAHAN. Kalau ragu, tulis tanpa angka.
3. Jangan memakai kata peringkat atau jumlah samar kecuali kata itu tertulis di BAHAN: paling sering, paling banyak, paling besar, terbesar, tertinggi, terendah, terkecil, terbanyak, mayoritas, kebanyakan, sebagian besar, pada umumnya, rata-rata, ribuan, ratusan, puluhan, jutaan.
4. Klaim narasumber atau lembaga ditulis sebagai klaim: "menurut ...", "kata ...", "ujar ...", "disebut ...".
5. Kutipan langsung (dalam tanda kutip atau blok "quote") harus disalin persis dari BAHAN. Jangan mengubah isi kutipan dan jangan mengarang kutipan.
6. Tulis ulang dengan kata-katamu sendiri. Jangan menyalin kalimat BAHAN kecuali di dalam kutipan langsung.

GAYA:
- Bahasa Indonesia formal tetapi enak dibaca, seperti berita detik.com. Kalimat pendek. Satu gagasan per kalimat.
- Kata baku: menunggu, memberi, bertanya, supaya, untuk, hanya, membuat, saja, tidak. Jangan memakai: nunggu, dikasih, nanya, biar, buat, cuma, bikin, gimana, banget, nggak, gak, aja, udah, kalo, kayak.
- Jangan memakai tanda pisah panjang (—) atau en dash (–). Pakai koma atau titik.
- Kepala negara selalu "Presiden Prabowo" atau "Presiden Prabowo Subianto", tidak pernah "Prabowo" saja. Pejabat lain disebut dengan jabatan dan nama persis seperti tertulis di BAHAN; kalau BAHAN hanya menyebut jabatan atau lembaganya, jangan menambah nama.
- Tanpa markdown, tanpa emoji, tanpa tautan, tanpa tanda < dan >.

JUDUL (title):
- Paling banyak 70 karakter. Judul harus memancing rasa ingin tahu pembaca UMKM, tetapi tetap jujur: semua yang dijanjikan judul dijawab di isi.
- Mulai dari sudut pandang pembaca (manfaat, peluang, atau masalah yang ia hadapi), lalu pokok beritanya. Jangan membuka judul dengan nama lembaga kalau bisa dibuka dengan manfaatnya.
- Pola yang dianjurkan, pilih yang paling cocok dengan isi:
  1. Manfaat lalu pokok berita, misalnya "Lolos Kurasi, 20 Produk UMKM Ini Kini Dijual di Ritel Besar".
  2. Pertanyaan pembaca lalu jawabannya, misalnya "Mau Dapat Pembiayaan Bank? Ini Bekal untuk Pelaku Ekraf".
  3. Kabar peluang, misalnya "Pemkab Siap Sambut Ribuan Kuota Sertifikasi Halal untuk UMKM".
  4. "Begini Cara ...", "Ini ...", atau "Simak ..." bila isinya memang menjelaskan cara atau rincian.
- Contoh di atas hanya POLA dari artikel lain. Jangan memakai angka, nama, atau isinya. Angka, kata peringkat, dan jumlah samar di judul tetap wajib tertulis di BAHAN.
- Dilarang: janji yang tidak dijawab isi, angka atau superlatif yang tidak ada di BAHAN, menyembunyikan inti berita sampai pembaca harus mengklik untuk tahu apa yang terjadi, mendramatisasi bencana atau kejahatan, kata sensasional (heboh, geger, mengejutkan), tanda seru, huruf kapital semua.
- Judul wajib menyebut pokok soalnya (lembaga, program, atau persoalan utama).

KOLOM JSON:
- layak: false bila BAHAN bukan soal UMKM, usaha, atau pekerja mandiri; terlalu tipis untuk ditulis tanpa mengarang; atau topiknya sama dengan judul Kasisolusi yang sudah terbit. Isi "alasan". Bila false, kolom lain boleh kosong.
- dek: 1-2 kalimat (60-250 karakter) yang merangkum inti.
- kanal: satu dari daftar KANAL, dipilih menurut manfaatnya bagi pembaca, bukan menurut lembaga sumbernya. Modal, pembiayaan, kredit, pajak, dan literasi keuangan = keuangan. Pemasaran, penjualan, merek, dan akses pasar = marketing. Program atau layanan yang langsung dipakai pelaku usaha (sertifikasi, perizinan, pelatihan, pendampingan) = bisnis. Konten, desain, dan pelaku ekonomi kreatif = kreatif. Ekonomi hanya untuk kebijakan makro dan kondisi ekonomi umum (inflasi, suku bunga, ekspor-impor, pertumbuhan). Bila lebih dari satu cocok, pilih yang paling dekat dengan isi utama artikel.
- takeaways: tepat 3 poin penting, masing-masing satu kalimat (20-220 karakter).
- body: daftar blok {"type": "p" | "h2" | "quote", "text": "..."}. Blok "quote" berisi kutipan langsung saja: tanpa tanda kutip, tanpa "ujar ..." atau "kata ...", diakhiri titik. Sebut siapa yang berbicara di paragraf tepat sebelum blok quote.
- imgAlt: deskripsi singkat ilustrasi sampul dalam bahasa Indonesia, tanpa nama orang.
- illustration: frasa benda atau suasana dalam bahasa Inggris (5-20 kata) untuk ilustrasi sampul. Tanpa orang, wajah, tangan, tulisan, angka, uang, koin, dokumen, layar, ponsel, logo, papan nama, bendera, peta, jam, kalender, kalkulator, kemasan berlabel, atau bangunan dan tempat terkenal. Contoh: "a neat row of glass jars filled with spices on a wooden market stall".

ATURAN BERITA (JENIS: berita):
- 300 sampai 800 kata di body, tidak termasuk subjudul.
- Paragraf pertama menyampaikan inti (siapa, apa, kapan) dan menyebut sumbernya, misalnya "menurut siaran pers Kementerian X" atau "seperti dilaporkan detikFinance".
- 2 sampai 4 subjudul (h2). Subjudul TERAKHIR "Apa artinya bagi pelaku usaha" (atau yang semakna), berisi dampak dan langkah praktis untuk pembaca UMKM TANPA fakta, angka, atau nama baru. Misalnya: cek syarat ke lembaga resmi, siapkan dokumen yang disebut di BAHAN, pantau pengumuman resmi.

ATURAN TIPS (JENIS: tips):
- BAHAN hanya judul dan deskripsi resmi episode Podcast Kasisolusi. Jangan menambah tips, contoh, atau angka yang tidak disebut di deskripsi.
- 200 sampai 650 kata di body. Kalau deskripsi terlalu tipis untuk 200 kata tanpa mengarang, isi layak false.
- Tulis sebagai pendapat narasumber: "menurut [nama] dalam Podcast Kasisolusi", "kata [nama]".
- Paragraf pertama menyebut episode dan narasumbernya. Penutup mengajak menonton episode lengkapnya di Podcast Kasisolusi.

KANAL:
${DAFTAR_KANAL}

Keluarkan SATU objek JSON saja, tanpa teks lain.`;

/** Bahan lengkap yang dipakai model DAN penjaga (penjaga memeriksa angka terhadap teks ini). */
export function susunBahan(k) {
  const kepala = k.jenis === 'tips'
    ? [
      'SUMBER: episode Podcast Kasisolusi di YouTube',
      `JUDUL EPISODE: ${k.judul}`,
      k.terbit ? `TANGGAL TAYANG: ${tanggalPanjang(k.terbit)}` : '',
      k.narasumber ? `NARASUMBER: ${k.narasumber}` : '',
    ]
    : [
      `SUMBER: ${k.sumberNama}`,
      `URL: ${k.url}`,
      k.terbit ? `TANGGAL TERBIT SUMBER: ${tanggalPanjang(k.terbit)}` : '',
      `JUDUL SUMBER: ${k.judul}`,
    ];
  return `${kepala.filter(Boolean).join('\n')}\n\n${k.isi}`;
}

function pesanAwal(k, judulTerbaru) {
  const daftar = judulTerbaru.length ? judulTerbaru.slice(0, 80).map((j) => `- ${j}`).join('\n') : '- (belum ada)';
  return `JENIS: ${k.jenis}

<<<BAHAN
${susunBahan(k)}
BAHAN>>>

JUDUL KASISOLUSI 14 HARI TERAKHIR (jangan menulis topik yang sama; kalau BAHAN membahas hal yang sama, isi layak false):
${daftar}

Tulis artikel sesuai aturan. Keluarkan JSON saja.`;
}

const pesanUlang = (masalah) => `Tulisanmu belum lolos pemeriksaan otomatis. Perbaiki SEMUA masalah berikut, lalu kirim ulang SATU objek JSON lengkap:
${masalah.map((x) => `- ${x}`).join('\n')}
Ingat: angka, kata peringkat, dan kutipan hanya boleh yang tertulis di BAHAN.`;

// ------------------------------------------------------------------ JSON yang tahan banting

/**
 * Urai JSON dari balasan model: buang pagar ```json, ambil objek terluar, escape karakter
 * kontrol mentah di dalam string, dan buang koma sisa sebelum } atau ].
 */
export function uraiJson(teks) {
  let s = String(teks || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
  const a = s.indexOf('{');
  const b = s.lastIndexOf('}');
  if (a < 0 || b <= a) throw new Error('balasan tanpa objek JSON');
  s = s.slice(a, b + 1);
  try {
    return JSON.parse(s);
  } catch {
    /* lanjut ke perbaikan */
  }
  let out = '';
  let dalam = false;
  let lolos = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (dalam) {
      if (lolos) { out += c; lolos = false; continue; }
      if (c === '\\') { out += c; lolos = true; continue; }
      if (c === '"') { dalam = false; out += c; continue; }
      const kode = c.charCodeAt(0);
      if (kode < 0x20) {
        out += c === '\n' ? '\\n' : c === '\r' ? '\\r' : c === '\t' ? '\\t' : `\\u${kode.toString(16).padStart(4, '0')}`;
        continue;
      }
      out += c;
      continue;
    }
    if (c === '"') { dalam = true; out += c; continue; }
    if (c === ',') {
      const sisa = s.slice(i + 1).match(/^\s*([}\]])/);
      if (sisa) continue; // koma sisa
    }
    out += c;
  }
  return JSON.parse(out);
}

// ------------------------------------------------------------------ OpenRouter

async function panggil(pesan, { kunci, models, formatJson }) {
  const badan = {
    models,
    messages: pesan,
    temperature: 0.4,
    // Token berpikir ikut dihitung dalam max_tokens (dokumentasi OpenRouter, Reasoning Tokens).
    // /api/v1/models 16 Nov 2026: deepseek-v4.1-flash berpikir bawaan dengan effort "high", dan
    // glm-5.3-flash WAJIB berpikir (bawaan "max", tidak menerima "none"). Uji kering 16 Nov: 3 dari 6
    // tulisan terpotong di batas 8000. "low" didukung ketiga model bawaan; batasnya dilonggarkan.
    reasoning: { effort: 'low' },
    max_tokens: 16000,
    response_format: formatJson === 'schema'
      ? { type: 'json_schema', json_schema: { name: 'artikel_kasisolusi', strict: true, schema: SKEMA } }
      : { type: 'json_object' },
    provider: { require_parameters: true },
    plugins: [{ id: 'response-healing' }],
  };
  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${kunci}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(badan),
    signal: AbortSignal.timeout(120000),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) {
    const e = new Error(`OpenRouter ${r.status}: ${satuBaris(j?.error?.message || JSON.stringify(j).slice(0, 160))}`);
    e.status = r.status;
    throw e;
  }
  const pilihan = j.choices?.[0];
  if (pilihan?.error) throw new Error(`OpenRouter: ${satuBaris(pilihan.error.message || 'galat penyedia')}`);
  const isi = pilihan?.message?.content;
  // Jumlah token dicatat supaya penyebab balasan terpotong (berpikir terlalu panjang atau keluaran
  // berulang) terbaca di log Actions.
  const u = j.usage || {};
  const tokenTeks = `${u.completion_tokens ?? '?'} token keluaran, ${u.completion_tokens_details?.reasoning_tokens ?? 0} untuk berpikir`;
  log(`  penulis ${j.model || models[0]}: ${tokenTeks}, selesai ${pilihan?.finish_reason || '?'}`);
  if (pilihan?.finish_reason === 'length') throw new Error(`OpenRouter: balasan terpotong (max_tokens; ${tokenTeks})`);
  if (typeof isi !== 'string' || !isi.trim()) throw new Error('OpenRouter: balasan kosong');
  return { teks: isi, model: j.model || models[0], biayaUsd: Number(j.usage?.cost) || 0 };
}

/** Penulis sungguhan. Satu objek per putaran; menyimpan galat terakhir untuk laporan. */
export function buatPenulisAsli(kunci) {
  const models = daftarModel();
  let formatJson = 'schema';
  return {
    nama: models[0],
    /**
     * @returns {Promise<{artikel:object, model:string, biayaUsd:number, percakapan:object[]}>}
     */
    async tulis({ kandidat, judulTerbaru = [], percakapan = null, masalah = null }) {
      const pesan = percakapan
        ? [...percakapan, { role: 'user', content: pesanUlang(masalah) }]
        : [{ role: 'system', content: PROMPT_SISTEM }, { role: 'user', content: pesanAwal(kandidat, judulTerbaru) }];
      let biaya = 0;
      let gagalUrai = 0;
      for (;;) {
        let h;
        try {
          h = await panggil(pesan, { kunci, models, formatJson });
        } catch (e) {
          // Kalau skema terstruktur ditolak (400), turun ke mode JSON biasa untuk sisa putaran.
          // Ini tidak dihitung sebagai percobaan urai.
          if (e.status === 400 && formatJson === 'schema') {
            log(`  penulis: json_schema ditolak (${e.message.slice(0, 80)}); pakai json_object`);
            formatJson = 'object';
            continue;
          }
          throw e;
        }
        biaya += h.biayaUsd;
        try {
          const artikel = uraiJson(h.teks);
          return { artikel, model: h.model, biayaUsd: biaya, percakapan: [...pesan, { role: 'assistant', content: h.teks }] };
        } catch (e) {
          // Keputusan pemilik: JSON rusak diulang sekali.
          if (++gagalUrai >= 2) throw new Error(`JSON tidak terbaca dua kali: ${e.message}`);
          log(`  penulis: JSON tidak terbaca (${e.message}); ulang sekali`);
        }
      }
    },
  };
}

// ------------------------------------------------------------------ penulis tiruan

const ISIAN = [
  'Informasi ini dirangkum untuk membantu pelaku usaha memahami pokok persoalannya.',
  'Rincian lengkap dan syarat resminya tetap mengacu pada sumber aslinya.',
  'Pelaku usaha sebaiknya membaca pengumuman resmi sebelum mengambil keputusan.',
  'Setiap usaha punya kondisi yang berbeda, jadi dampaknya juga bisa berbeda.',
  'Catat hal yang relevan dengan usahamu dan tanyakan langsung ke lembaga terkait bila ada yang belum jelas.',
  'Perubahan kebijakan biasanya diumumkan bertahap, jadi pantau kanal resmi secara berkala.',
  'Simpan dokumen pendukung usaha dengan rapi supaya mudah dipakai ketika diperlukan.',
  'Diskusikan informasi ini dengan rekan sesama pelaku usaha untuk melihat sudut pandang lain.',
];

function tebakKanal(teks) {
  const t = teks.toLowerCase();
  if (/pajak|kredit|kur\b|pembiayaan|bunga|modal|keuangan|pnm|mekaar/.test(t)) return 'keuangan';
  if (/ekspor|impor|inflasi|ekonomi|perdagangan/.test(t)) return 'ekonomi';
  if (/merek|branding|pemasaran|marketing|penjualan|promosi/.test(t)) return 'marketing';
  if (/kreatif|konten|kreator|desain|ekraf/.test(t)) return 'kreatif';
  return 'bisnis';
}

/**
 * Penulis tiruan untuk uji kering tanpa kunci. Putaran pertama SENGAJA membawa cacat (angka
 * karangan, tanda pisah, "Prabowo" telanjang, superlatif) supaya perbaikan otomatis, penjaga,
 * dan jalur ulang benar-benar teruji. Putaran kedua (dengan umpan balik) bersih. Hasil tiruan
 * tidak pernah boleh terbit: jalan.mjs menolak mode terbit tanpa kunci.
 */
export function buatPenulisTiruan() {
  return {
    nama: 'tiruan',
    async tulis({ kandidat, masalah = null }) {
      const sumber = kandidat.jenis === 'tips' ? 'Podcast Kasisolusi' : kandidat.sumberNama;
      const angka = ambilAngka(kandidat.isi).filter((t) => t.jenis === 'nilai').map((t) => t.asli).slice(0, 2);
      const kanal = tebakKanal(`${kandidat.judul} ${kandidat.isi}`);
      // Judul YouTube sering huruf kapital semua dan bergaya gaul; tiruan merapikannya seadanya.
      let dasar = satuBaris(kandidat.judul.replace(/[!?‼⁉️]+/gu, ' ').replace(/\s+-\s+.*$/, ''));
      if (dasar === dasar.toUpperCase()) dasar = dasar.charAt(0) + dasar.slice(1).toLowerCase();
      dasar = dasar.replace(/\b(nggak|gak|ga)\b/gi, 'tidak').replace(/\bbikin\b/gi, 'membuat').replace(/\bbuat\b/gi, 'untuk');
      const judulDasar = dasar.split(/\s+/).slice(0, 7).join(' ');
      const pembuka = kandidat.jenis === 'tips'
        ? `Episode Podcast Kasisolusi berjudul "${kandidat.judul}" membahas topik yang dekat dengan pelaku usaha.`
        : `${sumber} menerbitkan informasi berjudul "${kandidat.judul}".`;
      const paragraf = [pembuka, 'Artikel ini keluaran uji kering dengan penulis tiruan, bukan berita sungguhan.'];
      for (const a of angka) paragraf.push(`Salah satu angka yang tertulis di sumber adalah ${a}.`);
      const body = [{ type: 'p', text: paragraf.join(' ') }, { type: 'h2', text: 'Isi pokok' }];
      let n = 0;
      while (body.reduce((s, b) => s + b.text.split(/\s+/).length, 0) < (kandidat.jenis === 'tips' ? 240 : 330)) {
        body.push({ type: 'p', text: `${ISIAN[n % ISIAN.length]} ${ISIAN[(n + 3) % ISIAN.length]}` });
        n++;
        if (n === 4) body.push({ type: 'h2', text: kandidat.jenis === 'tips' ? 'Tonton episodenya' : 'Apa artinya bagi pelaku usaha' });
      }
      if (n < 4) body.push({ type: 'h2', text: 'Apa artinya bagi pelaku usaha' }, { type: 'p', text: ISIAN[2] });
      const artikel = {
        layak: true,
        alasan: '',
        title: `${judulDasar.replace(/[,;:.]+$/, '')}, Ini Pokoknya`,
        dek: `Kasisolusi merangkum informasi dari ${sumber} untuk pelaku usaha. Simak pokok-pokoknya di sini.`,
        kanal,
        takeaways: [
          `Informasi ini berasal dari ${sumber}.`,
          'Rincian resmi tetap mengacu pada sumber aslinya.',
          'Pelaku usaha disarankan memantau kanal resmi secara berkala.',
        ],
        body,
        imgAlt: 'Ilustrasi sampul uji kering berupa meja toko kecil',
        illustration: 'a tidy small shop counter with woven baskets and potted plants',
      };
      if (!masalah) {
        // Cacat sengaja untuk menguji penjaga.
        artikel.title = `${artikel.title.slice(0, 40)} — Kabar Terbesar`;
        artikel.body = [...body.slice(0, 1), { type: 'p', text: 'Prabowo mendukung langkah ini dengan dana Rp999 miliar.' }, ...body.slice(1)];
      }
      return { artikel, model: 'tiruan', biayaUsd: 0, percakapan: [] };
    },
  };
}
