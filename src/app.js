/* Kasisolusi - interaksi sisi klien. Vanilla, tanpa dependensi. */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- Baris menu ponsel ----------------
     Di layar sempit menu bisa digeser mendatar; menu halaman yang sedang dibuka digeser ke
     tengah supaya terlihat. Di layar lebar menu muat semua, jadi tidak ada yang berubah. */
  var navUtama = $('.hdr .nav');
  var navAktif = navUtama && $('[aria-current="page"]', navUtama);
  if (navAktif && navUtama.scrollWidth > navUtama.clientWidth + 1) {
    var rn = navUtama.getBoundingClientRect();
    var ra = navAktif.getBoundingClientRect();
    if (ra.left < rn.left || ra.right > rn.right) navUtama.scrollLeft += ra.left - rn.left - (rn.width - ra.width) / 2;
  }

  /* ---------------- Reveal saat scroll ----------------
     Hanya hiasan. Kalau observer tidak pernah jalan, semuanya tetap ditampilkan. */
  var rv = $$('.rv');
  var revealAll = function () { rv.forEach(function (e) { e.classList.add('rv-in'); }); };
  if (reduced || document.hidden || !('IntersectionObserver' in window)) {
    revealAll();
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        var idx = el.parentElement ? Array.prototype.indexOf.call(el.parentElement.children, el) : 0;
        el.style.transitionDelay = Math.min(idx, 5) * 60 + 'ms';
        el.classList.add('rv-in');
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    rv.forEach(function (e) { io.observe(e); });
    setTimeout(revealAll, 2500);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) revealAll(); });
  }

  /* ---------------- Pemutar YouTube (facade) ---------------- */
  $$('[data-yt]').forEach(function (box) {
    var play = function () {
      var id = box.getAttribute('data-yt');
      var f = document.createElement('iframe');
      f.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0&modestbranding=1&hl=id';
      f.title = box.getAttribute('data-yt-title') || 'Pemutar video';
      f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      f.allowFullscreen = true;
      f.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
      box.innerHTML = '';
      box.appendChild(f);
      box.removeAttribute('role');
      box.removeAttribute('tabindex');
      box.style.cursor = 'auto';
    };
    box.addEventListener('click', function () { if (!box.querySelector('iframe')) play(); });
    box.addEventListener('keydown', function (e) {
      if ((e.key === 'Enter' || e.key === ' ') && !box.querySelector('iframe')) { e.preventDefault(); play(); }
    });
  });

  /* ---------------- Progres baca ---------------- */
  var bar = $('.progress');
  var artikel = $('[data-article]');
  if (bar && artikel) {
    var tick = function () {
      var r = artikel.getBoundingClientRect();
      var total = r.height - window.innerHeight;
      var done = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0;
      bar.style.width = (done * 100).toFixed(2) + '%';
    };
    tick();
    window.addEventListener('scroll', tick, { passive: true });
    window.addEventListener('resize', tick);
  }

  /* ---------------- Bagikan ---------------- */
  $$('[data-share]').forEach(function (b) {
    b.addEventListener('click', function () {
      var kind = b.getAttribute('data-share');
      var url = window.location.href;
      var title = document.title;
      if (kind === 'salin') {
        var done = function () {
          var old = b.getAttribute('aria-label');
          b.setAttribute('aria-label', 'Tautan disalin');
          b.setAttribute('data-copied', 'true');
          setTimeout(function () { b.setAttribute('aria-label', old); b.removeAttribute('data-copied'); }, 1800);
        };
        if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, done); else done();
        return;
      }
      var map = {
        wa: 'https://wa.me/?text=' + encodeURIComponent(title + ' ' + url),
        x: 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(title) + '&url=' + encodeURIComponent(url),
      };
      if (map[kind]) window.open(map[kind], '_blank', 'noopener,width=600,height=520');
    });
  });

  /* ---------------- Muat lagi ---------------- */
  $$('[data-more]').forEach(function (btn) {
    var list = $(btn.getAttribute('data-more'));
    var step = parseInt(btn.getAttribute('data-more-step') || '9', 10);
    if (!list) return;
    var hidden = function () { return $$('[data-hidden="true"]', list); };
    var sync = function () {
      var h = hidden();
      if (!h.length) { btn.parentElement.removeChild(btn); return; }
      btn.textContent = 'Muat lagi (' + h.length + ' tersisa)';
    };
    btn.addEventListener('click', function () {
      hidden().slice(0, step).forEach(function (e) {
        e.removeAttribute('data-hidden');
        e.hidden = false;
        $$('.rv', e).forEach(function (x) { x.classList.add('rv-in'); });
      });
      sync();
    });
    sync();
  });

  /* ---------------- Saring kanal ---------------- */
  $$('[data-filter-group]').forEach(function (group) {
    var sel = group.getAttribute('data-filter-group');
    var target = $(sel);
    // Satu halaman bisa punya beberapa filter (Podcast: episode + rangkuman): status dan
    // tombol "Muat lagi" diambil milik grup ini sendiri.
    var next = group.nextElementSibling;
    var status = next && next.hasAttribute('data-filter-status') ? next : $('[data-filter-status]');
    if (!target) return;
    var chips = $$('[data-filter]', group);
    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        var k = chip.getAttribute('data-filter');
        chips.forEach(function (c) { c.setAttribute('aria-pressed', String(c === chip)); });
        var shown = 0;
        $$('[data-kanal]', target).forEach(function (item) {
          var ok = k === 'semua' || item.getAttribute('data-kanal') === k;
          item.hidden = !ok;
          if (ok) { shown++; item.removeAttribute('data-hidden'); $$('.rv', item).forEach(function (x) { x.classList.add('rv-in'); }); }
        });
        var more = $('[data-more="' + sel + '"]');
        if (more) more.hidden = true;
        if (status) {
          var label = (chip.firstChild && chip.firstChild.textContent || chip.textContent).trim();
          status.textContent = shown
            ? 'Menampilkan ' + shown + ' item' + (k === 'semua' ? '' : ' di kanal ' + label) + '.'
            : 'Tidak ada item di kanal ini.';
        }
        var empty = $('[data-empty]', target.parentElement || document);
        if (empty) empty.hidden = shown !== 0;
      });
    });
  });

  /* ---------------- Pencarian ---------------- */
  var input = $('[data-search-input]');
  if (input) {
    var results = $('[data-search-results]');
    var countEl = $('[data-search-count]');
    var idx = null;
    var norm = function (s) { return (s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim(); };
    var escHtml = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

    var render = function (q) {
      if (!idx) return;
      var nq = norm(q);
      var terms = nq ? nq.split(' ') : [];
      var hits = !terms.length ? [] : idx
        .map(function (it) {
          var score = 0;
          for (var i = 0; i < terms.length; i++) {
            var p = it.h.indexOf(terms[i]);
            if (p === -1) return null;
            score += p < 60 ? 3 : 1;
          }
          return { it: it, score: score };
        })
        .filter(Boolean)
        .sort(function (a, b) { return b.score - a.score; })
        .slice(0, 40)
        .map(function (x) { return x.it; });

      if (countEl) countEl.textContent = !nq ? 'Ketik kata kunci untuk mulai mencari.' : hits.length + ' hasil untuk "' + q + '".';
      results.innerHTML = hits.map(function (it) {
        return '<article class="srow">' +
          '<span class="media"><img src="' + (it.g || 'https://i.ytimg.com/vi/' + it.v + '/mqdefault.jpg') + '" width="320" height="180" alt="" loading="lazy" decoding="async"></span>' +
          '<div><span class="kanal" style="--k:' + it.c + '">' + escHtml(it.k) + '</span>' +
          '<h3 class="srow__t"><a href="' + it.u + '">' + escHtml(it.t) + '</a></h3>' +
          '<div class="meta" style="margin-top:.35rem"><span>' + escHtml(it.d) + '</span><span>' + escHtml(it.y) + '</span></div></div></article>';
      }).join('');
    };

    var debounce;
    var onInput = function () {
      clearTimeout(debounce);
      var q = input.value;
      debounce = setTimeout(function () {
        render(q);
        var u = new URL(window.location.href);
        if (q) u.searchParams.set('q', q); else u.searchParams.delete('q');
        history.replaceState(null, '', u);
      }, 140);
    };

    fetch('/search-index.json')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        idx = data;
        var q = new URL(window.location.href).searchParams.get('q');
        if (q) { input.value = q; render(q); }
        else if (countEl) countEl.textContent = 'Ketik kata kunci untuk mulai mencari.';
      })
      .catch(function () { if (countEl) countEl.textContent = 'Pencarian sedang tidak tersedia. Coba muat ulang halaman.'; });

    input.addEventListener('input', onInput);
    var form = input.closest('form');
    if (form) form.addEventListener('submit', function (e) { e.preventDefault(); onInput(); });
  }

  /* ---------------- KBI: event klik keluar (tracker task 43) ---------------- */
  // Satu klik pada satu tautan = satu event. Dikirim ke dataLayer (GTM/GA4) dan gtag bila ada.
  function lacak(el, url) {
    var data = {
      event: 'outbound_click',
      section: el.getAttribute('data-lacak'),
      item_id: el.getAttribute('data-lacak-id'),
      click_target: el.getAttribute('data-lacak-target'),
      destination_url: url
    };
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(data);
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'outbound_click', {
        section: data.section, item_id: data.item_id, click_target: data.click_target, destination_url: url
      });
    }
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[data-lacak]');
    if (a && a.href) lacak(a, a.href);
  });

  /* ---------------- KBI: pendaftaran ditutup otomatis setelah batasnya lewat ---------------- */
  // Halaman ini statis, jadi kartu program memeriksa sendiri tanggal tutupnya (tracker task 31).
  $$('[data-tutup]').forEach(function (kartu) {
    var batas = Date.parse(kartu.getAttribute('data-tutup'));
    if (!batas || Date.now() < batas) return;
    var badge = $('[data-badge]', kartu);
    if (badge) { badge.hidden = false; badge.textContent = 'Pendaftaran Ditutup'; badge.className = 'pgm__badge pgm__badge--tutup'; }
    var poster = $('a[data-poster]', kartu);
    if (poster) { poster.removeAttribute('href'); poster.removeAttribute('target'); poster.removeAttribute('data-lacak'); }
    var cta = $('[data-cta]', kartu);
    if (cta) cta.innerHTML = '<p class="pgm__tutup">Pendaftaran program ini sudah ditutup.</p>';
    var catatan = $('[data-catatan]', kartu);
    if (catatan) catatan.hidden = true;
  });

  /* ---------------- KBI: klik poster Mini MBA mengarah ke pilihan format ---------------- */
  $$('a[data-poster][href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var t = document.getElementById(a.getAttribute('href').slice(1));
      if (!t) return;
      e.preventDefault();
      t.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
      t.classList.remove('is-sorot');
      void t.offsetWidth;
      t.classList.add('is-sorot');
      var b = $('a', t);
      if (b) b.focus({ preventScroll: true });
    });
  });

  /* ---------------- Detail kelas: pilih paket, ringkasan, lalu ke pendaftaran ---------------- */
  var paket = $('[data-paket]');
  if (paket) {
    var galat = $('[data-galat]', paket);
    var ringkas = $('[data-ringkas]', paket);
    var pilihan = function () { return $('input[name="paket"]:checked', paket); };
    $$('input[name="paket"]', paket).forEach(function (r) {
      r.addEventListener('change', function () {
        galat.hidden = true;
        $('[data-r-nama]', ringkas).textContent = r.getAttribute('data-nama');
        $('[data-r-harga]', ringkas).textContent = r.getAttribute('data-harga');
        ringkas.hidden = false;
      });
    });
    paket.addEventListener('submit', function (e) {
      e.preventDefault();
      var p = pilihan();
      if (!p) {
        galat.hidden = false;
        var pertama = $('input[name="paket"]', paket);
        if (pertama) pertama.focus();
        return;
      }
      var url = p.getAttribute('data-url');
      lacak($('.kd__lanjut', paket), url);
      window.open(url, '_blank', 'noopener');
    });
  }

  /* ---------------- Header menyingkir saat menggulir turun ---------------- */
  var hdr = $('.hdr');
  if (hdr) {
    var lastY = window.scrollY;
    var queued = false;
    window.addEventListener('scroll', function () {
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () {
        queued = false;
        var y = window.scrollY;
        var dy = y - lastY;
        if (y < 140 || dy < -4) hdr.setAttribute('data-hidden', 'false');
        else if (dy > 6 && y > 320) hdr.setAttribute('data-hidden', 'true');
        lastY = y;
      });
    }, { passive: true });
  }
})();
