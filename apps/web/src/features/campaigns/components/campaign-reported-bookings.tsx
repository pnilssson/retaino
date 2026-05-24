import type { Campaign, CampaignReport } from '@retaino/shared/contracts';
import { CalendarCheck, Info } from 'lucide-react';
import { AppPageSection } from '@/features/appshell/components/app-page-content';
import { textStyles } from '@/lib/text-styles';
import {
  formatReportCurrency,
  formatReportDate,
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
  const bookings = report.bookingReports.flatMap((bookingReport) =>
    bookingReport.bookings.map((booking) => ({
      ...booking,
      checkedThroughDate: bookingReport.checkedThroughDate,
      reportNote: bookingReport.note,
      reportId: bookingReport.id,
    })),
  );
  const hasBookings = bookings.length > 0;

  return (
    <AppPageSection
      actions={
        canCreateBookingReport && hasBookings ? (
          <BookingReportDialog
            campaign={campaign}
            currency={report.manualOutcome.currency}
            organizationId={organizationId}
          />
        ) : null
      }
      description="Add booking outcomes from this campaign."
      title="Reported bookings"
    >
      {hasBookings ? (
        <div className="grid gap-3">
          {bookings.map((booking) => {
            const reportContext = bookingReportContext(booking);

            return (
              <div
                className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                key={`${booking.reportId}-${booking.id}`}
              >
                <div className="min-w-0">
                  <p className={textStyles.itemTitle}>{bookingTitle(booking)}</p>
                  <p className={textStyles.meta}>
                    {[
                      formatReportDate(booking.bookingDate),
                      booking.service,
                      booking.phone,
                      booking.email,
                    ]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                  {booking.note ? (
                    <p className={textStyles.mutedBody}>{booking.note}</p>
                  ) : null}
                  {reportContext ? (
                    <p className={textStyles.meta}>{reportContext}</p>
                  ) : null}
                </div>
                {booking.revenueAmountMinor !== null ? (
                  <div className="text-sm font-medium tabular-nums sm:text-right">
                    {formatReportCurrency(
                      booking.revenueAmountMinor,
                      booking.currency,
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <BookingReportEmptyState
          campaign={campaign}
          canCreateBookingReport={canCreateBookingReport}
          currency={report.manualOutcome.currency}
          organizationId={organizationId}
        />
      )}
    </AppPageSection>
  );
}

function bookingTitle(
  booking: CampaignReport['bookingReports'][number]['bookings'][number],
) {
  return booking.customerName ?? booking.phone ?? booking.email ?? 'Booking';
}

function bookingReportContext(
  booking: CampaignReport['bookingReports'][number]['bookings'][number] & {
    checkedThroughDate: string | null;
    reportNote: string | null;
  },
) {
  return [
    booking.checkedThroughDate
      ? `Checked until ${formatReportDate(booking.checkedThroughDate)}`
      : null,
    booking.reportNote ? `Report note: ${booking.reportNote}` : null,
  ]
    .filter(Boolean)
    .join(', ');
}

function BookingReportEmptyState({
  campaign,
  canCreateBookingReport,
  currency,
  organizationId,
}: {
  campaign: Campaign;
  canCreateBookingReport: boolean;
  currency: string;
  organizationId: string | null;
}) {
  return (
    <div className="flex min-h-44 flex-col items-center justify-center gap-4 px-4 py-8 text-center">
      <div className="flex size-10 items-center justify-center rounded-md bg-muted text-muted-foreground">
        {canCreateBookingReport ? (
          <CalendarCheck aria-hidden="true" className="size-5" />
        ) : (
          <Info aria-hidden="true" className="size-5" />
        )}
      </div>
      <div className="grid max-w-md gap-1">
        <h3 className={textStyles.itemTitle}>
          {canCreateBookingReport
            ? 'No bookings reported yet'
            : 'Bookings can be reported after sending'}
        </h3>
        <p className={textStyles.mutedBody}>
          {canCreateBookingReport
            ? 'Add bookings after checking your booking system, replies, calls, or campaign code.'
            : 'Campaign activity is still updating while messages are being sent.'}
        </p>
      </div>
      {canCreateBookingReport ? (
        <BookingReportDialog
          campaign={campaign}
          currency={currency}
          organizationId={organizationId}
        />
      ) : null}
    </div>
  );
}
