# Landing Page Brief

This document defines the first Retaino landing page. It is a concise
messaging and conversion brief, not a visual design spec.

## Core Decision

Retaino should not lead with "SMS marketing software." That category is too
generic.

Lead with one narrow promise:

> Bring lapsed aesthetic clients back to the calendar.

First target:

> Independent Swedish aesthetic and advanced beauty clinics with 2 to 15
> bookable staff, an existing booking system, and a customer list they can
> export without health notes.

Positioning:

> Retaino helps clinics find clients who have not booked recently, send focused
> reactivation campaigns, answer replies from one inbox, and report the bookings
> that come back.

## Page Goal

The page should make one next action feel obvious:

> Start your first reactivation campaign.

Everything on the page must do at least one of these:

- increase desire for reactivation
- prove Retaino fits the clinic
- reduce anxiety about SMS, cost, data, replies, or opt-outs
- move the visitor toward the primary CTA

## 2026 Minimum Page

Build only these parts for the first page:

1. **Hero**
   - H1: "Bring lapsed aesthetic clients back to the calendar."
   - Name the fit: independent Swedish aesthetic and advanced beauty clinics.
   - Show one primary CTA: "Start your first reactivation campaign."
   - Show one real product visual, not an illustration: import, lapsed audience,
     SMS, inbox, or reported bookings.

2. **How It Works**
   - Keep the workflow to five steps: import, choose lapsed clients, text, reply,
     report.
   - Show Retaino beside the booking system, not replacing it.

3. **Trust And Control**
   - Say permission is confirmed during import.
   - Say opt-out wording is included and STOP replies suppress future sends.
   - Say credits are shown before send.
   - Say Retaino needs contact and booking fields, not health notes or treatment
     notes.

4. **Cost And Payback**
   - Show Starter as a first reactivation test.
   - Frame price against recovered bookings.
   - Do not claim guaranteed ROI or automatic attribution.

5. **FAQ**
   - Include only the questions that block the CTA:
     "Do we need to replace our booking system?"
     "What data do we import?"
     "What happens when clients reply?"
     "How are opt-outs handled?"
     "How do we see bookings and revenue?"

Do not add testimonials, customer logos, awards, case studies, ROI claims,
comparisons, integrations, calculators, or long feature grids until Retaino has
real proof or the product needs them to reduce a specific buying anxiety.

## SEO Minimum

The page must be indexable, useful, and specific:

- Use one localized page per language with normal crawlable links and visible
  HTML text. Do not hide the real message inside images or animations.
- Put the search language in the page title, H1, first paragraph, image alt text,
  and internal links. Swedish terms should include `kundreaktivering`,
  `SMS-kampanj`, `estetisk klinik`, `skönhetsklinik`, `bokningssystem`, and
  `tidigare kunder` where they fit naturally.
- Use a page title like:
  `Retaino | Kundreaktivering via SMS för estetiska kliniker`
- Use a meta description that states the buyer, outcome, and risk reducers:
  `Retaino hjälper estetiska kliniker att hitta tidigare kunder, skicka
  reaktiveringskampanjer via SMS, hantera svar och rapportera bokningar utan att
  byta bokningssystem.`
- Use descriptive headings that match buyer questions, not clever campaign
  lines.
- Add `Organization` structured data. Add software or product structured data
  only if pricing and product details on the page match the markup.
- Keep the page fast and stable: good Core Web Vitals, optimized images, no
  heavy decorative video, no layout shift around the CTA.
- Connect the page from public navigation and link out to pricing, terms, privacy
  or legal, and the login or signup path.

## Evidence Notes

- Google's Search Essentials prioritize helpful people-first content, buyer
  language in titles and headings, crawlable links, and understandable images or
  structured data.
- Google's 2026 generative search guidance still treats AI search as SEO:
  crawlable, unique, useful content beats commodity summaries.
- Google recommends clear meta descriptions that summarize the page and help the
  searcher decide whether the result fits.
- Google Core Web Vitals measure loading, responsiveness, and visual stability.
  These are search and user-experience requirements, not polish.
- CXL's B2B landing-page guidance says generic pages fail because buyers must
  translate the value themselves, and the CTA must make the next step obvious.
- Unbounce benchmark data shows SaaS landing pages are a hard sell, with a 3.8%
  median conversion rate. Simple, clear copy and mobile-first pages matter.
- Current SaaS examples repeatedly use product-as-proof: Linear, ReadMe, and
  Airtable show actual product workflows; Notion and Webflow use specific proof
  points; Stripe reduces buyer risk with structured detail. Retaino should copy
  the pattern, not their scale.

Sources:

- [Google Search Essentials](https://developers.google.com/search/docs/essentials)
- [Google SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide)
- [Google generative AI search guide](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)
- [Google meta description guidance](https://developers.google.com/search/docs/appearance/snippet)
- [Google Core Web Vitals](https://developers.google.com/search/docs/appearance/core-web-vitals)
- [CXL B2B landing page infrastructure](https://cxl.com/blog/landing-page-infrastructure/)
- [Unbounce SaaS conversion benchmarks](https://unbounce.com/conversion-benchmark-report/saas-conversion-rate/)
- [Userpilot 2026 SaaS landing page examples](https://userpilot.com/blog/saas-landing-pages/)

## Copy Rules

Use the buyer's nouns:

- client list
- last visit
- treatment
- consultation
- booking link
- SMS reply
- calendar
- credits
- opt-out
- reported booking

Use plain verbs:

- find
- text
- reply
- book
- report
- exclude
- pay
- try

Avoid:

- unlock
- elevate
- seamless
- effortless
- transform
- revolutionize
- game-changing
- cutting-edge
- robust
- innovative
- tailored solution
- scalable platform
- all-in-one
- customer engagement
- boost engagement
- drive growth
- maximize ROI
- supercharge
- next-level
- leverage
- actionable insights
- personalized experiences

Preferred replacements:

| Weak phrase | Better Retaino phrase |
| --- | --- |
| Unlock customer engagement | Bring back clients who have not booked recently |
| Elevate your marketing | Bring lapsed clients back to the calendar |
| Seamless communication | Keep campaign replies in one inbox |
| Drive growth | Report bookings and revenue after the campaign |
| Actionable insights | See who clicked, replied, opted out, and booked |
| Maximize ROI | Compare plan cost with recovered bookings |
| All-in-one platform | Works beside your booking system |

## AI Design Guardrail

Do not ask AI to "make a beautiful landing page." That produces generic SaaS
layouts because the tool is inventing strategy, copy, hierarchy, and taste at
the same time.

Use AI only after these constraints are fixed:

- target clinic type
- commercial promise
- primary CTA
- proof rules
- product visuals to show
- banned copy patterns

Useful AI prompt shape:

> Design one section for a Swedish aesthetic clinic owner. The section must
> show how Retaino brings lapsed clients back to the calendar. Avoid generic
> SaaS language. Show product UI, not abstract graphics.
