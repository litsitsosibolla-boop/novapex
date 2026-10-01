# Build order and funnel playbook

One problem, one market, one offer, one platform, one funnel. Everything on this
page serves that. If a task does not move someone closer to buying the Reply Kit,
it waits.

| The one... | Ours |
|---|---|
| Problem | Inquiries go quiet in the chat and never book |
| Market | Owner-run service businesses that sell through WhatsApp and Instagram DMs (salons, coaches, clinics, consultants, photographers, tutors, event businesses) |
| Offer | **The Reply Kit, $197 once.** Bought once, used forever, no delivery work after the sale |
| Platform | Instagram (carousels and Reels), with LinkedIn reusing the same carousels |
| Funnel | Post → comment keyword → DM → free PDF → CTA inside the PDF → /kit → checkout |

Everything else (Done-For-You Install at $997, Custom monthly work) lives on
`/pricing` and is sold on calls, never pushed in content.

---

## Gate: before anything is promoted

1. ~~**Build the Kit.**~~ Done. The files live at `C:\Users\LENOVO\novapex-kit`
   (deliberately outside this public repo), with `The-Reply-Kit.zip` ready to upload.
   The site describes exactly these files, so if one changes, change the page too.
2. **Create the checkout.** Use a platform that takes cards, Apple Pay and Google
   Pay, delivers the files automatically and pays out to you: Gumroad, Lemon
   Squeezy or Payhip. Confirm it pays out to Lesotho (usually via PayPal or a bank)
   before you pick. Set the price to $197, USD only.
3. **Paste the checkout link** into `CHECKOUT.kit` in `assets/site.js`. Every buy
   button on the site switches to it. Until then, buttons open WhatsApp with a
   ready-typed "I want the Reply Kit" message, so nothing is broken in the meantime.
4. **Set the platform's post-purchase redirect** to `https://novapex.agency/thanks`.
   That page carries the one upsell: Done-For-You for $800 (the $997 minus the $197
   already paid).
5. ~~**Build the three free PDFs.**~~ Done, and hosted on the site. These are the
   links your DM automation sends:
   - GHOST → `https://novapex.agency/free/ghost.pdf`
   - PRICE → `https://novapex.agency/free/price.pdf`
   - AUDIT → `https://novapex.agency/free/audit.pdf`

   Each already contains its three tracked links to `/kit?src=…`.

## The funnel, step by step

```
Carousel / Reel  ──►  "Comment GHOST"  ──►  auto-DM with the PDF
                                                  │
                    /kit?src=ghost  ◄──  CTAs inside the PDF
                          │
                  checkout ($197)  ──►  /thanks  ──►  $800 Done-For-You upgrade
```

### 1. Content (top of funnel)

Every post ends with a comment keyword. No exceptions: a post without a CTA
leaves money behind.

**The carousel formula (8 slides)**

1. Hook: the painful moment. "They asked 'how much?' and vanished."
2. Why it happens (one sentence, big type).
3. The mistake most people make (show the bad reply).
4. The fix, part 1.
5. The fix, part 2.
6. The fix, part 3, or a before/after chat screenshot.
7. The result, framed as what changes.
8. CTA: "Want the 5 replies that bring ghosted leads back? Comment **GHOST** and
   I'll DM them to you."

**Pitch vs nurture.** Four nurture posts (teach, no pitch) to one pitch post
(the Kit directly, link in bio to `/kit`). Every post, including nurture, still
ends with a keyword CTA.

**Posting ramp.** Days 1–30: one post a day. Days 31–60: two a day (one
carousel, one Reel cut from it). Days 61–90: keep the winning formats and double
down on the keyword that converts best. Volume is the lever.

### 2. Keywords and DMs (ManyChat or similar)

| Keyword | Freebie | Landing link inside the PDF |
|---|---|---|
| GHOST | The 5 Replies That Bring Ghosted Leads Back | `novapex.agency/kit?src=ghost` |
| PRICE | How to Answer "How Much?" Without Losing the Sale | `novapex.agency/kit?src=price` |
| AUDIT | The 10-Minute WhatsApp Business Audit | `novapex.agency/kit?src=audit` |
| KIT | Straight to the offer | `novapex.agency/kit?src=dm` |

The `/free` page sends the same keywords to WhatsApp, so one automation answers
both Instagram comments and WhatsApp messages.

**DM 1 (instant, on comment):**
> Here you go 👇 [PDF link]
> Quick one: are you getting inquiries that go quiet right now, or mostly no
> inquiries at all?

(The question starts a conversation, which tells the algorithm to show you more,
and tells you who is ready.)

**DM 2 (24 hours later):**
> Did #3 work for you? Most people send it to three old chats the same day.
> If you want all 40 replies plus the follow-up sequence, it's all in the Reply
> Kit: novapex.agency/kit?src=dm

**DM 3 (day 3, only if they said their inquiries go quiet):**
> The Kit has a 30-day money-back guarantee: if it doesn't bring back one quiet
> chat, you get the full $197 back. novapex.agency/kit?src=dm

### 3. CTAs inside every free PDF

Each PDF carries **three** CTAs. Use the tracked link for that PDF.

- **Page 1 footer (soft):** "From the Reply Kit. The full system is at
  novapex.agency/kit"
- **Middle page, after the best tip (proof):** "This is reply 1 of 40 in the Reply
  Kit. → novapex.agency/kit?src=ghost"
- **Last page (hard):** full-page offer. Headline, the 6 items, $412 crossed out,
  **$197**, the 30-day guarantee, one big button-shaped link.

### 4. The landing page

`/kit` (also `/get`) is the hard-sell page: no navigation, buy button above the
fold, value stack, guarantee, FAQ and a sticky buy bar on scroll. The home page
sells the same offer with navigation. Every buy button follows `CHECKOUT.kit`.

Send traffic straight to checkout via `/kit`. No email nurture in front of it.
Collect the email at checkout and nurture buyers afterwards instead.

## What to measure, weekly

- Comments per post → which hooks pull
- DMs sent → PDF opens (ManyChat shows this)
- `/kit` visits by `src` (Google Analytics: page location contains `src=`)
- `begin_checkout` events (fired by every buy button) → sales
- Sales by `src` → which freebie earns, so make more like it

A rough target: 2–4% of `/kit` visitors buy. Below 1%, fix the page. Above 3%,
put money behind it (start Instagram ads at $5 a day on the best carousel,
pointing at `/kit?src=ads`).

## What not to do

- Do not add a second product to the home page. One offer.
- Do not invent testimonials. Message every buyer on day 7 and ask "did any quiet
  chat come back?" Screenshot the yeses (with permission) and add them to `/kit`.
- Do not put a fake countdown on any page. If you want urgency, use a real launch
  price increase with a real date, and honour it.
- Do not skip the guarantee. Refund anyone who asks within 30 days, fast.
- Do not publish content without a keyword CTA.
