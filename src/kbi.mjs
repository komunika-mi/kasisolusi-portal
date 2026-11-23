// Komponen halaman KBI (/kelas), section KBI di beranda, dan halaman detail kelas.
// Susunan mengikuti tracker "Task_Revisi_Website_Kasisolusi_KBI" (8 Okt 2026) dan contoh
// halaman "KBI di LP": 10 Schools -> Program Terdekat KBI -> Produk Edukasi Kasisolusi.
import { esc } from './seo.mjs';
import { icon, thumbUrl } from './ui.mjs';
import { kbiPage, utm } from '../data/kbi.mjs';

const luar = (url) => /^https?:/.test(url);
const tujuan = (o) => (o.utm && luar(o.url) ? utm(o.url, o.utm) : o.url);
const baru = (url) => (luar(url) ? ' target="_blank" rel="noopener"' : '');
// Atribut untuk event klik keluar (task 43). Dibaca app.js; satu tautan = satu event.
const lacak = (section, id, target) => ` data-lacak="${section}" data-lacak-id="${id}" data-lacak-target="${target}"`;

const eyebrow = (t, tag = 'p') => `<${tag} class="eyebrow">${esc(t)}</${tag}>`;

/* ------------------------------------------------------------ 10 Schools */
function schoolCard(s) {
  const img = `<img src="/assets/kbi/school-${s.file}.webp" width="${s.w}" height="${s.h}" alt="Logo ${esc(s.name)}" loading="lazy" decoding="async"${s.tinggi ? ` style="--lh:${s.tinggi}"` : ''}>`;
  if (!s.instagram) return `<li><div class="kschool kschool--static">${img}</div></li>`;
  return `<li><a class="kschool" href="${esc(utm(s.instagram, `school_${s.slug}_card`))}" target="_blank" rel="noopener"${lacak('schools', s.slug, 'card')} aria-label="${esc(s.name)}: lihat di Instagram (tab baru)">${img}<span class="kschool__cta">Lihat di Instagram ${icon('arrow')}</span></a></li>`;
}

/**
 * @param {{h?: 'h1'|'h2', label?: string, link?: string}} o  h = tingkat judul; label = pengganti
 *   label section (di beranda memakai nama KBI); link = tautan "lihat halaman KBI" di beranda.
 */
export function schoolsBlock({ h = 'h1', label, link = '' } = {}) {
  const d = kbiPage.schools;
  const adaIg = d.items.some((s) => s.instagram);
  const induk = d.igInduk
    ? ` Akun utama KBI: <a href="${esc(utm(d.igInduk, 'schools_akun_induk'))}" target="_blank" rel="noopener"${lacak('schools', 'akun_induk', 'link')}>@${esc(new URL(d.igInduk).pathname.replace(/\//g, ''))}<span class="sr"> (Instagram, tab baru)</span></a>`
    : '';
  return `
    <div class="kb__head${adaIg || link ? ' kb__head--sisi' : ''}">
      <div>
        ${eyebrow(label || d.label)}
        <${h} class="kb__t"><span>${esc(d.title[0])}</span> <span>${esc(d.title[1])}</span></${h}>
        <p class="kb__d">${esc(d.desc)}</p>
      </div>
      ${adaIg ? `<p class="kb__ig">${icon('instagram')}<span>${esc(d.igNote)}${induk}</span></p>` : ''}
      ${link}
    </div>
    <ul class="kschools" aria-label="Daftar school Kasisolusi Business Institute">
      ${d.items.map(schoolCard).join('')}
    </ul>`;
}

/* ------------------------------------------------------------ Program Terdekat KBI */
function programCard(p, now, h) {
  const selesai = new Date(p.tutup) < now;
  const badge = selesai
    ? '<span class="pgm__badge pgm__badge--tutup" data-badge>Pendaftaran Ditutup</span>'
    : p.terbuka ? '<span class="pgm__badge" data-badge>Pendaftaran Dibuka</span>' : '<span class="pgm__badge" data-badge hidden></span>';
  const img = `<img src="/assets/kbi/poster-${p.poster}-1x1.webp" width="1080" height="1080" alt="${esc(p.alt)}" loading="lazy" decoding="async">`;
  const posterHref = tujuan(p.posterUrl);
  const poster = selesai
    ? `<span class="pgm__poster">${img}</span>`
    : `<a class="pgm__poster" href="${esc(posterHref)}"${baru(p.posterUrl.url)}${luar(p.posterUrl.url) ? lacak('program', p.slug, 'poster') : ''} data-poster aria-label="Poster ${esc(p.title)}${luar(p.posterUrl.url) ? ' (halaman pendaftaran, tab baru)' : ''}">${img}</a>`;
  const cta = selesai
    ? '<p class="pgm__tutup">Pendaftaran program ini sudah ditutup.</p>'
    : p.cta.map((c, i) => `<a class="btn ${i === 0 ? 'btn--blue' : 'btn--line'}" href="${esc(tujuan(c))}"${baru(c.url)}${luar(c.url) ? lacak('program', p.slug, 'cta') : ''}>${esc(c.label)} ${icon(luar(c.url) ? 'external' : 'arrow')}<span class="sr"> ${esc(p.title)}${luar(c.url) ? ' (tab baru)' : ''}</span></a>`).join('');
  return `
      <article class="pgm rv" data-tutup="${p.tutup}">
        ${poster}
        <div class="pgm__body">
          <div class="pgm__atas"><p class="pgm__school">${esc(p.school)}</p>${badge}</div>
          <${h} class="pgm__t">${esc(p.title)}</${h}>
          ${p.sub ? `<p class="pgm__sub">${esc(p.sub)}</p>` : ''}
          <ul class="pgm__fakta">
            ${p.fakta.map((f) => `<li>${icon(f.ikon)}<span>${esc(f.teks)}</span></li>`).join('')}
          </ul>
          <dl class="pgm__harga">
            ${p.harga.map((x) => `<div><dt>${esc(x.label)}</dt><dd>${esc(x.nilai)}</dd></div>`).join('')}
          </dl>
          <div class="pgm__cta" id="daftar-${p.slug.replace(/_/g, '-')}" data-cta>${cta}</div>
          ${p.tutupLabel && !selesai ? `<p class="pgm__catatan" data-catatan>${esc(p.tutupLabel)}</p>` : ''}
        </div>
      </article>`;
}

export function programBlock({ now, h = 'h2' } = {}) {
  const d = kbiPage.program;
  const hk = h === 'h2' ? 'h3' : 'h4';
  return `
    <div class="shead">
      <div>
        ${eyebrow(d.label)}
        <${h} class="shead__t">${esc(d.title)}</${h}>
        <p class="shead__d shead__d--lebar">${esc(d.desc)}</p>
      </div>
    </div>
    <div class="pgms">
      ${d.items.map((p) => programCard(p, now, hk)).join('')}
    </div>`;
}

/* ------------------------------------------------------------ Produk Edukasi Kasisolusi */
export function produkBlock() {
  const d = kbiPage.produk;
  const semua = utm(d.store, 'produk_semua_cta');
  return `
    <div class="shead">
      <div>
        ${eyebrow(d.label)}
        <h2 class="shead__t">${esc(d.title)}</h2>
        <p class="shead__d shead__d--lebar">${esc(d.desc)}</p>
      </div>
      <a class="btn btn--line" href="${esc(semua)}" target="_blank" rel="noopener"${lacak('produk', 'semua', 'cta')}>Lihat Semua di Lynk.id ${icon('external')}<span class="sr"> (tab baru)</span></a>
    </div>
    <div class="pgrid${d.items.length === 5 ? ' pgrid--lima' : ''}">
      ${d.items.map((p) => `
      <article class="pcard rv">
        <span class="pcard__img"><img src="${p.img}" width="600" height="600" alt="Sampul ${esc(p.nama)}" loading="lazy" decoding="async"></span>
        <div class="pcard__body">
          <p class="pcard__type">${esc(p.jenis)}</p>
          <h3 class="pcard__t"><a href="${esc(utm(p.url, `produk_${p.slug}_card`))}" target="_blank" rel="noopener"${lacak('produk', p.slug, 'card')}>${esc(p.nama)}<span class="sr"> (buka di Lynk.id, tab baru)</span></a></h3>
          <span class="pcard__cta">Lihat di Lynk.id ${icon('external')}</span>
        </div>
      </article>`).join('')}
    </div>`;
}

/* ------------------------------------------------------------ Halaman KBI */
export function kbiMain(now) {
  return `
<section class="kb" id="schools">
  <div class="wrap">${schoolsBlock({ h: 'h1' })}</div>
</section>

<section class="kb kb--program" id="program">
  <div class="wrap">${programBlock({ now, h: 'h2' })}</div>
</section>

<section class="kb" id="produk-edukasi">
  <div class="wrap">${produkBlock()}</div>
</section>`;
}

/* ------------------------------------------------------------ Detail kelas Investment */
export function detailMain(d, now, crumbs) {
  const selesai = new Date(d.tutup) < now;
  const inisial = (n) => n.split(/\s+/).filter((w) => /^[A-Z]/.test(w)).slice(0, 2).map((w) => w[0]).join('');
  const checkout = (slug) => utm(d.checkout[slug] || d.checkout.umum, `program_strategi_investasi_2027_${slug}`);
  const daftar = (extra = '') => (selesai
    ? ''
    : `<a class="btn btn--blue${extra}" href="#paket">Daftar Sekarang ${icon('arrow')}</a>`);
  // `video` = daftar { url, judul }. url boleh tautan reel Instagram, atau ID YouTube / tautan
  // lengkapnya (watch, youtu.be, shorts, embed). Entri yang tidak dikenali dilewati.
  const videos = (d.video || []).map((v) => {
    const url = v.url || '';
    const ig = url.match(/instagram\.com\/(?:[\w.]+\/)?(?:reel|p)\/([\w-]+)/);
    if (ig) return { jenis: 'ig', kode: ig[1], judul: v.judul || d.title };
    const yt = /^[\w-]{11}$/.test(url) ? url : (url.match(/(?:v=|youtu\.be\/|shorts\/|embed\/)([\w-]{11})/) || [])[1];
    return yt ? { jenis: 'yt', kode: yt, judul: v.judul || d.title } : null;
  }).filter(Boolean);
  const pemutar = (v) => (v.jenis === 'ig'
    // Tinggi embed reel Instagram = 1,25 x lebar + 208 px (bilah atas dan bawah), diatur di CSS.
    ? `<div class="kd__ig"><iframe src="https://www.instagram.com/reel/${v.kode}/embed/" title="Reel Instagram: ${esc(v.judul)}" loading="lazy" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share" allowfullscreen scrolling="no"></iframe></div>`
    : `<div class="player kd__video" data-yt="${v.kode}" data-yt-title="${esc(v.judul)}" role="button" tabindex="0" aria-label="Putar video: ${esc(v.judul)}">
        <img src="${thumbUrl(v.kode, 'sddefault')}" width="640" height="480" alt="Cuplikan video: ${esc(v.judul)}" loading="lazy" decoding="async">
        <span class="media__play">${icon('play')}</span>
      </div>`);

  return `
<section class="kd-banner" aria-label="Poster kelas">
  <div class="wrap">
    <img src="/assets/kbi/poster-${d.poster}.webp" width="1080" height="1350" alt="${esc(d.posterAlt)}" fetchpriority="high" decoding="async">
  </div>
</section>

<section class="kd">
  <div class="wrap kd__wrap">
    ${crumbs}
    <div class="kd__intro">
      ${eyebrow('Kelas Detail')}
      <p class="kd__school">${esc(d.school)}</p>
      <h1 class="kd__t">${esc(d.title)}</h1>
      <p class="kd__sub">${esc(d.sub)}</p>
      <ul class="kd__chips">
        <li>${icon('k-investment')}Investment School</li>
        <li>${icon('layar')}Offline &amp; Online</li>
        <li>${icon('kalender')}${esc(d.jadwal.tanggal)}</li>
      </ul>
      ${selesai ? '<p class="note">' + icon('info') + '<span>Kelas ini sudah berlangsung. Pendaftaran ditutup.</span></p>' : `<div class="kd__cta">${daftar()}</div>`}
    </div>

    ${d.tentang ? `
    <div class="kd__blok">
      <h2 class="kd__h">Tentang Kelas</h2>
      <p class="kd__lead">${esc(d.tentang.judul)}</p>
      <p class="kd__teks">${esc(d.tentang.isi)}</p>
    </div>` : ''}

    ${videos.length ? `
    <div class="kd__blok">
      <h2 class="kd__h">Tonton Cuplikannya</h2>
      <p class="kd__hd">Cuplikan obrolan Steven Anderson dan Deryansha soal crypto dan investasi.</p>
      <div class="kd__videos${videos.length > 1 ? ' kd__videos--dua' : ''}">
        ${videos.map(pemutar).join('')}
      </div>
    </div>` : ''}

    <div class="kd__blok">
      <h2 class="kd__h">Mentor &amp; Pembicara</h2>
      <ul class="kd__mentor">
        ${d.mentor.map((m) => `<li>${m.foto
          ? `<img class="kd__foto" src="/assets/kbi/mentor-${m.foto}.webp" width="320" height="320" alt="Foto ${esc(m.nama)}" loading="lazy" decoding="async">`
          : `<span class="kd__avatar" aria-hidden="true">${esc(inisial(m.nama))}</span>`}<div><b>${esc(m.nama)}</b><span>${esc(m.peran)}</span>${m.bio ? `<p>${esc(m.bio)}</p>` : ''}</div></li>`).join('')}
      </ul>
    </div>

    ${d.dapat?.length ? `
    <div class="kd__blok">
      <h2 class="kd__h">Apa yang Akan Anda Dapatkan?</h2>
      <ul class="kd__dapat">
        ${d.dapat.map((t) => `<li>${icon('cek')}<span>${esc(t)}</span></li>`).join('')}
      </ul>
    </div>` : ''}

    ${d.topik?.length ? `
    <div class="kd__blok">
      <h2 class="kd__h">Topik yang Akan Dibahas</h2>
      <ol class="kd__topik">
        ${d.topik.map((t, i) => `<li><span class="kd__no" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span><h3>${esc(t.judul)}</h3><p>${esc(t.isi)}</p></li>`).join('')}
      </ol>
    </div>` : ''}

    ${d.cocok ? `
    <div class="kd__blok">
      <h2 class="kd__h">Kelas Ini Cocok untuk Siapa?</h2>
      <p class="kd__teks">${esc(d.cocok.intro)}</p>
      <ul class="kd__cocok">
        ${d.cocok.items.map((c) => `<li><h3>${esc(c.judul)}</h3><p>${esc(c.isi)}</p></li>`).join('')}
      </ul>
      ${d.cocok.catatan ? `<p class="note kd__note">${icon('info')}<span>${esc(d.cocok.catatan)}</span></p>` : ''}
      ${d.prasyarat?.length ? `
      <h3 class="kd__h3">Prasyarat Peserta</h3>
      <dl class="kd__syarat">
        ${d.prasyarat.map((p) => `<div><dt>${esc(p.judul)}</dt><dd>${esc(p.isi)}</dd></div>`).join('')}
      </dl>` : ''}
      ${d.prasyaratTanya ? `<p class="kd__tanya"><b>${esc(d.prasyaratTanya.judul)}</b> ${esc(d.prasyaratTanya.isi)}</p>` : ''}
    </div>` : ''}

    ${d.testimoni?.items?.length ? `
    <div class="kd__blok" id="testimoni">
      <h2 class="kd__h">Testimoni Peserta</h2>
      ${d.testimoni.intro ? `<p class="kd__hd">${esc(d.testimoni.intro)}</p>` : ''}
      <ul class="kd__testi" tabindex="0" aria-label="Testimoni peserta, ${d.testimoni.items.length} cerita">
        ${d.testimoni.items.map((t) => `<li><figure>${t.foto
          ? `<img class="kd__testi-foto" src="/assets/kbi/testimoni-${t.foto}.webp" width="640" height="320" alt="${esc(t.fotoAlt || `Foto ${t.nama}`)}" loading="lazy" decoding="async">`
          : ''}<blockquote><p>${esc(t.kutipan)}</p></blockquote><figcaption><b>${esc(t.nama)}</b>${t.peran ? `<span>${esc(t.peran)}</span>` : ''}</figcaption></figure></li>`).join('')}
      </ul>
      ${d.testimoni.catatan ? `<p class="kd__kecil">${esc(d.testimoni.catatan)}</p>` : ''}
    </div>` : ''}

    <div class="kd__blok kd__blok--kotak">
      <h2 class="kd__h">Jadwal &amp; Lokasi</h2>
      <ul class="kd__jadwal">
        <li>${icon('kalender')}<div><b>${esc(d.jadwal.tanggal)}</b>${d.jadwal.jam ? `<span>${esc(d.jadwal.jam)}</span>` : ''}${d.jadwal.durasi ? `<span>${esc(d.jadwal.durasi)}</span>` : ''}</div></li>
        <li>${icon('lokasi')}<div><b>${esc(d.jadwal.lokasi)}</b><span>${esc(d.jadwal.alamat)}</span></div></li>
        <li>${icon('layar')}<div><b>Online Pass</b><span>${esc(d.jadwal.online)}</span></div></li>
      </ul>
      ${d.jadwal.susunan?.length ? `
      <h3 class="kd__h3">Perkiraan Susunan Kelas</h3>
      <table class="kd__susunan">
        <caption class="sr">Perkiraan susunan kelas ${esc(d.title)}, dapat berubah</caption>
        <thead><tr><th scope="col">Waktu</th><th scope="col">Agenda</th></tr></thead>
        <tbody>
          ${d.jadwal.susunan.map(([w, a]) => `<tr><td>${esc(w)}</td><td>${esc(a)}</td></tr>`).join('')}
        </tbody>
      </table>
      <p class="kd__kecil">Susunan ini masih perkiraan dan dapat berubah.</p>` : ''}
    </div>

    <div class="kd__blok" id="paket">
      <h2 class="kd__h">Paket &amp; Investasi</h2>
      <p class="kd__hd">Pilih paket yang sesuai, lalu lanjutkan ke pendaftaran.</p>
      ${selesai ? '<p class="note">' + icon('info') + '<span>Pendaftaran kelas ini sudah ditutup.</span></p>' : `
      <form class="kd__paket" data-paket novalidate>
        <fieldset>
          <legend class="sr">Pilihan paket ${esc(d.title)}</legend>
          ${d.paket.map((p) => `
          <label class="kd__opsi">
            <input type="radio" name="paket" value="${p.slug}" data-nama="${esc(p.nama)}" data-harga="${esc(p.harga)}" data-url="${esc(checkout(p.slug))}">
            <span class="kd__opsi-isi">
              <span class="kd__opsi-nama">${esc(p.nama)}</span>
              <span class="kd__opsi-harga">${esc(p.harga)}</span>
              ${p.judul ? `<span class="kd__opsi-judul">${esc(p.judul)}</span>` : ''}
              ${p.isi ? `<span class="kd__opsi-ket">${esc(p.isi)}</span>` : ''}
              <span class="kd__opsi-tempat">${icon(p.slug === 'online' ? 'layar' : 'lokasi')}${esc(p.ket)}</span>
              ${p.fasilitas?.length ? `<span class="kd__opsi-fh">Fasilitas</span>
              <span class="kd__opsi-fas" role="list">${p.fasilitas.map((f) => `<span role="listitem">${icon('cek')}${esc(f)}</span>`).join('')}</span>` : ''}
            </span>
          </label>`).join('')}
        </fieldset>
        <p class="kd__galat" role="alert" data-galat hidden>Pilih salah satu paket dulu sebelum melanjutkan.</p>
        <div class="kd__ringkas" data-ringkas hidden aria-live="polite">
          <p class="kd__ringkas-h">Ringkasan pendaftaran</p>
          <dl>
            <div><dt>Kelas</dt><dd>${esc(d.title)}</dd></div>
            <div><dt>Tanggal</dt><dd>${esc(d.jadwal.tanggal)}${d.jadwal.jam ? `, ${esc(d.jadwal.jam)}` : ''}</dd></div>
            <div><dt>Paket</dt><dd data-r-nama></dd></div>
            <div><dt>Harga</dt><dd data-r-harga></dd></div>
          </dl>
        </div>
        <button class="btn btn--blue kd__lanjut" type="submit" data-lacak="program" data-lacak-id="strategi_investasi_2027" data-lacak-target="cta">Lanjut ke Pendaftaran ${icon('external')}<span class="sr"> (tab baru)</span></button>
        <noscript><p class="kd__hd">Pendaftaran dibuka di Lynk.id: ${d.paket.map((p) => `<a href="${esc(checkout(p.slug))}" target="_blank" rel="noopener">${esc(p.nama)}</a>`).join(' atau ')}.</p></noscript>
      </form>`}
    </div>

    ${d.faq?.length ? `
    <div class="kd__blok" id="faq">
      <h2 class="kd__h">Pertanyaan yang Sering Diajukan</h2>
      <div class="kd__faq">
        ${d.faq.map((f) => `<details><summary>${esc(f.t)}${icon('chev')}</summary><p>${esc(f.j)}</p></details>`).join('')}
      </div>
    </div>` : ''}

    <div class="kd__tutup">
      <div>
        <h2 class="kd__h">${selesai ? 'Kelas ini sudah berlangsung' : 'Siap ikut Strategi Investasi 2027?'}</h2>
        <p class="kd__hd">Butuh bantuan pendaftaran? Hubungi contact person Kasisolusi di ${d.kontak.map((k) => `<a href="tel:${k.replace(/[^+\d]/g, '')}">${esc(k)}</a>`).join(' atau ')}.</p>
      </div>
      ${daftar(' kd__tutup-btn')}
    </div>
  </div>
</section>`;
}
