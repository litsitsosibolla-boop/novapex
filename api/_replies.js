/* Everything the WhatsApp bot says lives here, so the wording can change
   without touching how the bot works. Files starting with _ in /api are not
   served as pages.

   Each option can be reached three ways: tapping it in the menu, typing its
   number, or typing any of its words. */

var SITE = 'https://www.novapex.agency';

var GUIDES = {
  GHOST: {
    title: 'The 5 Replies That Bring Ghosted Leads Back',
    pdf: SITE + '/free/ghost.pdf',
    file: 'Novapex - Ghosted Leads.pdf',
    caption: 'Here it is: The 5 Replies That Bring Ghosted Leads Back.\n\n' +
      'Open the chat that went quiet most recently and send reply #1 today.'
  },
  PRICE: {
    title: 'How to Answer "How Much?" Without Losing the Sale',
    pdf: SITE + '/free/price.pdf',
    file: 'Novapex - How Much.pdf',
    caption: 'Here it is: How to Answer "How Much?" Without Losing the Sale.\n\n' +
      'Find your price band on page 2 and copy that reply into your quick replies, ' +
      'so it is ready the next time someone asks.'
  },
  AUDIT: {
    title: 'The 10-Minute WhatsApp Business Audit',
    pdf: SITE + '/free/audit.pdf',
    file: 'Novapex - WhatsApp Audit.pdf',
    caption: 'Here it is: The 10-Minute WhatsApp Business Audit.\n\n' +
      'Twelve checks, each with a one-minute fix. Set a timer for 10 minutes and ' +
      'go top to bottom.'
  }
};

// The menu, in order. "n" is the number people can type.
var OPTIONS = [
  { id: 'GHOST', n: '1', title: 'Ghosted leads guide', desc: 'Free PDF: 5 replies that bring quiet chats back',
    words: ['ghost', 'ghosted', 'quiet', 'ignored', 'no reply', 'left on read'] },
  { id: 'PRICE', n: '2', title: '"How much?" guide', desc: 'Free PDF: send your price without losing the sale',
    words: ['price'] },
  { id: 'AUDIT', n: '3', title: 'WhatsApp audit', desc: 'Free checklist: 12 checks, 10 minutes',
    words: ['audit', 'checklist'] },
  { id: 'TEST', n: '4', title: 'The Leak Test', desc: 'Free: 12 questions and a score in 4 minutes',
    words: ['test', 'leak', 'score', 'quiz'] },
  { id: 'KIT', n: '5', title: 'The Reply Kit, $197', desc: 'Every reply written for you, 30-day guarantee',
    words: ['kit', 'reply kit', 'buy', 'purchase'] },
  { id: 'DFY', n: '6', title: 'Done-For-You, $997', desc: 'We build and install it in your WhatsApp',
    words: ['done for you', 'done-for-you', 'install', 'setup for me', 'do it for me'] },
  { id: 'HUMAN', n: '7', title: 'Talk to Litsitso', desc: 'A real person replies here',
    words: ['human', 'person', 'talk', 'speak', 'call', 'litsitso', 'agent', 'help'] }
];

// Words that bring up the menu.
var MENU_WORDS = ['hi', 'hey', 'hello', 'helo', 'hie', 'good morning', 'good afternoon', 'good evening',
  'lumela', 'lumelang', 'dumela', 'howzit', 'menu', 'start', 'options', 'info', 'more', '0'];

var STOP_WORDS = ['stop', 'unsubscribe', 'opt out', 'optout'];

function menuIntro(name) {
  return (name ? 'Hi ' + name + ', welcome to Novapex.' : 'Hi, welcome to Novapex.') + '\n\n' +
    'We help businesses turn WhatsApp and Instagram inquiries into bookings.\n\n' +
    'Tap the menu below, or type a number or a word:\n' +
    OPTIONS.map(function (o) { return o.n + '  ' + o.title; }).join('\n');
}

var TEXT = {
  TEST: 'The Leak Test is 12 questions about how you handle inquiries. You get a score and ' +
    'your two weakest points, with the fix for each. It takes about 4 minutes:\n' +
    SITE + '/leak-test?src=wa-bot',

  KIT: 'The Reply Kit, $197 once:\n\n' +
    '- 40 first-reply scripts you copy and paste\n' +
    '- The Price-Reply Formula for "how much?"\n' +
    '- The 3-touch revival sequence (day 1, 3 and 7)\n' +
    '- A 60-minute WhatsApp Business setup\n' +
    '- The Inquiry Tracker\n' +
    '- Bonus: the comment-to-DM funnel\n\n' +
    'If it does not bring back at least one quiet chat in 30 days, you get the full $197 back.\n\n' +
    'Order here: ' + SITE + '/checkout?item=kit&src=wa-bot\n' +
    'Or reply PAY and Litsitso will send you a payment link here.',

  DFY: 'The Done-For-You Install, $997:\n\n' +
    'We map where your inquiries leak, rewrite the replies in your voice and install ' +
    'everything in your WhatsApp and Instagram within 14 days. It includes the Reply Kit and ' +
    '30 days of WhatsApp support.\n\n' +
    'If the Leak Map finds no leak worth fixing, we stop there and refund the full $997.\n\n' +
    'Reply BOOK and Litsitso will message you to set up a 20-minute call.',

  HUMAN: 'Done. Litsitso has been told and will reply here personally, usually within a few hours ' +
    '(Mon to Fri, 8am to 6pm). Type your question below so it is ready.',

  PAY: 'Thanks. Litsitso will send your payment link here shortly. Once it is paid, the Kit ' +
    'arrives straight away.',

  BOOK: 'Great. Litsitso will message you here to find a time for the call. If it helps, tell us ' +
    'what you sell and roughly how many inquiries you get a week.',

  STOP: 'You will not get any more tips from us. You can still message any time, and typing ' +
    'MENU brings the options back.',

  AFTER_GUIDE: 'Want the next step?'
};

// Buttons sent after a guide (max 3, titles up to 20 characters).
var AFTER_GUIDE_BUTTONS = [
  { id: 'KIT', title: 'See the Reply Kit' },
  { id: 'TEST', title: 'Take the Leak Test' },
  { id: 'MENU', title: 'Back to menu' }
];

// Extra words that are not menu items but still get an answer.
var EXTRA = [
  { id: 'PAY', words: ['pay', 'payment link', 'send link'] },
  { id: 'BOOK', words: ['book', 'booking', 'schedule'] }
];

module.exports = {
  GUIDES: GUIDES, OPTIONS: OPTIONS, MENU_WORDS: MENU_WORDS, STOP_WORDS: STOP_WORDS,
  EXTRA: EXTRA, TEXT: TEXT, AFTER_GUIDE_BUTTONS: AFTER_GUIDE_BUTTONS, menuIntro: menuIntro
};
