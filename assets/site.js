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

  /* --- Reveal on scroll --------------------------------------------------
     Threshold 0, not a percentage: a long article is one .rv block many
     screens tall, and 10% of it can never be on screen at once, so a ratio
     threshold would leave it invisible for good. The bottom margin still
     holds each reveal until the element is a little way into view. */
  var rv = $$('.rv');
  if (rv.length) {
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
        });
      }, { threshold: 0, rootMargin: '0px 0px -8% 0px' });
      rv.forEach(function (el) { io.observe(el); });
    } else {
      rv.forEach(function (el) { el.classList.add('in'); });
    }
  }

  /* --- Prices ------------------------------------------------------------
     Every price on the site is in US dollars, and only US dollars. There is
     no converter: buyers who can afford the offer read dollars fine, and one
     number is easier to decide on than seven. [data-usd] is still painted so
     a price can be changed from one attribute. [data-zar] remains only for
     old internal quote pages, converted at a fixed rate. */
  var ZAR_PER_USD = 18.1;
  function money(usd) { return '$' + Math.round(usd).toLocaleString('en'); }
  window.npxMoney = money;
  var FX = { ZAR: ZAR_PER_USD };

  $$('[data-usd]').forEach(function (el) {
    el.textContent = (el.getAttribute('data-pre') || '') +
                     money(parseFloat(el.getAttribute('data-usd')));
  });
  $$('[data-zar]').forEach(function (el) {
    el.textContent = (el.getAttribute('data-pre') || '') +
                     money(parseFloat(el.getAttribute('data-zar')) / ZAR_PER_USD);
  });

  /* --- Checkout ----------------------------------------------------------
     The one place the buy link lives. Paste the checkout URL from the
     payment platform into CHECKOUT.kit and every "Buy" button on the site
     goes straight to it. Until then, buttons go to /checkout, which takes
     the order and emails it to us so a payment link can be sent by hand.
     ?src= on the page URL (set in every PDF and DM link) is passed through,
     so sales can be traced back to the freebie that produced them. */
  var CHECKOUT = {
    kit: '',      // e.g. https://novapex.gumroad.com/l/reply-kit
    install: ''   // optional: a checkout for the $997 Done-For-You
  };
  var WA = '26656702102';
  var WA_TEXT = {
    kit: 'Hi Novapex, I want the Reply Kit ($197). How do I pay?',
    install: 'Hi Novapex, I want the Done-For-You Install ($997). What happens next?'
  };
  window.npxWA = function (text) {
    return 'https://wa.me/' + WA + '?text=' + encodeURIComponent(text);
  };
  var src = (location.search.match(/[?&]src=([\w-]+)/) || [])[1] || '';
  $$('[data-buy]').forEach(function (a) {
    var what = a.getAttribute('data-buy');
    var url = CHECKOUT[what];
    if (url) {
      a.href = url + (src ? (url.indexOf('?') < 0 ? '?' : '&') + 'src=' + src : '');
    } else {
      a.href = '/checkout?item=' + what + (src ? '&src=' + src : '');
    }
    a.addEventListener('click', function () {
      if (typeof gtag === 'function') gtag('event', 'begin_checkout', { item: what, src: src });
    });
  });

  /* Freebies: each one is requested by keyword on WhatsApp, the same word
     used as the comment keyword on Instagram, so one DM automation can
     answer both. */
  $$('[data-free]').forEach(function (a) {
    a.href = window.npxWA(a.getAttribute('data-free'));
    a.target = '_blank'; a.rel = 'noopener';
  });

  /* Sticky buy bar: shown once the hero's buy button has scrolled away. */
  var bar = $('.buybar'), heroBuy = $('[data-buy-hero]');
  if (bar && heroBuy && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      bar.classList.toggle('show', !es[0].isIntersecting && es[0].boundingClientRect.top < 0);
    }).observe(heroBuy);
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

  /* Forms post to a Google Apps Script web app, which emails the answers to
     MAIL straight away. If the post fails, the old ready-written email opens
     instead, so nothing is lost. */
  var ENDPOINT = 'https://script.google.com/macros/s/AKfycbxKbwSz9MtLjW1cN0cC2YfnFmimm4YanmjNI-_xxce6I04zfz774n6O1xrowr6QeJEL/exec';

  var send = function (subject, pairs) {
    var data = new URLSearchParams();
    data.append('_subject', subject);
    pairs.forEach(function (pr) { data.append(pr[0], pr[1]); });
    return fetch(ENDPOINT, { method: 'POST', mode: 'no-cors', body: data });
  };

  var said = function (form, text) {
    var done = document.createElement('p');
    done.className = 'signup-said';
    done.setAttribute('role', 'status');
    done.textContent = text;
    form.replaceWith(done);
  };

  $$('[data-form-subject]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;
      var pairs = [], lines = [], sender = '';
      $$('input, select, textarea', form).forEach(function (el) {
        if (!el.name || !el.value) return;
        if (el.name === 'name') sender = el.value;
        var lab = $('label[for="' + el.id + '"]', form);
        var name = lab ? lab.textContent.replace(/\s*(required|optional)\s*$/i, '').trim()
                       : el.name;
        pairs.push([el.name === 'email' ? 'email' : name, el.value]);
        lines.push(el.tagName === 'TEXTAREA' ? name + '\n' + el.value : name + ': ' + el.value);
      });
      var subject = form.getAttribute('data-form-subject');
      var btn = $('button[type="submit"]', form);
      if (btn) { btn.disabled = true; btn.firstChild.textContent = 'Sending'; }
      send(subject, pairs).then(function () {
        said(form, 'Received. We will reply to ' + (sender ? sender.split(' ')[0] : 'you') +
          ' within a working day.');
      }).catch(function () {
        var intro = INTROS[form.id] || 'The details are below.';
        var body = 'Hi Novapex,\n\n' + intro + '\n\n' + lines.join('\n\n') +
                   '\n\nRegards\n' + (sender || '[Your name]');
        window.location.href = 'mailto:' + MAIL + '?subject=' + encodeURIComponent(subject) +
          '&body=' + encodeURIComponent(body);
        if (btn) { btn.disabled = false; btn.firstChild.textContent = 'Try again'; }
      });
    });
  });

  /* Book the Done-For-You Install. Opens a ready-typed reservation email with placeholders.
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
        'I would like the Done-For-You Install for [Company name].\n' +
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
        'I understand the Done-For-You Install is a fixed fee of $997: a Leak Map of our inquiry flow, then the Reply System written for our business and installed in our WhatsApp and Instagram within 14 days, refunded in full if the Map finds no quantified leak.\n\n' +
        'Regards\n[Your name]';
      window.location.href = 'mailto:' + MAIL +
        '?subject=' + encodeURIComponent('Booking the Done-For-You Install') +
        '&body=' + encodeURIComponent(body);
    });
  });

  /* Newsletter. Same mechanism, one field. */
  $$('[data-signup]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;
      var email = $('input', form).value;
      send('Subscribe: The Visibility Brief', [['email', email]]).then(function () {
        said(form, 'You are on the list. The next letter comes to ' + email + '.');
      }).catch(function () {
        window.location.href = 'mailto:' + MAIL +
          '?subject=' + encodeURIComponent('Subscribe: The Visibility Brief') +
          '&body=' + encodeURIComponent('Please add this address to the Brief:\n' + email);
      });
    });
  });

  /* --- Checkout page -----------------------------------------------------
     Used until a payment platform is connected. It takes the order (never
     card details), emails it to us through the same endpoint as every other
     form, and tells the buyer a secure payment link is on its way. If the
     post fails, the order opens as a ready-typed WhatsApp message instead. */
  var coForm = $('#checkout-form');
  if (coForm) {
    var ITEMS = {
      kit: {
        name: 'The Reply Kit', price: 197, sub: 'Digital download · instant access',
        list: ['40 First-Reply Scripts', 'The Price-Reply Formula', 'The 3-Touch Revival Sequence',
               '60-Minute WhatsApp Business Setup', 'The Inquiry Tracker', 'Bonus: Comment-to-DM Funnel'],
        guar: 'If the Kit doesn’t bring back at least one quiet chat in 30 days, you get the full $197 back.',
        after: 'Once it’s paid, your download arrives straight away.'
      },
      install: {
        name: 'Done-For-You Install', price: 997, sub: 'Live within 14 days · includes the Kit',
        list: ['A Leak Map of your inquiry flow', 'Scripts rewritten in your voice', 'Installed in your WhatsApp and Instagram',
               'Comment-to-DM automation on one post', '30 days of WhatsApp support', 'Everything in the Reply Kit'],
        guar: 'If the Leak Map finds no leak worth fixing, we stop there and refund the full $997.',
        after: 'Once it’s paid, we book your 45-minute kickoff call.'
      }
    };
    var itemKey = (location.search.match(/[?&]item=(\w+)/) || [])[1];
    var item = ITEMS[itemKey] || ITEMS.kit;
    if (!ITEMS[itemKey]) itemKey = 'kit';

    $$('[data-co="name"]').forEach(function (el) { el.textContent = item.name; });
    $$('[data-co="price"]').forEach(function (el) { el.textContent = money(item.price); });
    $$('[data-co="sub"]').forEach(function (el) { el.textContent = item.sub; });
    $$('[data-co="guar"]').forEach(function (el) { el.textContent = item.guar; });
    $$('[data-co="list"]').forEach(function (el) {
      el.innerHTML = '';
      item.list.forEach(function (t) { var li = document.createElement('li'); li.textContent = t; el.appendChild(li); });
    });
    document.title = 'Checkout: ' + item.name + ' | Novapex';
    if (typeof gtag === 'function') gtag('event', 'view_checkout', { item: itemKey, src: src });

    var coErr = $('#co-error'), coBtn = $('#co-submit');
    var showErr = function (msg) { coErr.textContent = msg; coErr.hidden = !msg; };

    coForm.addEventListener('submit', function (e) {
      e.preventDefault();
      showErr('');
      var bad = null;
      $$('input[required]', coForm).forEach(function (el) {
        var ok = el.type === 'checkbox' ? el.checked : el.checkValidity() && el.value.trim() !== '';
        el.setAttribute('aria-invalid', String(!ok));
        if (!ok && !bad) bad = el;
      });
      if (bad) {
        showErr(bad.type === 'checkbox' ? 'Please tick the box to confirm.' :
                bad.type === 'email' ? 'Please enter a valid email address.' : 'Please fill in the highlighted fields.');
        bad.focus();
        return;
      }
      var v = function (n) { var el = coForm.elements[n]; return el ? (el.value || '').trim() : ''; };
      var pay = ($('input[name="payment"]:checked', coForm) || {}).value || '';
      var order = 'NPX-' + Date.now().toString(36).toUpperCase().slice(-6);
      var pairs = [
        ['Order', order], ['Product', item.name], ['Price', money(item.price) + ' USD'],
        ['name', v('name')], ['email', v('email')], ['WhatsApp', v('whatsapp')],
        ['Business', v('business')], ['Country', v('country')], ['Payment method', pay],
        ['Source', src || 'direct']
      ];
      coBtn.disabled = true;
      $('.co-btn-label', coBtn).textContent = 'Placing your order…';

      var waText = 'Hi Novapex, I’ve just ordered ' + item.name + ' (' + money(item.price) +
        '). Order ' + order + '. Name: ' + v('name') + '. Email: ' + v('email') +
        '. I’d like to pay by ' + pay + '.';

      var done = function () {
        if (typeof gtag === 'function') gtag('event', 'generate_lead', { item: itemKey, value: item.price, currency: 'USD', src: src });
        $('#co-first').textContent = v('name').split(' ')[0] || 'friend';
        $('#co-sent-email').textContent = v('email');
        var after = $('#co-done .lead');
        if (after) after.lastChild.textContent = ' and your WhatsApp now. ' + item.after;
        $('#co-wa-now').href = window.npxWA(waText);
        coForm.hidden = true;
        $$('.co-steps li').forEach(function (li, i) { li.className = i < 2 ? 'done' : i === 2 ? 'now' : ''; });
        var d = $('#co-done'); d.hidden = false; d.focus();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      };

      send('ORDER ' + order + ': ' + item.name + ' (' + money(item.price) + ')', pairs)
        .then(done)
        .catch(function () {
          // The order could not be sent from the page: hand it to WhatsApp
          // so it is never lost.
          done();
          window.open(window.npxWA(waText), '_blank', 'noopener');
        });
    });
  }

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
