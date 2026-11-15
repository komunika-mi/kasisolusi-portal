// Head / SEO / JSON-LD generation. Kept separate from layout so the tag set can be
// audited on its own.
import { site } from '../data/site.mjs';

export const esc = (s = '') =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const abs = (path = '/') =>
  path.startsWith('http') ? path : site.origin + (path.startsWith('/') ? path : `/${path}`);

/**
 * @param {{title:string,description:string,path:string,image?:string,type?:string,
 *          publishedTime?:string,modifiedTime?:string,section?:string,noindex?:boolean,
 *          jsonld?:object[]}} p
 */
/** Potong di batas kata supaya tidak terpotong di tengah kata pada hasil pencarian. */
export function ringkas(s = '', max = 158) {
  const t = String(s).trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const sp = cut.lastIndexOf(' ');
  return `${(sp > max * 0.6 ? cut.slice(0, sp) : cut).replace(/[.,;:\s]+$/, '')}...`;
}

export function head(p) {
  const url = abs(p.path);
  const image = abs(p.image || site.defaultImage);
  const type = p.type || 'website';
  // Judul berita sudah panjang. Imbuhan nama situs hanya dipakai kalau masih muat.
  const fullTitle =
    p.path === '/' || p.title.length > 52 ? p.title : `${p.title} | ${site.name}`;
  const metaDesc = ringkas(p.description, 158);

  const graph = [...(p.jsonld || [])];

  return `
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>${esc(fullTitle)}</title>
  <meta name="description" content="${esc(metaDesc)}">
  <link rel="canonical" href="${esc(url)}">
  ${p.noindex ? '<meta name="robots" content="noindex, follow">' : '<meta name="robots" content="index, follow, max-image-preview:large">'}
  <meta name="theme-color" content="${site.themeColor}">
  <meta name="author" content="${esc(site.name)}">

  <meta property="og:site_name" content="${esc(site.name)}">
  <meta property="og:locale" content="id_ID">
  <meta property="og:type" content="${esc(type)}">
  <meta property="og:title" content="${esc(fullTitle)}">
  <meta property="og:description" content="${esc(p.description)}">
  <meta property="og:url" content="${esc(url)}">
  <meta property="og:image" content="${esc(image)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${esc(p.title)}">
  ${p.publishedTime ? `<meta property="article:published_time" content="${esc(p.publishedTime)}">` : ''}
  ${p.modifiedTime ? `<meta property="article:modified_time" content="${esc(p.modifiedTime)}">` : ''}
  ${p.section ? `<meta property="article:section" content="${esc(p.section)}">` : ''}

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(fullTitle)}">
  <meta name="twitter:description" content="${esc(ringkas(p.description, 200))}">
  <meta name="twitter:image" content="${esc(image)}">
  ${site.twitter ? `<meta name="twitter:site" content="${esc(site.twitter)}">` : ''}

  <link rel="icon" href="/assets/icon.png" sizes="any">
  <link rel="apple-touch-icon" href="/assets/icon.png">
  <link rel="alternate" type="application/rss+xml" title="${esc(site.name)}" href="/rss.xml">

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="preconnect" href="https://i.ytimg.com">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400..800&family=Caveat:wght@600&display=swap">
  <link rel="stylesheet" href="/styles.css">

  <script type="application/ld+json">${JSON.stringify(graph.length === 1 ? graph[0] : { '@context': 'https://schema.org', '@graph': graph.map(stripCtx) })}</script>`;
}

const stripCtx = (o) => {
  const { '@context': _c, ...rest } = o;
  return rest;
};

export const orgLd = () => ({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${site.origin}/#organization`,
  name: site.legalName,
  alternateName: site.name,
  url: site.origin,
  logo: { '@type': 'ImageObject', url: abs('/assets/icon-512.png'), width: 512, height: 512 },
  image: abs('/assets/og-default.png'),
  description: site.description,
  sameAs: site.social.map((s) => s.url),
});

export const websiteLd = () => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${site.origin}/#website`,
  url: site.origin,
  name: site.name,
  description: site.description,
  inLanguage: 'id-ID',
  publisher: { '@id': `${site.origin}/#organization` },
  potentialAction: {
    '@type': 'SearchAction',
    target: { '@type': 'EntryPoint', urlTemplate: `${site.origin}/cari?q={search_term_string}` },
    'query-input': 'required name=search_term_string',
  },
});

export const breadcrumbLd = (items) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((it, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: it.name,
    item: abs(it.path),
  })),
});

export const podcastSeriesLd = (program) => ({
  '@context': 'https://schema.org',
  '@type': 'PodcastSeries',
  '@id': `${site.origin}/program/${program.slug}#series`,
  name: program.name,
  description: program.description,
  url: abs(`/program/${program.slug}`),
  inLanguage: 'id-ID',
  webFeed: abs('/rss.xml'),
  publisher: { '@id': `${site.origin}/#organization` },
});

export const podcastEpisodeLd = (ep, program) => ({
  '@context': 'https://schema.org',
  '@type': 'PodcastEpisode',
  url: abs(`/podcast/${ep.slug}`),
  name: ep.title,
  description: ep.dek,
  datePublished: ep.date,
  timeRequired: ep.duration ? `PT${ep.duration.replace(':', 'M').replace(/$/, 'S')}` : undefined,
  associatedMedia: {
    '@type': 'VideoObject',
    name: ep.title,
    description: ep.dek,
    thumbnailUrl: `https://i.ytimg.com/vi/${ep.youtubeId}/maxresdefault.jpg`,
    uploadDate: ep.date,
    embedUrl: `https://www.youtube.com/embed/${ep.youtubeId}`,
  },
  partOfSeries: program
    ? { '@type': 'PodcastSeries', name: program.name, url: abs(`/program/${program.slug}`) }
    : undefined,
  inLanguage: 'id-ID',
});

export const newsArticleLd = (a) => ({
  '@context': 'https://schema.org',
  '@type': 'NewsArticle',
  headline: a.title,
  description: a.dek,
  image: [abs(a.image)],
  datePublished: a.date,
  dateModified: a.date,
  articleSection: a.category,
  inLanguage: 'id-ID',
  mainEntityOfPage: { '@type': 'WebPage', '@id': abs(`/berita/${a.slug}`) },
  author: { '@type': 'Organization', name: site.name, url: site.origin },
  publisher: { '@id': `${site.origin}/#organization` },
});
