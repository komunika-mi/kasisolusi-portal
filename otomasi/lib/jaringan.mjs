// Pengambilan halaman: fetch Node, cadangan curl saat koneksi gagal, robots.txt, dan penolakan AI.
//
// Aturan yang sengaja dipegang:
// - Balasan berstatus HTTP (403, 429, 5xx) TIDAK dicoba ulang lewat jalan lain. Halaman yang
//   menolak kita tidak diakali (keputusan pemilik: bisnis.com 403, jangan dibobol).
// - curl hanya dipakai kalau koneksi gagal SEBELUM ada status (TLS, timeout, DNS). Itu soal
//   tumpukan TLS Node, bukan proteksi bot: dari laptop 15 Nov 2026 RSS detikFinance tidak
//   pernah menjawab fetch Node dalam 25 detik, sedangkan curl langsung 200.
// - `-k` (abaikan rantai sertifikat) HANYA untuk host di HOST_TLS_RUSAK, sebagai usaha terakhir.
//   Diwarisi dari The Signal (scripts/lib.mjs): di runner GitHub ekon.go.id gagal menyambung
//   dengan cara apa pun kecuali curl -k. Yang diambil siaran pers publik. Kosongkan Set ini
//   kalau risikonya dinilai tidak sepadan; kanal itu kembali diam, yang lain tidak terpengaruh.
// - robots.txt dihormati untuk sumber pihak ketiga. Penerbit yang menolak perayap AI di
//   robots.txt (GPTBot, ClaudeBot, CCBot, dan sejenisnya) dianggap tidak mengizinkan beritanya
//   ditulis ulang oleh AI, jadi dilewati.
import { execFile } from 'node:child_process';
import { UA } from './konfigurasi.mjs';
import { tidur } from './alat.mjs';

const HOST_TLS_RUSAK = new Set(['ekon.go.id']);

export class GagalAmbil extends Error {
  constructor(pesan, status = 0) {
    super(pesan);
    this.status = status;
  }
}

const antrean = new Map(); // host -> janji giliran terakhir
/** Beri jeda antarpermintaan ke host yang sama (sopan, dan menghormati Crawl-delay). */
function giliran(host, jedaMs) {
  const sebelumnya = antrean.get(host) || Promise.resolve();
  const kini = sebelumnya.then(() => tidur(jedaMs));
  antrean.set(host, kini.catch(() => {}));
  return sebelumnya;
}

function curl(url, timeoutMs, tambahan, biner) {
  const args = [
    '-sL', '--compressed', '--max-time', String(Math.ceil(timeoutMs / 1000)),
    '-A', UA(),
    '-H', 'Accept-Language: id-ID,id;q=0.9,en;q=0.6',
    ...tambahan,
    '-w', '\n%{http_code}',
    url,
  ];
  return new Promise((ok, gagal) => {
    execFile('curl', args, { encoding: 'buffer', maxBuffer: 64 << 20, windowsHide: true }, (err, stdout) => {
      if (err && !stdout?.length) return gagal(new GagalAmbil(`curl: ${String(err.message).split('\n')[0].slice(0, 80)}`));
      const buf = stdout || Buffer.alloc(0);
      const potong = buf.lastIndexOf(0x0a);
      const status = Number(buf.subarray(potong + 1).toString('utf8').trim()) || 0;
      const badan = buf.subarray(0, Math.max(0, potong));
      ok({ status, url, buffer: badan, teks: biner ? undefined : badan.toString('utf8'), tipe: '' });
    });
  });
}

const kodeGalat = (e) => e?.cause?.code || e?.name || String(e?.message || e).slice(0, 60);

/**
 * Ambil satu URL. Mengembalikan { status, url, teks } (atau { buffer } bila biner).
 * Melempar GagalAmbil bila status bukan 2xx atau koneksi gagal total.
 */
export async function ambil(url, { timeout = 20000, biner = false, header = {}, jeda = 800 } = {}) {
  const u = new URL(url);
  await giliran(u.hostname, jeda);
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': UA(), 'Accept-Language': 'id-ID,id;q=0.9,en;q=0.6', ...header },
      redirect: 'follow',
      signal: AbortSignal.timeout(timeout),
    });
    if (!r.ok) {
      await r.body?.cancel().catch(() => {});
      throw new GagalAmbil(`HTTP ${r.status}`, r.status);
    }
    const tipe = r.headers.get('content-type') || '';
    if (biner) return { status: r.status, url: r.url, buffer: Buffer.from(await r.arrayBuffer()), tipe };
    return { status: r.status, url: r.url, teks: await r.text(), tipe };
  } catch (e) {
    if (e instanceof GagalAmbil) throw e;
    let terakhir = new GagalAmbil(`koneksi gagal (${kodeGalat(e)})`);
    const percobaan = [[], ...(HOST_TLS_RUSAK.has(u.hostname.replace(/^www\./, '')) ? [['-k']] : [])];
    for (const tambahan of percobaan) {
      try {
        const h = await curl(url, Math.min(timeout, 20000), tambahan, biner);
        if (h.status >= 200 && h.status < 300 && h.buffer.length > 0) return h;
        terakhir = new GagalAmbil(h.status ? `HTTP ${h.status} (curl)` : 'curl tanpa status', h.status);
        if (h.status) break; // ada status HTTP: jangan dicoba dengan cara lain
      } catch (e2) {
        terakhir = e2 instanceof GagalAmbil ? e2 : new GagalAmbil(String(e2.message || e2));
      }
    }
    throw terakhir;
  }
}

// ------------------------------------------------------------------ robots.txt

// Perayap yang khusus untuk AI. Penerbit yang menutup "/" untuk salah satunya dianggap menolak
// isinya dipakai AI. Daftarnya sengaja eksplisit.
const PERAYAP_AI = new Set([
  'gptbot', 'chatgpt-user', 'ccbot', 'anthropic-ai', 'claudebot', 'claude-web', 'google-extended',
  'perplexitybot', 'bytespider', 'applebot-extended', 'meta-externalagent', 'cohere-ai', 'ai2bot',
]);

/** Urai robots.txt menjadi grup {agen[], aturan[{izin, pola}], jeda}. */
export function uraiRobots(teks) {
  const grup = [];
  let kini = null;
  let barisAgen = false;
  for (const mentah of String(teks || '').split(/\r?\n/)) {
    const b = mentah.replace(/#.*$/, '').trim();
    if (!b) continue;
    const m = b.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const k = m[1].toLowerCase();
    const v = m[2].trim();
    if (k === 'user-agent') {
      if (!kini || !barisAgen) {
        kini = { agen: [], aturan: [], jeda: null };
        grup.push(kini);
      }
      kini.agen.push(v.toLowerCase());
      barisAgen = true;
      continue;
    }
    barisAgen = false;
    if (!kini) continue;
    if (k === 'allow' || k === 'disallow') kini.aturan.push({ izin: k === 'allow', pola: v });
    else if (k === 'crawl-delay') kini.jeda = Number(v) || null;
  }
  return grup;
}

function cocokPola(pola, jalur) {
  if (!pola) return -1;
  const akhir = pola.endsWith('$');
  const inti = akhir ? pola.slice(0, -1) : pola;
  const re = new RegExp(`^${inti.split('*').map((x) => x.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*')}${akhir ? '$' : ''}`);
  return re.test(jalur) ? inti.length : -1;
}

/** Penilaian robots.txt untuk satu jalur, memakai grup "*" (identitas kita peramban umum). */
export function nilaiRobots(grup, jalur) {
  const umum = grup.filter((g) => g.agen.includes('*'));
  let terpanjang = -1;
  let izin = true;
  for (const g of umum) {
    for (const a of g.aturan) {
      if (!a.izin && a.pola === '') continue; // "Disallow:" kosong = boleh semua
      const p = cocokPola(a.pola, jalur);
      if (p > terpanjang || (p === terpanjang && a.izin)) {
        if (p >= 0) {
          terpanjang = p;
          izin = a.izin;
        }
      }
    }
  }
  const tolakAI = grup.some((g) => g.agen.some((x) => PERAYAP_AI.has(x)) && g.aturan.some((a) => !a.izin && a.pola === '/'));
  const jeda = Math.max(0, ...umum.map((g) => g.jeda || 0));
  return { boleh: izin, tolakAI, jedaDetik: jeda };
}

const cacheRobots = new Map();

/** Periksa izin robots.txt untuk URL. { boleh, alasan, jedaMs } */
export async function izinRobots(url) {
  const u = new URL(url);
  const asal = u.origin;
  if (!cacheRobots.has(asal)) {
    cacheRobots.set(asal, (async () => {
      try {
        const r = await ambil(`${asal}/robots.txt`, { timeout: 12000, jeda: 0 });
        return { grup: uraiRobots(r.teks), ada: true };
      } catch (e) {
        // 4xx = tidak ada aturan (boleh). Gagal sambung/5xx = tidak bisa dipastikan, lewati dulu (RFC 9309).
        if (e.status >= 400 && e.status < 500) return { grup: [], ada: false };
        return { gagal: e.message };
      }
    })());
  }
  const info = await cacheRobots.get(asal);
  if (info.gagal) return { boleh: false, alasan: `robots.txt tidak terbaca (${info.gagal})`, jedaMs: 0 };
  const n = nilaiRobots(info.grup, u.pathname + u.search);
  if (n.tolakAI) return { boleh: false, alasan: 'robots.txt menolak perayap AI', jedaMs: 0 };
  if (!n.boleh) return { boleh: false, alasan: 'robots.txt melarang jalur ini', jedaMs: 0 };
  return { boleh: true, alasan: '', jedaMs: Math.min(10, n.jedaDetik) * 1000 };
}

/** Larangan eksplisit di halaman (catatan kaki "dilarang crawling untuk AI", meta noai). */
export function laranganAIDiHalaman(html) {
  const s = String(html || '');
  if (/<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*\bnoai\b/i.test(s)) return 'meta robots noai';
  const t = s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  if (/(dilarang|tidak diperkenankan|tidak diizinkan)[^.]{0,120}(crawling|pengindeksan otomatis|scraping|mengambil konten)[^.]{0,120}(\bAI\b|kecerdasan buatan|artificial intelligence)/i.test(t)) {
    return 'halaman melarang crawling untuk AI';
  }
  if (/(prohibited|not permitted|not allowed)[^.]{0,80}(scraping|crawling|text and data mining)[^.]{0,80}(\bAI\b|artificial intelligence|machine learning)/i.test(t)) {
    return 'halaman melarang crawling untuk AI';
  }
  return '';
}
