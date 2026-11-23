// Uji pola halaman daftar lembaga yang strukturnya berubah 23 Nov 2026 (DJP dan BPJPH pindah ke
// Next.js). Cuplikannya meniru halaman asli hari itu, dipendekkan.
import test from 'node:test';
import assert from 'node:assert/strict';
import { LEMBAGA } from '../lib/sumber-lembaga.mjs';

const sumber = (id) => LEMBAGA.find((s) => s.id === id);
const tautan = (s, html) => [...new Set([...html.matchAll(s.pola)].map((m) => (m[1].startsWith('http') ? m[1] : s.asal + m[1])))];

test('BPJPH: slug daftar berita dibaca dari muatan Next.js, daftar terkait dan menu tidak ikut', () => {
  const s = sumber('bpjph');
  // Muatan self.__next_f: JSON di dalam string JavaScript, jadi tanda kutipnya ber-escape.
  const html = String.raw`<a href="/read/tentang-bpjph">Profil BPJPH</a><script>self.__next_f.push([1,"`
    + String.raw`{\"title\":\"Profil BPJPH\",\"url\":\"/read/tentang-bpjph\"},`
    + String.raw`40:[\"$\",\"$L4f\",null,{\"articles\":[{\"id\":1359,\"attributes\":{\"date\":\"2026-11-23T08:00:00.000Z\",\"publishedAt\":\"2026-11-23T10:24:37.843Z\",`
    + String.raw`\"title\":\"BPJPH Gandeng BSSN Perkuat Keamanan Informasi\",\"description\":null,\"slug\":\"bpjph-gandeng-bssn-perkuat-keamanan-informasi\",\"template\":\"article\",`
    + String.raw`\"cover\":{\"data\":{\"attributes\":{\"related\":[{\"__type\":\"api::article.article\",\"slug\":\"bpjph-gandeng-bssn-perkuat-keamanan-informasi\"}]}}},`
    + String.raw`\"category\":{\"data\":{\"attributes\":{\"articles\":{\"data\":[{\"id\":178,\"attributes\":{\"title\":\"Serahkan Sertifikat Halal Vaksin\",\"description\":null,`
    + String.raw`\"slug\":\"serahkan-sertifikat-halal-vaksin\",\"publishedAt\":\"2023-02-22T00:19:04.449Z\",\"template\":\"article\",\"date\":\"2023-02-22T00:19:04.449Z\"}}]}}}}}},`
    + String.raw`{\"id\":1358,\"attributes\":{\"date\":\"2026-11-21T12:15:00.000Z\",\"publishedAt\":\"2026-11-23T10:19:39.747Z\",`
    + String.raw`\"title\":\"Judul \\\"berkutip\\\": Ekosistem Halal\",\"description\":\"Ringkasan singkat, dengan koma.\",\"slug\":\"judul-berkutip-ekosistem-halal\"}}]}]"])</script>`;
  assert.deepEqual(tautan(s, html), [
    'https://bpjph.halal.go.id/read/bpjph-gandeng-bssn-perkuat-keamanan-informasi',
    'https://bpjph.halal.go.id/read/judul-berkutip-ekosistem-halal',
  ]);
});

test('DJP: daftar siaran pers di alamat baru, tautan kartu tertangkap, tautan ke daftarnya sendiri tidak', () => {
  const s = sumber('djp');
  assert.equal(s.daftar, 'https://pajak.go.id/id/siaran-pers');
  const html = '<a href="/id/siaran-pers">Siaran Pers</a>'
    + '<h2 class="pb-card__title"><a class="pb-card__link" href="/id/siaran-pers/djp-dan-politeknik-kotabaru-jalin-kerja-sama">DJP dan Politeknik Kotabaru</a></h2>'
    + '<a href="/index.php/id/siaran-pers/enam-kanwil-djp-se-jakarta-sosialisasikan-psa-0">Enam Kanwil</a>';
  assert.deepEqual(tautan(s, html), [
    'https://pajak.go.id/id/siaran-pers/djp-dan-politeknik-kotabaru-jalin-kerja-sama',
    'https://pajak.go.id/id/siaran-pers/enam-kanwil-djp-se-jakarta-sosialisasikan-psa-0',
  ]);
});
