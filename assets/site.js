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
     Prices are set in US dollars and every visitor starts on USD, so the
     published price never moves. Other currencies are shown only when a
     visitor asks, converted at the previous business day's close, with the
     fallbacks below used if that request fails. [data-usd] is the source of
     truth. [data-zar] remains only for old internal quote pages. */
  var FX = { USD: 1, ZAR: 18.1, GBP: 0.787, EUR: 0.923,
             AUD: 1.52, CAD: 1.37, CHF: 0.887 };
  var SYM = { ZAR: 'R', USD: '$', GBP: '£', EUR: '€',
              AUD: 'A$', CAD: 'C$', CHF: 'CHF ' };
  var STEP = { ZAR: 100, USD: 1, GBP: 10, EUR: 10, AUD: 10, CAD: 10, CHF: 10 };
  // USD is always what loads. Switching is a deliberate act by the visitor and
  // deliberately does not persist across page loads.
  var cur = 'USD';

  function money(usd, c) {
    c = c || cur;
    var step = STEP[c] || 1;
    var v = Math.round(usd * FX[c] / step) * step;
    return SYM[c] + v.toLocaleString('en');
  }
  window.npxMoney = money;

  function paint() {
    $$('[data-usd]').forEach(function (el) {
      el.textContent = (el.getAttribute('data-pre') || '') +
                       money(parseFloat(el.getAttribute('data-usd')));
    });
    $$('[data-zar]').forEach(function (el) {
      el.textContent = (el.getAttribute('data-pre') || '') +
                       money(parseFloat(el.getAttribute('data-zar')) / FX.ZAR);
    });
    $$('.convert-cur').forEach(function (el) { el.textContent = cur; });
    $$('.convert-menu button').forEach(function (b) {
      b.setAttribute('aria-selected', String(b.getAttribute('data-cur') === cur));
    });
    if (typeof window.npxQuote === 'function') window.npxQuote();
  }

  /* Convert controls: a button next to the prices that opens a currency list.
     A page may carry more than one, because the price appears in more than one
     place, so they are wired as a set rather than by id. Switching in any one
     of them repaints every price and every other control on the page. */
  var controls = $$('.convert');
  if (controls.length) {
    var closeMenus = function () {
      controls.forEach(function (c) {
        var m = $('.convert-menu', c), b = $('.convert-btn', c);
        if (m) m.classList.remove('open');
        if (b) b.setAttribute('aria-expanded', 'false');
      });
    };
    controls.forEach(function (c) {
      var btn = $('.convert-btn', c), menu = $('.convert-menu', c);
      if (!btn || !menu) return;
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var open = !menu.classList.contains('open');
        closeMenus();
        menu.classList.toggle('open', open);
        btn.setAttribute('aria-expanded', String(open));
      });
      $$('button', menu).forEach(function (b) {
        b.addEventListener('click', function () {
          cur = b.getAttribute('data-cur');
          paint();
          closeMenus();
        });
      });
    });
    document.addEventListener('click', function (e) {
      var t = e.target;
      if (!(t && t.closest && t.closest('.convert'))) closeMenus();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeMenus();
    });
  }

  if ($('[data-usd]') || $('[data-zar]')) {
    paint();
    fetch('https://api.frankfurter.app/latest?base=USD&symbols=ZAR,GBP,EUR,AUD,CAD,CHF')
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
        return sum + parseFloat(cb.getAttribute('data-zar')) / FX.ZAR;
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
      window.location.href = 'mailto:hello@novapex.agency?subject=' +
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

  /* --- Quote pages: the one legitimate countdown ------------------------
     Counts down to QUOTE.expires, an absolute timestamp written into the page,
     rather than to a window opened on arrival. A refresh therefore cannot buy
     more time. The same deadline is printed as text beside the clock, so the
     page still states it plainly if this never runs. */
  var qState = document.getElementById('quote-state');
  if (qState && typeof QUOTE !== 'undefined' && QUOTE.expires) {
    var qClock = document.getElementById('quote-clock');
    var expiry = new Date(QUOTE.expires).getTime();

    var qTick = function () {
      var left = expiry - Date.now();
      if (isNaN(expiry)) { return; }
      if (left <= 0) {
        qState.setAttribute('data-state', 'expired');
        if (qClock) qClock.textContent = '00:00:00';
        clearInterval(qTimer);
        return;
      }
      qState.setAttribute('data-state', 'live');
      if (qClock) {
        var d = Math.floor(left / 86400000);
        var h = Math.floor(left % 86400000 / 3600000);
        var m = Math.floor(left % 3600000 / 60000);
        var s = Math.floor(left % 60000 / 1000);
        var pad = function (n) { return String(n).padStart(2, '0'); };
        qClock.textContent = (d > 0 ? d + 'd ' : '') + pad(h) + ':' + pad(m) + ':' + pad(s);
      }
    };
    qTick();
    var qTimer = setInterval(qTick, 1000);
  }


  /* --- Forms -------------------------------------------------------------
     The site is static, so there is nowhere to POST. Each form is read on
     submit, turned into a readable message and handed to the visitor's mail
     client. Nothing is lost, and there is no third party in the path. To move
     to a real endpoint later, post `pairs` instead of opening the mailto. */
  var MAIL = 'hello@novapex.agency';

  /* Each request form opens as a complete, ready-to-send email: a greeting, one
     line saying what they want, their answers laid out cleanly, and a sign-off.
     The visitor only has to press send. */
  var INTROS = {
    'leak-call': 'I would like to book a 20-minute Leak Call. Our details are below. Please send two or three times that suit you.',
    'one-move':  'I would like a One-Move Strategy. Our situation is below.',
    'contact':   'I have a question for Novapex. The details are below.'
  };

  $$('[data-form-subject]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;
      var lines = [];
      var sender = '';
      $$('input, select, textarea', form).forEach(function (el) {
        if (!el.name || !el.value) return;
        if (el.name === 'name') sender = el.value;
        var lab = $('label[for="' + el.id + '"]', form);
        var name = lab ? lab.textContent.replace(/\s*(required|optional)\s*$/i, '').trim()
                       : el.name;
        lines.push(el.tagName === 'TEXTAREA'
          ? name + '\n' + el.value
          : name + ': ' + el.value);
      });
      var intro = INTROS[form.id] || 'The details are below.';
      var body = 'Hi Novapex,\n\n' + intro + '\n\n' + lines.join('\n\n') +
                 '\n\nRegards\n' + (sender || '[Your name]');
      window.location.href = 'mailto:' + MAIL +
        '?subject=' + encodeURIComponent(form.getAttribute('data-form-subject')) +
        '&body=' + encodeURIComponent(body);
    });
  });

  /* Reserve the Map. Opens a ready-typed reservation email with placeholders.
     From the Leak Test result screen, the visitor's score and weakest stages
     are written in for them, so we know where to start before the first reply. */
  $$('[data-map-reserve]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      var test = '';
      if (link.hasAttribute('data-from-test')) {
        var n = $('#score-n'), of = $('#score-of'), band = $('#score-band');
        var weak = $$('#weak-list .weak-item h4').map(function (h) { return h.textContent.trim(); });
        test = '\nMY LEAK TEST RESULT\n' +
          'Score: ' + (n ? n.textContent.trim() : '') + ' ' + (of ? of.textContent.trim() : '') +
          (band && band.textContent.trim() ? ' (' + band.textContent.trim() + ')' : '') + '\n' +
          (weak.length ? 'Weakest stages: ' + weak.join(' and ') + '\n' : '');
      }
      var body =
        'Hi Novapex,\n\n' +
        'I would like to reserve a Revenue Leak Map for [Company name].\n' +
        test +
        '\nABOUT US\n' +
        'Company: [Company name]\n' +
        'Website: [Website]\n' +
        'My name and role: [Your name, your role]\n' +
        'Best number to reach me: [Phone or WhatsApp]\n\n' +
        'OUR INQUIRIES\n' +
        'Roughly how many inquiries we get a month: [Number, or "we do not track it"]\n' +
        'Roughly what share become paying customers: [Percentage, or "we do not know"]\n' +
        'Where most of them come from: [For example: search, referrals, social, walk-ins]\n' +
        'Who answers them today: [For example: a receptionist, a shared inbox, the sales team]\n\n' +
        'WHY NOW\n' +
        '[The specific thing that made us look at this]\n\n' +
        'I understand the Map is a fixed fee of $140, takes two weeks and about three hours of our team\'s time in total, and is refunded in full if it finds no quantified leak.\n\n' +
        'Regards\n[Your name]';
      window.location.href = 'mailto:' + MAIL +
        '?subject=' + encodeURIComponent('Reserving a Revenue Leak Map') +
        '&body=' + encodeURIComponent(body);
    });
  });

  /* Newsletter. Same mechanism, one field, and the form is replaced by a line
     of text so the visitor knows the click did something. */
  $$('[data-signup]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;
      var email = $('input', form).value;
      window.location.href = 'mailto:' + MAIL +
        '?subject=' + encodeURIComponent('Subscribe: The Visibility Brief') +
        '&body=' + encodeURIComponent('Please add this address to the Brief:\n' + email);
      var done = document.createElement('p');
      done.className = 'signup-said';
      done.textContent = 'Your mail app is opening. Send it and you are on the list.';
      form.replaceWith(done);
    });
  });

  /* --- The Leak Test -----------------------------------------------------
     Twelve questions, each scored 0 to 3, grouped into four stages of the
     system. The total places the company in a band; the two lowest-scoring
     stages are named back with what they typically cost. All of it runs here,
     because a scored assessment that needs a server is a scored assessment
     nobody finishes. */
  var test = $('#leak-test');
  if (test && typeof LEAK_TEST !== 'undefined') {
    var answers = {};
    var qs = $$('.qcard', test);

    var progress = function () {
      var n = Object.keys(answers).length;
      var el = $('#test-progress');
      if (el) el.textContent = n + ' of ' + qs.length + ' answered';
      var btn = $('#test-submit');
      if (btn) btn.disabled = n < qs.length;
    };

    $$('.qopt input', test).forEach(function (radio) {
      radio.addEventListener('change', function () {
        answers[radio.name] = parseInt(radio.value, 10);
        $$('.qopt', radio.closest('.qopts')).forEach(function (o) {
          o.classList.toggle('picked', $('input', o).checked);
        });
        progress();
      });
    });
    progress();

    var submit = $('#test-submit');
    if (submit) submit.addEventListener('click', function () {
      var total = 0, stage = {};
      LEAK_TEST.questions.forEach(function (q) {
        var v = answers[q.id] || 0;
        total += v;
        stage[q.stage] = (stage[q.stage] || 0) + v;
      });
      var max = LEAK_TEST.questions.length * 3;

      var band = LEAK_TEST.bands.filter(function (b) { return total >= b.min; })[0];
      var perStage = {};
      LEAK_TEST.questions.forEach(function (q) {
        perStage[q.stage] = (perStage[q.stage] || 0) + 3;
      });
      var ranked = Object.keys(stage).map(function (k) {
        return { key: k, pct: stage[k] / perStage[k] };
      }).sort(function (a, b) { return a.pct - b.pct; });
      // A stage at full marks is not a weak stage, and four stages sitting at the
      // same score have no weakest among them. Naming two anyway would be the
      // kind of false precision this whole test exists to argue against.
      var spread  = ranked[ranked.length - 1].pct - ranked[0].pct;
      var weakest = spread === 0 ? [] : ranked.filter(function (w) { return w.pct < 1; })
                                              .slice(0, 2);

      $('#score-n').textContent = total;
      $('#score-of').textContent = 'out of ' + max;
      $('#score-band').textContent = band.label;
      $('#score-read').textContent = band.read;
      $('#score-fill').style.width = Math.round(total / max * 100) + '%';

      var weakHead = $('#weak-head');
      if (weakest.length) {
        if (weakHead) weakHead.textContent = weakest.length === 1
          ? 'Your weakest stage' : 'Your two weakest stages';
        $('#weak-list').innerHTML = weakest.map(function (w) {
          var s = LEAK_TEST.stages[w.key];
          return '<div class="weak-item"><h4>' + s.name + '</h4><p>' + s.problem +
                 '</p><p class="weak-cost">' + s.cost + '</p></div>';
        }).join('');
      } else {
        if (weakHead) weakHead.textContent = 'No single weak stage';
        $('#weak-list').innerHTML = '<div class="weak-item"><p>All four stages scored ' +
          'the same, so there is no weakest one to name. Read that as a system that ' +
          'is consistent rather than one that is fine: consistency at a low score ' +
          'means every stage needs the same work.</p></div>';
      }

      // Hide the whole section, not just the list inside it: an emptied section
      // keeps its vertical padding and leaves a dead band above the result.
      var qWrap = $('#test-questions');
      if (qWrap) (qWrap.closest('section') || qWrap).hidden = true;
      var res = $('#test-result');
      res.hidden = false;
      res.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
