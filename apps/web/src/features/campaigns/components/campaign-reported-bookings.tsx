import type { Campaign, CampaignReport } from '@retaino/shared/contracts';
import { ItemNotice } from '@/components/item-notice';
import { textStyles } from '@/lib/text-styles';
import {
  formatReportCurrency,
  formatReportDate,
  formatReportDateTime,
  formatReportNumber,
} from '../campaign-report-format';
import { BookingReportDialog } from './campaign-booking-report-dialog';

export function ReportedBookingsSection({
  campaign,
  organizationId,
  report,
}: {
  campaign: Campaign;
  organizationId: string | null;
  report: CampaignReport;
}) {
  const canCreateBookingReport =
    campaign.status === 'sent' || campaign.status === 'failed';

  return (
    <section className="grid gap-4 border-t border-border pt-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="grid gap-1">
          <h3 className={textStyles.itemTitle}>Reported bookings</h3>
          <p className={textStyles.mutedBody}>
            Bookings your team believes came from this campaign.
          </p>
        </div>
        {canCreateBookingReport ? (
          <BookingReportDialog
            campaign={campaign}
            currency={report.manualOutcome.currency}
            organizationId={organizationId}
          />
        ) : null}
      </div>

      {report.bookingReports.length > 0 ? (
        <div className="divide-y divide-border border-y border-border">
          {report.bookingReports.map((bookingReport) => (
            <div
              className="grid gap-2 py-3 sm:grid-cols-[1fr_auto] sm:items-center"
              key={bookingReport.id}
            >
              <div className="min-w-0">
                <p className={textStyles.itemTitle}>
                  {formatReportNumber(bookingReport.bookingCount)}{' '}
                  {bookingReport.bookingCount === 1 ? 'booking' : 'bookings'}
                </p>
                <p className={textStyles.meta}>
                  Reported {formatReportDateTime(bookingReport.createdAt)}
                  {bookingReport.checkedThroughDate
                    ? `, checked through ${formatReportDate(bookingReport.checkedThroughDate)}`
                    : ''}
                </p>
                {bookingReport.note ? (
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {bookingReport.note}
                  </p>
                ) : null}
              </div>
              <div className="text-sm font-medium tabular-nums sm:text-right">
                {bookingReport.hasMixedCurrencies
                  ? 'Mixed'
                  : formatReportCurrency(
                      bookingReport.revenueAmountMinor ?? 0,
                      bookingReport.currency,
                    )}
              </div>
            </div>
          ))}
        </div>
      ) : !canCreateBookingReport ? (
        <ItemNotice
          description="Campaign activity is still updating while messages are being sent."
          title="Bookings can be reported after sending"
        />
      ) : (
        <ItemNotice
          description="Add bookings after checking your booking system, replies, calls, or campaign code."
          title="No bookings reported yet"
        />
      )}

      <p className="text-xs leading-5 text-muted-foreground">
        Reported by your team. These numbers are not automatically matched to
        booking-system data.
      </p>
    </section>
  );
}
