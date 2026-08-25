/* ==========================================================================
   Novapex — shared behaviour. Loaded on every page with `defer`.
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
    // Close on Escape, and on resize back up to desktop.
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
  if (top) {
    top.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

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
     Maloti (M) is the base and is pegged 1:1 to the Rand. USD/EUR/GBP refresh
     from the previous business day's close; the fallbacks below are used if
     that request fails. Any element with [data-m] is converted in place.     */
  var FX  = { M: 1, ZAR: 1, USD: 1 / 18.1, EUR: 1 / 19.6, GBP: 1 / 23.0 };
  var SYM = { M: 'M', ZAR: 'R', USD: '$', EUR: '€', GBP: '£' };
  var STEP = { M: 100, ZAR: 100, USD: 10, EUR: 10, GBP: 10 };
  var cur = 'M';

  function money(maloti, c) {
    c = c || cur;
    var step = STEP[c] || 1;
    var v = Math.round(maloti * FX[c] / step) * step;
    return SYM[c] + v.toLocaleString('en');
  }
  window.npxMoney = money;

  function paint() {
    $$('[data-m]').forEach(function (el) {
      el.textContent = (el.getAttribute('data-pre') || '') + money(parseFloat(el.getAttribute('data-m')));
    });
    $$('.cur-name').forEach(function (el) { el.textContent = cur === 'M' ? 'Maloti' : cur; });
    if (typeof window.npxQuote === 'function') window.npxQuote();
  }

  var curSel = $('#currency');
  if (curSel) {
    var saved = null;
    try { saved = localStorage.getItem('npx-cur'); } catch (e) {}
    if (saved && FX[saved]) { cur = saved; curSel.value = saved; }
    curSel.addEventListener('change', function () {
      cur = curSel.value;
      try { localStorage.setItem('npx-cur', cur); } catch (e) {}
      paint();
    });
  }
  if ($('[data-m]')) {
    paint();
    fetch('https://api.frankfurter.app/latest?base=ZAR&symbols=USD,EUR,GBP')
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d && d.rates) {
          if (d.rates.USD) FX.USD = d.rates.USD;
          if (d.rates.EUR) FX.EUR = d.rates.EUR;
          if (d.rates.GBP) FX.GBP = d.rates.GBP;
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
        return sum + parseFloat(cb.getAttribute('data-m'));
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
    if (send) {
      send.addEventListener('click', function () {
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
})();
