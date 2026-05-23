# Reporting

Retaino reports campaign activity and team-reported outcomes separately.
Campaign activity comes from send state, message events, replies, and click
tracking. Outcome reporting comes from manual booking reports in MVP.

## Manual Booking Reports

After a campaign has finished sending, the business can create a booking report
and add one or more bookings it believes came from the campaign. Each row
stores booking date, optional customer name, phone, email, service, revenue,
and note.

Users enter normal currency amounts. Retaino stores revenue as integer minor
units using the organization's currency and displays formatted money
values back to the user.

Once a campaign has reported bookings, later manual reports for that campaign
use the same currency even if the organization's default currency
changes. If imported or historical data contains mixed revenue currencies for
one campaign, reports must not show a single summed revenue total.

Manual booking reports are additive. Users can add new lightweight batches as
more results come in. Large spreadsheet reconciliation belongs to the deferred
import path, not the manual HTTP request. Campaign reports label these results
as reported by the team.

Spreadsheet CSV/XLSX import is deferred, but future imports should create the
same booking report and reported booking rows with a non-manual source.

## Data Ownership

Booking reports belong to outcome reporting, not click tracking. A booking
report references the campaign it is reporting on. Reported booking rows belong
to a booking report and do not duplicate the campaign relationship.

Campaign reports are the composition point. They may show delivery metrics,
click metrics, replies, opt-outs, reported bookings, and reported revenue
together, but the underlying storage remains separated by domain.

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

## Future Attribution Classes

| Class | Meaning |
| --- | --- |
| Direct match | Same phone or email as a campaign recipient inside the window. |
| Click-assisted match | Recipient clicked and a matching booking appeared inside the window. |
| Campaign-window match | Recipient received SMS and booked inside the window without a click. |
| Unmatched | No confident attribution. |

Store confidence level and match reason. Low-confidence attribution must be
visibly separated in reports.

Default attribution window is 7 days. Support 3, 14, and 30 day windows where
needed. Longer windows increase over-attribution risk and should be shown as
less precise.

## Metrics

Campaign activity reports include selected recipients, sent messages, delivered
messages, failed messages, skipped recipients, click count, unique clickers,
replies, opt-outs, estimated SMS credits, and actual SMS credits.

Manual booking reports include reported booking count, reported revenue, booking
rate, and revenue per delivered recipient.

Booking imports, attribution classes, attributed revenue by confidence, and
return on spend belong to the later booking reconciliation plan.

Reports must label manual outcomes clearly. Do not imply click tracking or
manual reporting proves automatic attribution.
