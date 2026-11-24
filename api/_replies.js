/* Everything the WhatsApp bot says lives here, so the wording can change
   without touching how the bot works. Files starting with _ in /api are not
   served as pages.

   Each menu option can be reached three ways: tapping it in the menu, typing
   its number, or typing any of its words. The bot speaks as the Novapex team.

   Updated 24 November 2026 for the three offers: Brand Launch, Page
   Management and Ad Campaigns. The free guides and the Reply Kit are no longer
   in the menu, but their code words (GHOST, PRICE, AUDIT, KIT) still work for
   people arriving from older pages and PDFs. */

var SITE = 'https://www.novapex.agency';
var CORE = 'We plan it, run it and show you the results every month.';
var SCARCE = 'We only take on a few new clients each month, so every client gets proper attention.';

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

// The menu, in order. "n" is the number people can type. "label" names the
// option in the email the team gets. Titles max 24 characters, descriptions 72.
var OPTIONS = [
  { id: 'BRAND', n: '1', title: 'Brand Launch', label: 'Brand Launch',
    desc: 'Once-off: logo, strategy and 3 months of content, built in one go',
    words: ['brand', 'branding', 'rebrand', 'logo', 'brand launch', 'identity'] },
  { id: 'PAGE', n: '2', title: 'Page Management', label: 'Page Management',
    desc: 'Monthly: we run your page and report the results every month',
    words: ['page', 'page management', 'social media', 'manage my page', 'posting', 'content', 'done for you'] },
  { id: 'ADS', n: '3', title: 'Ad Campaigns', label: 'Ad Campaigns',
    desc: 'Monthly: Meta ads that bring the right people, numbers shown',
    words: ['ads', 'ad', 'advert', 'adverts', 'advertising', 'boost', 'campaign', 'campaigns', 'meta ads', 'facebook ads'] },
  { id: 'WORK', n: '4', title: 'Results and how we work', label: 'Results',
    desc: 'Real numbers from our team\'s past work',
    words: ['results', 'work', 'portfolio', 'examples', 'proof', 'method'] },
  { id: 'BOOK', n: '5', title: 'Book a free call', label: 'Free call',
    desc: '30 minutes, then a written quote in your currency',
    words: ['book', 'booking', 'call', 'free call', 'schedule', 'meeting', 'appointment'] },
  { id: 'HUMAN', n: '6', title: 'Talk to the team', label: 'Talk to the team',
    desc: 'A real person replies here',
    words: ['human', 'person', 'talk', 'speak', 'agent', 'help', 'team', 'litsitso'] }
];

// Words that bring up the menu.
var MENU_WORDS = ['hi', 'hey', 'hello', 'helo', 'hie', 'good morning', 'good afternoon', 'good evening',
  'lumela', 'lumelang', 'dumela', 'howzit', 'menu', 'start', 'options', 'info', 'more', 'services', '0'];

var STOP_WORDS = ['stop', 'unsubscribe', 'opt out', 'optout'];

function menuIntro(name) {
  return (name ? 'Hi ' + name + ', welcome to Novapex.' : 'Hi, welcome to Novapex.') + '\n\n' +
    CORE + '\n\n' +
    'Tap the menu below, or type a number or a word:\n' +
    OPTIONS.map(function (o) { return o.n + '  ' + o.title; }).join('\n');
}

var TEXT = {
  BRAND: 'Brand Launch (once-off)\n\n' +
    'Everything your brand needs to look the part and show up properly, built in one go:\n\n' +
    '- Logo, fonts and colours that work together\n' +
    '- Brand strategy: who you are for and how you sound\n' +
    '- A 3-month content calendar, planned post by post\n' +
    '- Ready-to-use post templates in your new look\n\n' +
    'For new businesses, rebrands, professionals and leaders building a name.\n\n' +
    'More here: ' + SITE + '/brand-launch?src=wa-bot\n\n' +
    'Reply BOOK for a free call. We quote in your currency.',

  PAGE: 'Page Management (monthly)\n\n' +
    'We run your page so people know you and trust you:\n\n' +
    '- Strategy and a content plan, before anything is posted\n' +
    '- Writing and design, in your voice\n' +
    '- Posting on schedule, every week\n' +
    '- Replies to comments and messages\n' +
    '- A plain-language report every month: what we did, what happened, what is next\n\n' +
    'Love the plan or don\'t pay: you see your full plan first. If you still don\'t love it ' +
    'after we rework it, you don\'t pay for the first month.\n\n' +
    'More here: ' + SITE + '/page-management?src=wa-bot\n\n' +
    'Reply BOOK for a free call. We quote in your currency.',

  ADS: 'Ad Campaigns (monthly)\n\n' +
    'Paid ads that bring the right people to you, with the numbers shown every month:\n\n' +
    '- We plan, build, run and improve your Meta ads\n' +
    '- Your own card pays Meta directly, so your ad money stays yours\n' +
    '- An agreed monthly spending limit, so nothing gets overspent\n' +
    '- Results in plain numbers, every month\n\n' +
    'Love the plan or don\'t pay: nothing is spent on ads until you approve the plan.\n\n' +
    'More here: ' + SITE + '/ad-campaigns?src=wa-bot\n\n' +
    'Reply BOOK for a free call. We quote in your currency.',

  WORK: 'What our team\'s work has done:\n\n' +
    '- 2M+ views in 60 days for a national public figure\n' +
    '- 1.3M views for a legal professional\'s personal brand\n' +
    '- 600,000+ views for Maluti Neurodiagnostics after launch\n' +
    '- 4.2% ad click-through across 8 countries, about 2x the benchmark\n\n' +
    'How we work: get attention, answer fast, find the serious buyers, turn them into customers.\n\n' +
    'See the results: ' + SITE + '/work?src=wa-bot\n\n' +
    'Reply BOOK for a free call.',

  PRICING: 'We don\'t have fixed prices, because every business is different. ' +
    'After a free 30-minute call, we send you a written quote in your currency: ' +
    'rands, maloti or US dollars.\n\n' +
    'Reply BOOK and we will set up the call.',

  BOOK: 'Great. Someone from the Novapex team will message you here to find a time for ' +
    'your free 30-minute call.\n\n' +
    'To make it useful, tell us what you do, and which you are curious about: ' +
    'Brand Launch, Page Management, Ad Campaigns, or not sure yet.\n\n' + SCARCE,

  HUMAN: 'Done. Someone from the Novapex team will reply here personally, usually within a few ' +
    'hours (Mon to Fri, 8am to 6pm). Type your question below so it is ready.',

  // The Reply Kit is no longer in the menu, but its page and order flow still exist.
  KIT: 'The Reply Kit, $197 once:\n\n' +
    '- 40 first-reply scripts you copy and paste\n' +
    '- The Price-Reply Formula for "how much?"\n' +
    '- The 3-touch revival sequence (day 1, 3 and 7)\n' +
    '- A 60-minute WhatsApp Business setup\n' +
    '- The Inquiry Tracker\n' +
    '- Bonus: the comment-to-DM funnel\n\n' +
    'If it does not bring back at least one quiet chat in 30 days, you get the full $197 back.\n\n' +
    'Order here: ' + SITE + '/checkout?item=kit&src=wa-bot\n' +
    'Or reply PAY and we will send you a payment link here.',

  PAY: 'Thanks. We will send your payment link here shortly. Once it is paid, the Kit ' +
    'arrives straight away.',

  STOP: 'You will not get any more tips from us. You can still message any time, and typing ' +
    'MENU brings the options back.',

  AFTER_GUIDE: 'Want a team to handle the rest of your marketing? ' + CORE
};

// Buttons sent after a guide (max 3, titles up to 20 characters).
var AFTER_GUIDE_BUTTONS = [
  { id: 'BOOK', title: 'Book a free call' },
  { id: 'PAGE', title: 'Page Management' },
  { id: 'MENU', title: 'See all options' }
];

// Words that are not menu items but still get an answer. Checked before the menu words.
var EXTRA = [
  { id: 'PAY', label: 'Reply Kit payment', words: ['pay', 'payment link', 'send link'] },
  { id: 'KIT', label: 'Reply Kit', words: ['kit', 'reply kit'] },
  { id: 'PRICING', label: 'Pricing', words: ['price', 'prices', 'pricing', 'cost', 'costs', 'how much', 'rates', 'fees', 'quote'] }
];

module.exports = {
  GUIDES: GUIDES, OPTIONS: OPTIONS, MENU_WORDS: MENU_WORDS, STOP_WORDS: STOP_WORDS,
  EXTRA: EXTRA, TEXT: TEXT, AFTER_GUIDE_BUTTONS: AFTER_GUIDE_BUTTONS, menuIntro: menuIntro
};
