/* ==========================================================================
   Novapex: shared behaviour. Loaded on every page with `defer`.
   Every block guards for its own elements, so one file serves all pages.
   ========================================================================== */
(function () {
  'use strict';
  document.documentElement.classList.add('js');

  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* --- Mobile navigation ------------------------------------------------ */
  var burger = $('#burger'), mnav = $('#mnav');
  if (burger && mnav) {
    burger.addEventListener('click', function () {
      var open = mnav.classList.toggle('open');
      burger.setAttribute('aria-expanded', String(open));
    });
    $$('a', mnav).forEach(function (a) {
      a.addEventListener('click', function () {
        mnav.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
      });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && mnav.classList.contains('open')) {
        mnav.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
        burger.focus();
      }
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth > 900) {
        mnav.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* --- Header hairline + back-to-top ------------------------------------ */
  var nav = $('.nav'), top = $('#top');
  function onScroll() {
    var y = window.pageYOffset || document.documentElement.scrollTop;
    if (nav) nav.classList.toggle('stuck', y > 6);
    if (top) top.classList.toggle('show', y > 700);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  if (top) top.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  /* --- Reveal on scroll -------------------------------------------------- */
  var rv = $$('.rv');
  if (rv.length) {
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
        });
      }, { threshold: .1, rootMargin: '0px 0px -8% 0px' });
      rv.forEach(function (el) { io.observe(el); });
    } else {
      rv.forEach(function (el) { el.classList.add('in'); });
    }
  }

  /* --- Currency ----------------------------------------------------------
     Prices are set in Rand. A first-time visitor sees USD; the choice is then
     remembered. Live rates refresh from the previous business day's close,
     with the fallbacks below used if that request fails. Every element with
     [data-zar] is converted in place.                                       */
  var FX = { ZAR: 1, USD: 1/18.1, GBP: 1/23.0, EUR: 1/19.6,
             AUD: 1/11.9, CAD: 1/13.2, CHF: 1/20.4 };
  var SYM = { ZAR: 'R', USD: '$', GBP: '£', EUR: '€',
              AUD: 'A$', CAD: 'C$', CHF: 'CHF ' };
  var STEP = { ZAR: 100, USD: 10, GBP: 10, EUR: 10, AUD: 10, CAD: 10, CHF: 10 };
  // USD is always what loads. Switching is a deliberate act by the visitor and
  // deliberately does not persist across page loads.
  var cur = 'USD';

  function money(zar, c) {
    c = c || cur;
    var step = STEP[c] || 1;
    var v = Math.round(zar * FX[c] / step) * step;
    return SYM[c] + v.toLocaleString('en');
  }
  window.npxMoney = money;

  function paint() {
    $$('[data-zar]').forEach(function (el) {
      el.textContent = (el.getAttribute('data-pre') || '') +
                       money(parseFloat(el.getAttribute('data-zar')));
    });
    var label = $('#curLabel');
    if (label) label.textContent = cur;
    $$('#curMenu button').forEach(function (b) {
      b.setAttribute('aria-selected', String(b.getAttribute('data-cur') === cur));
    });
    if (typeof window.npxQuote === 'function') window.npxQuote();
  }

  /* Convert control: a button next to the prices that opens a currency list. */
  var curBtn = $('#curBtn'), curMenu = $('#curMenu');
  if (curBtn && curMenu) {
    function closeMenu() {
      curMenu.classList.remove('open');
      curBtn.setAttribute('aria-expanded', 'false');
    }
    curBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = curMenu.classList.toggle('open');
      curBtn.setAttribute('aria-expanded', String(open));
    });
    $$('button', curMenu).forEach(function (b) {
      b.addEventListener('click', function () {
        cur = b.getAttribute('data-cur');
        paint();
        closeMenu();
      });
    });
    document.addEventListener('click', function (e) {
      if (!curBtn.contains(e.target) && !curMenu.contains(e.target)) closeMenu();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeMenu();
    });
  }

  if ($('[data-zar]')) {
    paint();
    fetch('https://api.frankfurter.app/latest?base=ZAR&symbols=USD,GBP,EUR,AUD,CAD,CHF')
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d && d.rates) {
          Object.keys(d.rates).forEach(function (k) { if (FX[k]) FX[k] = d.rates[k]; });
          paint();
        }
      })
      .catch(function () { /* fallbacks already applied */ });
  }

  /* --- Build-your-own quote --------------------------------------------- */
  var calc = $('#calc');
  if (calc) {
    var out   = $('#calc-total', calc);
    var count = $('#calc-count', calc);
    function quote() {
      var picked = $$('.addon:checked', calc);
      var total = picked.reduce(function (sum, cb) {
        return sum + parseFloat(cb.getAttribute('data-zar'));
      }, 0);
      if (out) out.textContent = money(total);
      if (count) {
        count.textContent = picked.length === 0 ? 'Nothing selected yet'
          : picked.length + (picked.length === 1 ? ' service selected' : ' services selected');
      }
    }
    $$('.addon', calc).forEach(function (cb) { cb.addEventListener('change', quote); });
    window.npxQuote = quote;
    quote();

    var send = $('#calc-send', calc);
    if (send) send.addEventListener('click', function () {
      var picked = $$('.addon:checked', calc).map(function (cb) {
        return '- ' + cb.getAttribute('data-label');
      });
      var body = 'Services I am interested in:\n' +
        (picked.length ? picked.join('\n') : '(none selected yet)') +
        '\n\nEstimated monthly investment: ' + (out ? out.textContent : '') +
        '\n\nPlease send a formal quote.';
      window.location.href = 'mailto:hello@novapex.co?subject=' +
        encodeURIComponent('Custom quote request') + '&body=' + encodeURIComponent(body);
    });
  }

  /* --- Blog filtering ---------------------------------------------------- */
  var filters = $$('.chip[data-filter]');
  if (filters.length) {
    var rows  = $$('.post-row');
    var empty = $('#no-posts');
    filters.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var want = btn.getAttribute('data-filter');
        filters.forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
        var shown = 0;
        rows.forEach(function (row) {
          var hit = want === 'all' || row.getAttribute('data-cat') === want;
          row.classList.toggle('hide', !hit);
          if (hit) shown++;
        });
        if (empty) empty.hidden = shown !== 0;
      });
    });
  }

  /* --- Landing-page offer: claim, then a 3-hour window -------------------
     These pages are unlisted, so simply being here means the visitor arrived
     through an ad or a sales message. There is no gate. The discount is stated
     in the copy from the moment they land; the countdown only starts when they
     press "Get my discount", and from then it runs for three hours and
     survives a reload. If a tracking parameter happens to be on the URL it is
     carried into the enquiry so the channel stays attributable.

     State lives in localStorage, so it is per-browser rather than enforced.  */
  var body = document.body;
  if (body && body.classList.contains('landing')) {
    var slug   = body.getAttribute('data-offer');
    var WINDOW = 3 * 60 * 60 * 1000;
    var KEY    = 'npx-offer-' + slug;

    var clocks = $$('.clock-t');
    var timer  = null;

    function readStart() {
      try {
        var v = parseInt(localStorage.getItem(KEY), 10);
        return isNaN(v) ? null : v;
      } catch (e) { return null; }
    }

    function setState(s) { body.setAttribute('data-state', s); }

    function tick(start) {
      var left = start + WINDOW - Date.now();
      if (left <= 0) {
        clocks.forEach(function (c) { c.textContent = '00:00:00'; });
        setState('expired');
        if (timer) clearInterval(timer);
        return;
      }
      var h = Math.floor(left / 3600000);
      var m = Math.floor(left % 3600000 / 60000);
      var sec = Math.floor(left % 60000 / 1000);
      var text = [h, m, sec].map(function (n) {
        return String(n).padStart(2, '0');
      }).join(':');
      clocks.forEach(function (c) { c.textContent = text; });
    }

    function run(start) {
      setState('live');
      tick(start);
      if (timer) clearInterval(timer);
      timer = setInterval(function () { tick(start); }, 1000);
    }

    var started = readStart();
    if (started === null) {
      setState('ready');                       // discount offered, clock not running
    } else if (Date.now() - started < WINDOW) {
      run(started);                            // resume an in-flight window
    } else {
      setState('expired');
    }

    // Any claim button on the page starts the one shared window.
    $$('[data-claim]').forEach(function (el) {
      el.addEventListener('click', function () {
        if (readStart() !== null) return;      // already running, let the link scroll
        var start = Date.now();
        try { localStorage.setItem(KEY, String(start)); } catch (e) {}
        run(start);
      });
    });

    // Attribution: keep whatever the ad appended to the URL.
    var params = new URLSearchParams(window.location.search);
    var ref = params.get('ref') || params.get('src') || params.get('utm_source');
    if (ref) {
      $$('a[href^="mailto:"]').forEach(function (a) {
        a.href += (a.href.indexOf('?') === -1 ? '?' : '&') +
                  'body=' + encodeURIComponent('\n\n[ref: ' + ref + ']');
      });
    }
  }
})();
