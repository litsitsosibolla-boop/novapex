/* ==========================================================================
   Novapex: shared behaviour. Loaded on every page with `defer`.
   Every block guards for its own elements, so one file serves all pages.
   ========================================================================== */
(function () {
  'use strict';
  document.documentElement.classList.add('js');

  /* --- Capacity ----------------------------------------------------------
     The one place seat availability is set. Edit `remaining` as seats fill and
     every landing page follows: at 0 they all switch to the full state. */
  var NOVAPEX_SEATS = { quarter: "Q4 2026", remaining: 1, total: 2,
                        nextQuarter: "Q1 2027" };

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
    var partnerNote = $('#calc-partner');
    function quote() {
      var picked  = $$('.addon:checked', calc);
      // Partner-delivered items are scoped on the call, so they are counted in
      // the selection but never priced into the running total.
      var priced  = picked.filter(function (cb) { return !cb.classList.contains('partner'); });
      var partner = picked.length - priced.length;
      var total   = priced.reduce(function (sum, cb) {
        return sum + parseFloat(cb.getAttribute('data-zar'));
      }, 0);
      if (out) out.textContent = money(total);
      if (count) {
        count.textContent = picked.length === 0 ? 'Nothing selected yet'
          : picked.length + (picked.length === 1 ? ' service selected' : ' services selected');
      }
      if (partnerNote) partnerNote.hidden = partner === 0;
    }
    $$('.addon', calc).forEach(function (cb) { cb.addEventListener('change', quote); });
    window.npxQuote = quote;
    quote();

    var send = $('#calc-send', calc);
    if (send) send.addEventListener('click', function () {
      var all     = $$('.addon:checked', calc);
      var priced  = all.filter(function (cb) { return !cb.classList.contains('partner'); })
                       .map(function (cb) { return '- ' + cb.getAttribute('data-label'); });
      var partner = all.filter(function (cb) { return cb.classList.contains('partner'); })
                       .map(function (cb) { return '- ' + cb.getAttribute('data-label'); });
      var body = 'Core systems I am interested in:\n' +
        (priced.length ? priced.join('\n') : '(none selected yet)') +
        '\n\nEstimated monthly investment: ' + (out ? out.textContent : '') +
        (partner.length
          ? '\n\nPartner-delivered, to be scoped and quoted separately:\n' + partner.join('\n')
          : '') +
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

  /* --- Landing pages: seat availability ---------------------------------
     No timers here. The scarcity is the seat count, which is a standing fact
     rather than something that starts when a visitor arrives, so nothing to
     reset on refresh. */
  var body = document.body;
  if (body && body.classList.contains('landing')) {
    var S = NOVAPEX_SEATS;
    var WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five'];
    var word = function (n) { return WORDS[n] || String(n); };

    body.setAttribute('data-seats', S.remaining > 0 ? 'open' : 'full');

    var fill = {
      remaining: String(S.remaining),
      quarter: S.quarter,
      next: S.nextQuarter,
      'total-word': word(S.total).toLowerCase(),
      'remaining-phrase': S.remaining === 1
        ? 'One seat remains'
        : word(S.remaining) + ' seats remain'
    };
    Object.keys(fill).forEach(function (k) {
      $$('[data-seat="' + k + '"]').forEach(function (el) {
        el.textContent = fill[k];
      });
    });
  }
})();
