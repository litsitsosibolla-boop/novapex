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
  var cur = 'USD';
  try {
    var saved = localStorage.getItem('npx-cur');
    if (saved && FX[saved]) cur = saved;
  } catch (e) {}

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
    if (typeof window.npxOffer === 'function') window.npxOffer();
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
        try { localStorage.setItem('npx-cur', cur); } catch (e) {}
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

  /* --- Landing-page offer: 3-hour window, and the access gate ------------
     These pages are only meant to be reached through a tracked ad or sales
     link. Arriving with a tracking parameter opens (or resumes) a 3-hour
     discounted window. Arriving without one, having previously held a window,
     means the visitor came back by some other route, so the offer is closed.

     This is a client-side gate: it shapes the experience, it is not security.
     Anyone who clears site data or re-uses the original link gets back in.
     Enforcing it properly would need the offer issued and checked server-side. */
  var body = document.body;
  if (body && body.classList.contains('landing')) {
    var slug     = body.getAttribute('data-offer');
    var tier     = parseFloat(body.getAttribute('data-tier'));
    var pct      = parseFloat(body.getAttribute('data-discount')) || 15;
    var WINDOW   = 3 * 60 * 60 * 1000;
    var KEY      = 'npx-offer-' + slug;
    var TRACKERS = ['ref', 'src', 'utm_source', 'utm_campaign', 'fbclid', 'gclid'];

    var params  = new URLSearchParams(window.location.search);
    var tracked = TRACKERS.some(function (k) { return params.has(k); });

    function read() {
      try { return JSON.parse(localStorage.getItem(KEY) || 'null'); }
      catch (e) { return null; }
    }
    function write(v) {
      try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {}
    }

    var state = read();
    var now   = Date.now();

    if (tracked) {
      // Arrived through a real ad or sales link. Start or resume the window.
      if (!state || state.closed || now - state.start > WINDOW) {
        state = { start: now, closed: false,
                  ref: params.get('ref') || params.get('src') ||
                       params.get('utm_source') || 'direct' };
        write(state);
      }
    } else if (state && !state.closed) {
      // Came back without their link. Close the window for good.
      state.closed = true;
      write(state);
    }

    var live    = !!state && !state.closed && (now - state.start) < WINDOW;
    var offerEl = $('#offer');

    if (offerEl) {
      offerEl.setAttribute('data-state', live ? 'live' : (state ? 'closed' : 'gated'));
    }

    var clock = $('#offer-clock');
    var full  = $('#offer-full');
    var now_  = $('#offer-now');

    function renderPrices() {
      var discounted = Math.round(tier * (100 - pct) / 100);
      if (full) full.textContent = money(tier);
      if (now_) now_.textContent = money(discounted);
    }
    window.npxOffer = renderPrices;
    renderPrices();

    if (live && clock) {
      var tick = function () {
        var left = state.start + WINDOW - Date.now();
        if (left <= 0) {
          clock.textContent = '00:00:00';
          if (offerEl) offerEl.setAttribute('data-state', 'closed');
          clearInterval(timer);
          return;
        }
        var h = Math.floor(left / 3600000);
        var m = Math.floor(left % 3600000 / 60000);
        var s = Math.floor(left % 60000 / 1000);
        clock.textContent = [h, m, s].map(function (n) {
          return String(n).padStart(2, '0');
        }).join(':');
      };
      tick();
      var timer = setInterval(tick, 1000);
    }

    // Carry the tracking source into the enquiry so the channel is attributable.
    if (state && state.ref) {
      $$('a[href^="mailto:"]').forEach(function (a) {
        a.href += (a.href.indexOf('?') === -1 ? '?' : '&') +
                  'body=' + encodeURIComponent('\n\n[ref: ' + state.ref + ']');
      });
    }
  }
})();
