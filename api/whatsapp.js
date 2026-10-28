/* WhatsApp bot for +266 5670 2102, on the WhatsApp Business Platform
   (Cloud API, coexistence with the Business app on the phone).

   Meta calls this URL (https://www.novapex.agency/api/whatsapp) for every
   incoming message. The bot answers menu taps, numbers and keywords, sends
   the free PDFs as documents, and emails hello@novapex.agency about every
   lead through the same Apps Script the site forms use.

   When Litsitso replies from the phone, or someone asks for a person, the bot
   goes quiet for that chat for PAUSE_HOURS so it never talks over a real
   conversation. That needs the Upstash Redis store (free) connected in Vercel;
   without it the bot still works, it just cannot pause.

   Environment variables (Vercel > Project > Settings > Environment Variables):
     WA_TOKEN         permanent System User access token
     WA_PHONE_ID      the phone number ID (not the number itself)
     WA_VERIFY_TOKEN  any secret string, also typed into Meta's webhook setup
     WA_APP_SECRET    the Meta app secret, used to check calls really come from Meta
     KV_REST_API_URL, KV_REST_API_TOKEN   set automatically when Upstash is connected */

var crypto = require('crypto');
var R = require('./_replies');

var GRAPH = 'https://graph.facebook.com/' + (process.env.WA_GRAPH_VERSION || 'v23.0');
var FORMS = 'https://script.google.com/macros/s/AKfycbxKbwSz9MtLjW1cN0cC2YfnFmimm4YanmjNI-_xxce6I04zfz774n6O1xrowr6QeJEL/exec';
var PAUSE_HOURS = 12;

module.exports = async function (req, res) {
  // Meta checks the URL once when the webhook is set up.
  if (req.method === 'GET') {
    var q = req.query || {};
    if (q['hub.mode'] === 'subscribe' && q['hub.verify_token'] === process.env.WA_VERIFY_TOKEN) {
      return res.status(200).send(q['hub.challenge']);
    }
    return res.status(403).send('Forbidden');
  }
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');

  var raw = await rawBody(req);
  if (!signedByMeta(raw, req.headers['x-hub-signature-256'])) return res.status(401).send('Bad signature');

  var body;
  try { body = JSON.parse(raw); } catch (e) { return res.status(400).send('Bad JSON'); }

  try {
    var jobs = [];
    (body.entry || []).forEach(function (entry) {
      (entry.changes || []).forEach(function (change) {
        var v = change.value || {};
        // Litsitso replied from the phone: step back from that chat.
        if (change.field === 'smb_message_echoes') {
          (v.message_echoes || []).forEach(function (m) { if (m.to) jobs.push(pause(m.to)); });
          return;
        }
        if (change.field !== 'messages' || !v.messages) return;
        var names = {};
        (v.contacts || []).forEach(function (c) { names[c.wa_id] = c.profile && c.profile.name; });
        v.messages.forEach(function (m) { jobs.push(handle(m, names[m.from])); });
      });
    });
    await Promise.all(jobs);
  } catch (err) {
    console.error('whatsapp bot', err);
  }
  // Always 200, or Meta keeps retrying the same message.
  return res.status(200).send('ok');
};

async function handle(m, name) {
  if (await seen(m.id)) return;
  var who = m.from, first = (name || '').split(' ')[0];

  var choice = null, text = '';
  if (m.type === 'interactive' && m.interactive) {
    var r = m.interactive.list_reply || m.interactive.button_reply || {};
    choice = r.id;
  } else if (m.type === 'button' && m.button) {
    text = m.button.text || '';
  } else if (m.type === 'text' && m.text) {
    text = m.text.body || '';
  } else {
    return; // voice notes, photos, etc. are left for Litsitso
  }

  if (!choice) {
    // A person asked for, or Litsitso is in this chat: stay out of it,
    // unless they ask for the menu again.
    if (await paused(who) && !isMenuRequest(text)) return;
    choice = understand(text);
  }
  if (!choice) return;

  await markRead(m.id);

  if (R.GUIDES[choice]) {
    var g = R.GUIDES[choice];
    await sendWA(who, { type: 'document', document: { link: g.pdf + '?src=wa-bot', filename: g.file, caption: g.caption } });
    await sendWA(who, buttons(R.TEXT.AFTER_GUIDE, R.AFTER_GUIDE_BUTTONS));
    return notify('WhatsApp: free guide sent', who, name, g.title, text);
  }

  switch (choice) {
    case 'MENU':
      return sendWA(who, menu(first));
    case 'TEST':
      return sendWA(who, { type: 'text', text: { body: R.TEXT.TEST, preview_url: true } });
    case 'KIT':
      await sendWA(who, { type: 'text', text: { body: R.TEXT.KIT } });
      return notify('WhatsApp: asked about the Reply Kit', who, name, 'Reply Kit', text);
    case 'DFY':
      await sendWA(who, { type: 'text', text: { body: R.TEXT.DFY } });
      return notify('WhatsApp: asked about Done-For-You', who, name, 'Done-For-You', text);
    case 'PAY':
      await sendWA(who, { type: 'text', text: { body: R.TEXT.PAY } });
      await pause(who);
      return notify('WhatsApp: WANTS TO PAY for the Reply Kit', who, name, 'Send a payment link', text);
    case 'BOOK':
      await sendWA(who, { type: 'text', text: { body: R.TEXT.BOOK } });
      await pause(who);
      return notify('WhatsApp: WANTS A CALL (Done-For-You)', who, name, 'Book a call', text);
    case 'HUMAN':
      await sendWA(who, { type: 'text', text: { body: R.TEXT.HUMAN } });
      await pause(who);
      return notify('WhatsApp: wants to talk to you', who, name, 'Reply personally', text);
    case 'STOP':
      await sendWA(who, { type: 'text', text: { body: R.TEXT.STOP } });
      return notify('WhatsApp: STOP (remove from tips)', who, name, 'Opt out', text);
  }
}

/* --- Understanding what was typed ------------------------------------------
   Short messages ("1", "ghost", "the kit please") are matched on numbers and
   keywords. In a longer message a stray word could mean anything, so only the
   guide code words in capitals (as the site's WhatsApp buttons send them) and
   clear product names count. Anything else is left for Litsitso. */

function clean(s) {
  return ' ' + s.toLowerCase().replace(/[^a-z0-9\s'-]/g, ' ').replace(/\s+/g, ' ').trim() + ' ';
}
function has(t, word) { return t.indexOf(' ' + word + ' ') >= 0; }

function isMenuRequest(text) {
  var t = clean(text);
  return has(t, 'menu') || t.trim() === '0';
}

function understand(text) {
  var t = clean(text), words = t.trim().split(' ').length;

  if (R.STOP_WORDS.some(function (w) { return t.trim() === w; })) return 'STOP';

  var num = t.trim();
  for (var i = 0; i < R.OPTIONS.length; i++) if (R.OPTIONS[i].n === num) return R.OPTIONS[i].id;
  if (num === '0') return 'MENU';

  // Code words in capitals, from the site's prefilled messages.
  var caps = text.match(/\b(GHOST|PRICE|AUDIT|KIT|TEST)\b/);
  if (caps) return caps[1];

  // Clear product names anywhere.
  if (has(t, 'done-for-you') || has(t, 'done for you') || (has(t, 'install') && has(t, '997'))) return 'DFY';
  if (has(t, 'reply kit')) return 'KIT';

  if (words > 6) return null;

  for (var j = 0; j < R.EXTRA.length; j++) {
    if (R.EXTRA[j].words.some(function (w) { return has(t, w); })) return R.EXTRA[j].id;
  }
  for (var k = 0; k < R.OPTIONS.length; k++) {
    if (R.OPTIONS[k].words.some(function (w) { return has(t, w); })) return R.OPTIONS[k].id;
  }
  if (R.MENU_WORDS.some(function (w) { return has(t, w); })) return 'MENU';
  return null;
}

/* --- Messages ------------------------------------------------------------- */

function menu(first) {
  return {
    type: 'interactive',
    interactive: {
      type: 'list',
      body: { text: R.menuIntro(first) },
      footer: { text: 'Novapex Â· novapex.agency' },
      action: {
        button: 'See options',
        sections: [
          { title: 'Free', rows: R.OPTIONS.slice(0, 4).map(row) },
          { title: 'Work with us', rows: R.OPTIONS.slice(4).map(row) }
        ]
      }
    }
  };
}
function row(o) { return { id: o.id, title: o.title.slice(0, 24), description: o.desc.slice(0, 72) }; }

function buttons(text, list) {
  return {
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: text },
      action: { buttons: list.map(function (b) { return { type: 'reply', reply: { id: b.id, title: b.title.slice(0, 20) } }; }) }
    }
  };
}

async function sendWA(to, msg) {
  msg.messaging_product = 'whatsapp';
  msg.recipient_type = 'individual';
  msg.to = to;
  var r = await fetch(GRAPH + '/' + process.env.WA_PHONE_ID + '/messages', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + process.env.WA_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify(msg)
  });
  if (!r.ok) console.error('WhatsApp send failed', r.status, await r.text());
}

async function markRead(id) {
  await fetch(GRAPH + '/' + process.env.WA_PHONE_ID + '/messages', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + process.env.WA_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', status: 'read', message_id: id })
  }).catch(function () {});
}

// Emails hello@novapex.agency through the forms Apps Script.
async function notify(subject, who, name, what, said) {
  var data = new URLSearchParams();
  data.append('_subject', subject);
  data.append('Name', name || '(no name)');
  data.append('WhatsApp', '+' + who);
  data.append('Chat', 'https://wa.me/' + who);
  data.append('Asked for', what);
  if (said) data.append('They typed', said);
  await fetch(FORMS, { method: 'POST', body: data }).catch(function (e) { console.error('notify', e); });
}

/* --- Memory (Upstash Redis, optional) ------------------------------------- */

var KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
var KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

async function kv(cmd) {
  if (!KV_URL || !KV_TOKEN) return undefined;
  try {
    var r = await fetch(KV_URL, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + KV_TOKEN, 'Content-Type': 'application/json' },
      body: JSON.stringify(cmd)
    });
    return (await r.json()).result;
  } catch (e) { return undefined; }
}
function pause(who) { return kv(['SET', 'wa:pause:' + who, '1', 'EX', String(PAUSE_HOURS * 3600)]); }
async function paused(who) { return (await kv(['GET', 'wa:pause:' + who])) === '1'; }
// Meta sometimes delivers the same message twice; answer it once.
// null means the key was already there; undefined means no store or an error.
async function seen(id) { return (await kv(['SET', 'wa:seen:' + id, '1', 'NX', 'EX', '86400'])) === null; }

/* --- Request helpers ------------------------------------------------------ */

function rawBody(req) {
  return new Promise(function (resolve, reject) {
    var chunks = [];
    req.on('data', function (c) { chunks.push(c); });
    req.on('end', function () { resolve(Buffer.concat(chunks).toString('utf8')); });
    req.on('error', reject);
  });
}

function signedByMeta(raw, header) {
  var secret = process.env.WA_APP_SECRET;
  if (!secret || !header) return false;
  var want = 'sha256=' + crypto.createHmac('sha256', secret).update(raw).digest('hex');
  var a = Buffer.from(want), b = Buffer.from(header);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
