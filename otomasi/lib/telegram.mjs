// Kabar Telegram sesudah putaran. Hanya jalan kalau TELEGRAM_BOT_TOKEN dan TELEGRAM_CHAT_ID ada;
// tanpa keduanya diam (bukan galat). Dikirim SESUDAH push, supaya pesan "terbit" tidak pernah
// mendahului commit yang ternyata gagal.
import { log } from './alat.mjs';

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Susun pesan dari ringkasan putaran. Mengembalikan '' bila tidak ada yang perlu dikabarkan
 * (putaran kosong yang sehat tidak dikirim supaya tidak berisik).
 */
export function susunPesan(r, { hasilPush = '', hasilJob = '', origin = '' } = {}) {
  const terbit = r?.terbit || [];
  const galat = [...(r?.galat || [])];
  // Artikel baru benar-benar tayang hanya kalau push berhasil. Gerbang build/audit yang gagal
  // membuat langkah push dilewati (hasilPush kosong) dan job berstatus failure.
  const tidakTayang = terbit.length > 0 && (hasilPush === 'gagal' || (hasilJob && hasilJob !== 'success'));
  if (hasilPush === 'gagal') galat.unshift('push ke repo gagal: artikel di bawah TIDAK tayang');
  else if (tidakTayang) galat.unshift(`job berstatus ${hasilJob} (build/audit atau langkah lain gagal): artikel di bawah TIDAK tayang`);
  if (hasilJob && hasilJob !== 'success' && !galat.length) galat.push(`job berstatus ${hasilJob} (lihat log Actions)`);
  if (!r) return hasilJob && hasilJob !== 'success' ? `<b>Kasisolusi: putaran berita gagal</b>\nRingkasan tidak terbentuk. Job: ${esc(hasilJob)}. Periksa log GitHub Actions.` : '';
  if (!terbit.length && !galat.length) return '';
  const nb = terbit.filter((x) => x.jenis === 'berita').length;
  const nt = terbit.filter((x) => x.jenis === 'tips').length;
  const baris = [];
  if (tidakTayang) baris.push(`<b>Kasisolusi: ${nb} berita + ${nt} tips TIDAK tayang</b>`);
  else baris.push(galat.length && !terbit.length ? '<b>Kasisolusi: putaran berita bermasalah</b>' : `<b>Kasisolusi: ${nb} berita + ${nt} tips terbit</b>`);
  if (r.terbitHariIni) baris.push(`${esc(r.waktuTeks || '')} · hari ini ${r.terbitHariIni.berita}/12 berita, ${r.terbitHariIni.tips}/3 tips`);
  if (terbit.length) baris.push('');
  for (const a of terbit) baris.push(`• <a href="${esc(`${origin}/berita/${a.slug}`)}">${esc(a.judul)}</a> (${esc(a.jenis === 'tips' ? 'tips' : a.kanal)}, ${esc(a.sumber)})`);
  if (r.dilewati?.length) {
    const hitung = {};
    for (const d of r.dilewati) hitung[d.alasanSingkat || 'lain'] = (hitung[d.alasanSingkat || 'lain'] || 0) + 1;
    baris.push('', `Dilewati sesudah ditulis: ${Object.entries(hitung).map(([k, v]) => `${esc(k)} ${v}`).join(', ')}`);
  }
  if (r.biayaUsd || r.gambar) baris.push(`Biaya teks $${Number(r.biayaUsd || 0).toFixed(4)}, gambar ${r.gambar || 0}`);
  if (galat.length) baris.push('', ...galat.slice(0, 5).map((g) => `⚠ ${esc(g)}`));
  return baris.join('\n');
}

export async function kirimTelegram(teks) {
  const token = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
  const chat = (process.env.TELEGRAM_CHAT_ID || '').trim();
  if (!token || !chat) {
    log('Telegram: TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID tidak ada, kabar dilewati.');
    return false;
  }
  if (!teks) {
    log('Telegram: tidak ada yang perlu dikabarkan.');
    return false;
  }
  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chat, text: teks.slice(0, 4000), parse_mode: 'HTML', link_preview_options: { is_disabled: true } }),
    signal: AbortSignal.timeout(20000),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.ok) throw new Error(`Telegram ${r.status}: ${JSON.stringify(j).slice(0, 160)}`);
  log('Telegram: kabar terkirim.');
  return true;
}
