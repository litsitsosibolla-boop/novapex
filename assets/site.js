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

  /* WhatsApp tips sign-up. A country-code picker sits beside the number. It
     starts on the visitor's country, read from the device's time zone (then
     its language region), and remembers a manual change. */
  var COUNTRIES = ('AF|Afghanistan|93;AX|Aland Islands|358;AL|Albania|355;DZ|Algeria|213;AS|American Samoa|1;' +
    'AD|Andorra|376;AO|Angola|244;AI|Anguilla|1;AG|Antigua and Barbuda|1;AR|Argentina|54;AM|Armenia|374;' +
    'AW|Aruba|297;AU|Australia|61;AT|Austria|43;AZ|Azerbaijan|994;BS|Bahamas|1;BH|Bahrain|973;' +
    'BD|Bangladesh|880;BB|Barbados|1;BY|Belarus|375;BE|Belgium|32;BZ|Belize|501;BJ|Benin|229;BM|Bermuda|1;' +
    'BT|Bhutan|975;BO|Bolivia|591;BA|Bosnia and Herzegovina|387;BW|Botswana|267;BR|Brazil|55;' +
    'IO|British Indian Ocean Territory|246;VG|British Virgin Islands|1;BN|Brunei|673;BG|Bulgaria|359;' +
    'BF|Burkina Faso|226;BI|Burundi|257;CV|Cabo Verde|238;KH|Cambodia|855;CM|Cameroon|237;CA|Canada|1;' +
    'BQ|Caribbean Netherlands|599;KY|Cayman Islands|1;CF|Central African Republic|236;TD|Chad|235;' +
    'CL|Chile|56;CN|China|86;CO|Colombia|57;KM|Comoros|269;CG|Congo|242;CD|Congo (DRC)|243;' +
    'CK|Cook Islands|682;CR|Costa Rica|506;CI|Cote d\'Ivoire|225;HR|Croatia|385;CU|Cuba|53;CW|Curacao|599;' +
    'CY|Cyprus|357;CZ|Czechia|420;DK|Denmark|45;DJ|Djibouti|253;DM|Dominica|1;DO|Dominican Republic|1;' +
    'EC|Ecuador|593;EG|Egypt|20;SV|El Salvador|503;GQ|Equatorial Guinea|240;ER|Eritrea|291;EE|Estonia|372;' +
    'SZ|Eswatini|268;ET|Ethiopia|251;FK|Falkland Islands|500;FO|Faroe Islands|298;FJ|Fiji|679;' +
    'FI|Finland|358;FR|France|33;GF|French Guiana|594;PF|French Polynesia|689;GA|Gabon|241;GM|Gambia|220;' +
    'GE|Georgia|995;DE|Germany|49;GH|Ghana|233;GI|Gibraltar|350;GR|Greece|30;GL|Greenland|299;' +
    'GD|Grenada|1;GP|Guadeloupe|590;GU|Guam|1;GT|Guatemala|502;GG|Guernsey|44;GN|Guinea|224;' +
    'GW|Guinea-Bissau|245;GY|Guyana|592;HT|Haiti|509;HN|Honduras|504;HK|Hong Kong|852;HU|Hungary|36;' +
    'IS|Iceland|354;IN|India|91;ID|Indonesia|62;IR|Iran|98;IQ|Iraq|964;IE|Ireland|353;IM|Isle of Man|44;' +
    'IL|Israel|972;IT|Italy|39;JM|Jamaica|1;JP|Japan|81;JE|Jersey|44;JO|Jordan|962;KZ|Kazakhstan|7;' +
    'KE|Kenya|254;KI|Kiribati|686;XK|Kosovo|383;KW|Kuwait|965;KG|Kyrgyzstan|996;LA|Laos|856;LV|Latvia|371;' +
    'LB|Lebanon|961;LS|Lesotho|266;LR|Liberia|231;LY|Libya|218;LI|Liechtenstein|423;LT|Lithuania|370;' +
    'LU|Luxembourg|352;MO|Macao|853;MG|Madagascar|261;MW|Malawi|265;MY|Malaysia|60;MV|Maldives|960;' +
    'ML|Mali|223;MT|Malta|356;MH|Marshall Islands|692;MQ|Martinique|596;MR|Mauritania|222;MU|Mauritius|230;' +
    'YT|Mayotte|262;MX|Mexico|52;FM|Micronesia|691;MD|Moldova|373;MC|Monaco|377;MN|Mongolia|976;' +
    'ME|Montenegro|382;MS|Montserrat|1;MA|Morocco|212;MZ|Mozambique|258;MM|Myanmar|95;NA|Namibia|264;' +
    'NR|Nauru|674;NP|Nepal|977;NL|Netherlands|31;NC|New Caledonia|687;NZ|New Zealand|64;NI|Nicaragua|505;' +
    'NE|Niger|227;NG|Nigeria|234;NU|Niue|683;NF|Norfolk Island|672;KP|North Korea|850;' +
    'MK|North Macedonia|389;MP|Northern Mariana Islands|1;NO|Norway|47;OM|Oman|968;PK|Pakistan|92;' +
    'PW|Palau|680;PS|Palestine|970;PA|Panama|507;PG|Papua New Guinea|675;PY|Paraguay|595;PE|Peru|51;' +
    'PH|Philippines|63;PL|Poland|48;PT|Portugal|351;PR|Puerto Rico|1;QA|Qatar|974;RE|Reunion|262;' +
    'RO|Romania|40;RU|Russia|7;RW|Rwanda|250;BL|Saint Barthelemy|590;SH|Saint Helena|290;' +
    'KN|Saint Kitts and Nevis|1;LC|Saint Lucia|1;MF|Saint Martin|590;PM|Saint Pierre and Miquelon|508;' +
    'VC|Saint Vincent and the Grenadines|1;WS|Samoa|685;SM|San Marino|378;ST|Sao Tome and Principe|239;' +
    'SA|Saudi Arabia|966;SN|Senegal|221;RS|Serbia|381;SC|Seychelles|248;SL|Sierra Leone|232;' +
    'SG|Singapore|65;SX|Sint Maarten|1;SK|Slovakia|421;SI|Slovenia|386;SB|Solomon Islands|677;' +
    'SO|Somalia|252;ZA|South Africa|27;KR|South Korea|82;SS|South Sudan|211;ES|Spain|34;LK|Sri Lanka|94;' +
    'SD|Sudan|249;SR|Suriname|597;SJ|Svalbard|47;SE|Sweden|46;CH|Switzerland|41;SY|Syria|963;' +
    'TW|Taiwan|886;TJ|Tajikistan|992;TZ|Tanzania|255;TH|Thailand|66;TL|Timor-Leste|670;TG|Togo|228;' +
    'TK|Tokelau|690;TO|Tonga|676;TT|Trinidad and Tobago|1;TN|Tunisia|216;TR|Turkiye|90;' +
    'TM|Turkmenistan|993;TC|Turks and Caicos Islands|1;TV|Tuvalu|688;UG|Uganda|256;UA|Ukraine|380;' +
    'AE|United Arab Emirates|971;GB|United Kingdom|44;US|United States|1;VI|US Virgin Islands|1;' +
    'UY|Uruguay|598;UZ|Uzbekistan|998;VU|Vanuatu|678;VA|Vatican City|39;VE|Venezuela|58;VN|Vietnam|84;' +
    'WF|Wallis and Futuna|681;EH|Western Sahara|212;YE|Yemen|967;ZM|Zambia|260;ZW|Zimbabwe|263')
    .split(';').map(function (r) { r = r.split('|'); return { iso: r[0], name: r[1], dial: r[2] }; });
  var BY_ISO = {};
  COUNTRIES.forEach(function (c) { BY_ISO[c.iso] = c; });
  var NEAR = ['ZA', 'LS', 'BW', 'NA', 'SZ', 'ZW', 'MZ', 'ZM', 'MW'];
  var TZ = {
    'Africa/Johannesburg': 'ZA', 'Africa/Maseru': 'LS', 'Africa/Gaborone': 'BW', 'Africa/Windhoek': 'NA',
    'Africa/Mbabane': 'SZ', 'Africa/Harare': 'ZW', 'Africa/Maputo': 'MZ', 'Africa/Lusaka': 'ZM',
    'Africa/Blantyre': 'MW', 'Africa/Lubumbashi': 'CD', 'Africa/Kinshasa': 'CD', 'Africa/Luanda': 'AO',
    'Africa/Nairobi': 'KE', 'Africa/Kampala': 'UG', 'Africa/Dar_es_Salaam': 'TZ', 'Africa/Kigali': 'RW',
    'Africa/Bujumbura': 'BI', 'Africa/Addis_Ababa': 'ET', 'Africa/Lagos': 'NG', 'Africa/Accra': 'GH',
    'Africa/Cairo': 'EG', 'Africa/Casablanca': 'MA', 'Africa/El_Aaiun': 'EH', 'Africa/Algiers': 'DZ',
    'Africa/Tunis': 'TN', 'Africa/Tripoli': 'LY', 'Africa/Khartoum': 'SD', 'Africa/Juba': 'SS',
    'Africa/Mogadishu': 'SO', 'Africa/Djibouti': 'DJ', 'Africa/Asmara': 'ER', 'Africa/Dakar': 'SN',
    'Africa/Abidjan': 'CI', 'Africa/Bamako': 'ML', 'Africa/Ouagadougou': 'BF', 'Africa/Niamey': 'NE',
    'Africa/Ndjamena': 'TD', 'Africa/Douala': 'CM', 'Africa/Libreville': 'GA', 'Africa/Brazzaville': 'CG',
    'Africa/Bangui': 'CF', 'Africa/Malabo': 'GQ', 'Africa/Sao_Tome': 'ST', 'Africa/Lome': 'TG',
    'Africa/Porto-Novo': 'BJ', 'Africa/Monrovia': 'LR', 'Africa/Freetown': 'SL', 'Africa/Conakry': 'GN',
    'Africa/Bissau': 'GW', 'Africa/Banjul': 'GM', 'Africa/Nouakchott': 'MR', 'Atlantic/Cape_Verde': 'CV',
    'Indian/Mauritius': 'MU', 'Indian/Antananarivo': 'MG', 'Indian/Mahe': 'SC', 'Indian/Comoro': 'KM',
    'Indian/Reunion': 'RE', 'Indian/Mayotte': 'YT',
    'Europe/London': 'GB', 'Europe/Dublin': 'IE', 'Europe/Paris': 'FR', 'Europe/Berlin': 'DE',
    'Europe/Amsterdam': 'NL', 'Europe/Brussels': 'BE', 'Europe/Madrid': 'ES', 'Europe/Lisbon': 'PT',
    'Europe/Rome': 'IT', 'Europe/Zurich': 'CH', 'Europe/Vienna': 'AT', 'Europe/Stockholm': 'SE',
    'Europe/Oslo': 'NO', 'Europe/Copenhagen': 'DK', 'Europe/Helsinki': 'FI', 'Europe/Warsaw': 'PL',
    'Europe/Athens': 'GR', 'Europe/Istanbul': 'TR', 'Europe/Moscow': 'RU', 'Europe/Kiev': 'UA',
    'Europe/Kyiv': 'UA', 'Asia/Dubai': 'AE', 'Asia/Riyadh': 'SA', 'Asia/Qatar': 'QA', 'Asia/Kolkata': 'IN',
    'Asia/Calcutta': 'IN', 'Asia/Karachi': 'PK', 'Asia/Dhaka': 'BD', 'Asia/Shanghai': 'CN',
    'Asia/Hong_Kong': 'HK', 'Asia/Singapore': 'SG', 'Asia/Tokyo': 'JP', 'Asia/Seoul': 'KR',
    'Asia/Manila': 'PH', 'Asia/Jakarta': 'ID', 'Asia/Bangkok': 'TH', 'Asia/Kuala_Lumpur': 'MY',
    'Asia/Jerusalem': 'IL', 'Australia/Sydney': 'AU', 'Australia/Melbourne': 'AU', 'Australia/Brisbane': 'AU',
    'Australia/Perth': 'AU', 'Australia/Adelaide': 'AU', 'Pacific/Auckland': 'NZ',
    'America/New_York': 'US', 'America/Chicago': 'US', 'America/Denver': 'US', 'America/Los_Angeles': 'US',
    'America/Phoenix': 'US', 'America/Anchorage': 'US', 'Pacific/Honolulu': 'US', 'America/Toronto': 'CA',
    'America/Vancouver': 'CA', 'America/Edmonton': 'CA', 'America/Winnipeg': 'CA', 'America/Halifax': 'CA',
    'America/Mexico_City': 'MX', 'America/Sao_Paulo': 'BR', 'America/Argentina/Buenos_Aires': 'AR',
    'America/Bogota': 'CO', 'America/Lima': 'PE', 'America/Santiago': 'CL', 'America/Jamaica': 'JM'
  };
  var guessCountry = function () {
    try { var saved = localStorage.getItem('npx-cc'); if (BY_ISO[saved]) return saved; } catch (err) {}
    var tz = '';
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (err) {}
    if (TZ[tz]) return TZ[tz];
    var langs = navigator.languages || [navigator.language || ''];
    for (var i = 0; i < langs.length; i++) {
      var m = /-([a-z]{2})$/i.exec(langs[i] || '');
      if (m && BY_ISO[m[1].toUpperCase()]) return m[1].toUpperCase();
    }
    return 'ZA';
  };
  var ccOption = function (c) {
    return '<option value="' + c.iso + '">' + c.name.replace(/&/g, '&amp;') + ' +' + c.dial + '</option>';
  };
  var ccOptions = '<optgroup label="Southern Africa">' +
    NEAR.map(function (iso) { return ccOption(BY_ISO[iso]); }).join('') +
    '</optgroup><optgroup label="All countries">' + COUNTRIES.map(ccOption).join('') + '</optgroup>';
  var homeCC = guessCountry();

  /* Wires one picker and number box. read() returns the country, the full
     number and whether it looks real. A number typed with its own +code (or
     00) is taken as it is; otherwise the leading 0 goes and the picked code
     goes in front. */
  var phoneField = function (scope) {
    var sel = $('[data-cc]', scope), show = $('[data-cc-show]', scope), num = $('input[type="tel"]', scope);
    sel.innerHTML = ccOptions;
    var paint = function () {
      var c = BY_ISO[sel.value] || BY_ISO.ZA;
      show.textContent = c.iso + ' +' + c.dial;
    };
    sel.value = homeCC; paint();
    sel.addEventListener('change', function () {
      paint();
      try { localStorage.setItem('npx-cc', sel.value); } catch (err) {}
    });
    num.addEventListener('input', function () { num.setCustomValidity(''); });
    return {
      input: num,
      read: function () {
        var c = BY_ISO[sel.value] || BY_ISO.ZA;
        var raw = num.value.trim(), digits = raw.replace(/\D/g, ''), full, ok;
        if (raw.charAt(0) === '+' || raw.indexOf('00') === 0) {
          full = '+' + digits.replace(/^00/, '');
          ok = full.length >= 9 && full.length <= 16;
        } else {
          var local = digits.replace(/^0+/, '');
          full = '+' + c.dial + local;
          ok = local.length >= 6 && full.length <= 16;
        }
        num.setCustomValidity(ok ? '' : 'Enter your WhatsApp number, without the country code.');
        return { country: c, full: full, ok: ok };
      }
    };
  };
  var SAVE_US = 'Save +266 5670 2102 in your contacts as Novapex so the tips reach you.';

  $$('[data-wa-signup]').forEach(function (form) {
    var phone = phoneField(form);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var p = phone.read();
      if (!form.reportValidity()) return;
      var btn = $('button[type="submit"]', form);
      if (btn) { btn.disabled = true; btn.textContent = 'Joining'; }
      var done = function () { said(form, 'You are in. ' + SAVE_US); };
      send('WhatsApp tips: join', [
        ['WhatsApp', p.full], ['Country', p.country.name], ['Page', location.pathname]
      ]).then(done, done);
      if (typeof gtag === 'function') gtag('event', 'sign_up', { method: 'whatsapp', src: src });
    });
  });

  /* Free guides by email. The form posts the address and the guide's key to
     the forms endpoint, which emails the guide (attached, plus a link) to the
     visitor and copies us. A tick box adds them to WhatsApp tips as well. The
     visitor also gets a direct link on screen, in case the email is slow or
     lands in spam. */
  var GUIDES = {
    GHOST: { title: 'The 5 Replies That Bring Ghosted Leads Back', pdf: '/free/ghost.pdf' },
    PRICE: { title: 'How to Answer "How Much?" Without Losing the Sale', pdf: '/free/price.pdf' },
    AUDIT: { title: 'The 10-Minute WhatsApp Business Audit', pdf: '/free/audit.pdf' }
  };
  $$('[data-free-email]').forEach(function (form) {
    var opt = $('[data-wa-opt]', form), extra = $('[data-wa-extra]', form);
    var phone = extra ? phoneField(extra) : null;
    if (opt && extra) {
      opt.addEventListener('change', function () {
        extra.hidden = !opt.checked;
        phone.input.required = opt.checked;
        if (opt.checked) phone.input.focus();
        else phone.input.setCustomValidity('');
      });
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var wants = opt && opt.checked, p = wants ? phone.read() : null;
      if (!form.reportValidity()) return;
      var key = form.getAttribute('data-free-email'), guide = GUIDES[key];
      var email = $('input[type="email"]', form).value.trim();
      var btn = $('button[type="submit"]', form);
      if (btn) { btn.disabled = true; btn.firstChild.textContent = 'Sending'; }
      var done = function () {
        var box = document.createElement('div');
        box.className = 'free-sent';
        box.setAttribute('role', 'status');
        box.innerHTML = '<b>Sent. Check your inbox.</b>It is on its way to <span></span>. ' +
          'Not there in a few minutes? Check spam, or <a class="link" target="_blank" rel="noopener">open it here</a>.' +
          (wants ? ' <em></em>' : '');
        $('span', box).textContent = email;
        $('a', box).href = guide.pdf;
        if (wants) $('em', box).textContent = SAVE_US;
        form.replaceWith(box);
      };
      var pairs = [['email', email], ['Guide', guide.title], ['Source', src || 'direct'], ['_free', key]];
      if (wants) pairs.push(['WhatsApp tips', p.full], ['Country', p.country.name]);
      send('Free guide: ' + guide.title + (wants ? ' + WhatsApp tips' : ''), pairs).then(done, done);
      if (typeof gtag === 'function') {
        gtag('event', 'generate_lead', { item: 'free-' + key.toLowerCase(), src: src });
        if (wants) gtag('event', 'sign_up', { method: 'whatsapp', src: src });
      }
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
