# Reporting

Retaino reports campaign activity and team-reported outcomes separately.
Campaign activity comes from send state, message events, replies, and click
tracking. Outcome reporting comes from reported booking rows that users add
after checking their booking system, replies, calls, or campaign code.

## Reported Bookings

After a campaign has finished sending, users can add one or more booking
outcomes from campaign recipients. Each reported booking stores the campaign,
campaign recipient, contact, reporting user, booking date, source, optional
service, optional revenue, and optional note.

Reported bookings do not duplicate contact names, phone numbers, or email
addresses. Read models join to `contacts` when displaying customer details.

Users enter normal currency amounts. Retaino stores revenue as integer minor
units using the campaign outcome currency and displays formatted money values
back to the user. If historical or imported data contains mixed revenue
currencies for one campaign, reports must not show one summed revenue total.

## Data Ownership

Click tracking owns clicks only. Reported bookings own campaign outcomes.
Campaign reports compose delivery metrics, click metrics, replies, opt-outs,
reported bookings, and reported revenue without merging those storage domains.

The delivery funnel must only show additive delivery-state flow. Engagement,
opt-outs, bookings, revenue, and credits are separate metrics because they can
overlap and must not be treated as mutually exclusive recipient movement.

## Future Matching

Possible matching inputs:

- normalized phone
- normalized email
- phone hash
- email hash
- name plus phone suffix
- booking date
- service name
- booking created time after sent time or click time
- campaign code, offer code, or campaign reference

Never match across organizations. Internal `organizationId` is required in
every query.

Future deterministic order:

1. Exact campaign code, offer code, or campaign reference.
2. Exact normalized phone.
3. Exact normalized email.
4. Name plus phone suffix.
5. Click-assisted time match.
6. Campaign-window time match.

When multiple campaigns match, prefer the most recent campaign inside the
attribution window. When multiple recipients match one booking, choose strongest
confidence, then closest click time, then closest sent time. Do not count the
same booking twice.

## Metrics

Campaign activity reports include selected recipients, sent messages, delivered
messages, failed messages, skipped recipients, click count, unique clickers,
replies, opt-outs, estimated SMS credits, and actual SMS credits.

Reported outcomes include reported booking count, reported revenue, booking
rate, and average booking revenue.

Reports must label team-reported outcomes clearly. Do not imply click tracking
or manual reporting proves automatic attribution.
