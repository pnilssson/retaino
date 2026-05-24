"use client";

import type { Campaign, CampaignReport } from '@retaino/shared/contracts';
import {
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table';
import { CalendarCheck, Info } from 'lucide-react';
import { useState } from 'react';
import { DataTable, PaginationControls } from '@/components/data-table';
import { AppPageSection } from '@/features/appshell/components/app-page-content';
import { textStyles } from '@/lib/text-styles';
import {
  formatReportCurrency,
  formatReportDate,
} from '../campaign-report-format';
import { ReportedBookingDialog } from './campaign-reported-booking-dialog';

const REPORTED_BOOKINGS_PAGE_SIZE = 10;

type ReportedBookingRow =
  CampaignReport['reportedBookings'][number];

export function ReportedBookingsSection({
  campaign,
  organizationId,
  report,
}: {
  campaign: Campaign;
  organizationId: string | null;
  report: CampaignReport;
}) {
  const [page, setPage] = useState(1);
  const canCreateReportedBookings =
    campaign.status === 'sent' || campaign.status === 'failed';
  const bookings = report.reportedBookings;
  const hasBookings = bookings.length > 0;
  const totalPages = Math.max(
    1,
    Math.ceil(bookings.length / REPORTED_BOOKINGS_PAGE_SIZE),
  );
  const currentPage = Math.min(page, totalPages);
  const visibleBookings = bookings.slice(
    (currentPage - 1) * REPORTED_BOOKINGS_PAGE_SIZE,
    currentPage * REPORTED_BOOKINGS_PAGE_SIZE,
  );

  return (
    <AppPageSection
      actions={
        canCreateReportedBookings && hasBookings ? (
          <ReportedBookingDialog
            campaign={campaign}
            currency={report.reportedOutcome.currency}
            organizationId={organizationId}
          />
        ) : null
      }
      description="Add booking outcomes from this campaign."
      framed={false}
      id="reported-bookings"
      title="Reported bookings"
    >
      {hasBookings ? (
        <ReportedBookingsTable
          bookings={visibleBookings}
          currentPage={currentPage}
          onPageChange={setPage}
          totalBookings={bookings.length}
        />
      ) : (
        <ReportedBookingsEmptyState
          campaign={campaign}
          canCreateReportedBookings={canCreateReportedBookings}
          currency={report.reportedOutcome.currency}
          organizationId={organizationId}
        />
      )}
    </AppPageSection>
  );
}

function ReportedBookingsTable({
  bookings,
  currentPage,
  onPageChange,
  totalBookings,
}: {
  bookings: ReportedBookingRow[];
  currentPage: number;
  onPageChange: (page: number) => void;
  totalBookings: number;
}) {
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    columns: reportedBookingColumns,
    data: bookings,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
    manualPagination: true,
  });

  return (
    <div className="grid gap-3">
      <DataTable
        cellClassName="p-2"
        rowClassName="group"
        table={table}
      />
      {totalBookings > REPORTED_BOOKINGS_PAGE_SIZE ? (
        <PaginationControls
          itemLabel="bookings"
          onPageChange={onPageChange}
          page={currentPage}
          pageSize={REPORTED_BOOKINGS_PAGE_SIZE}
          total={totalBookings}
        />
      ) : null}
    </div>
  );
}

const reportedBookingColumns: ColumnDef<ReportedBookingRow>[] = [
  {
    id: 'customer',
    header: 'Customer',
    cell: ({ row }) => (
      <span className="font-medium">{bookingTitle(row.original)}</span>
    ),
  },
  {
    accessorKey: 'bookingDate',
    header: 'Booking date',
    cell: ({ row }) => formatReportDate(row.original.bookingDate),
  },
  {
    accessorKey: 'service',
    header: 'Service',
    cell: ({ row }) => row.original.service ?? 'Not added',
  },
  {
    id: 'phone',
    header: 'Phone',
    cell: ({ row }) => row.original.contact.phone ?? 'Not added',
  },
  {
    id: 'email',
    header: 'Email',
    cell: ({ row }) => row.original.contact.email ?? 'Not added',
  },
  {
    accessorKey: 'revenueAmountMinor',
    header: () => <div className="text-right">Revenue</div>,
    cell: ({ row }) => (
      <div className="text-right font-medium tabular-nums">
        {row.original.revenueAmountMinor === null
          ? 'Not added'
          : formatReportCurrency(
              row.original.revenueAmountMinor,
              row.original.currency,
            )}
      </div>
    ),
  },
];

function bookingTitle(booking: ReportedBookingRow) {
  return (
    booking.contact.name ?? booking.contact.phone ?? booking.contact.email ??
    'Booking'
  );
}

function ReportedBookingsEmptyState({
  campaign,
  canCreateReportedBookings,
  currency,
  organizationId,
}: {
  campaign: Campaign;
  canCreateReportedBookings: boolean;
  currency: string;
  organizationId: string | null;
}) {
  return (
    <div className="flex min-h-44 flex-col items-center justify-center gap-4 px-4 py-8 text-center">
      <div className="flex size-10 items-center justify-center rounded-md bg-muted text-muted-foreground">
        {canCreateReportedBookings ? (
          <CalendarCheck aria-hidden="true" className="size-5" />
        ) : (
          <Info aria-hidden="true" className="size-5" />
        )}
      </div>
      <div className="grid max-w-md gap-1">
        <h3 className={textStyles.itemTitle}>
          {canCreateReportedBookings
            ? 'No bookings reported yet'
            : 'Bookings can be reported after sending'}
        </h3>
        <p className={textStyles.mutedBody}>
          {canCreateReportedBookings
            ? 'Add bookings after checking your booking system, replies, calls, or campaign code.'
            : 'Campaign activity is still updating while messages are being sent.'}
        </p>
      </div>
      {canCreateReportedBookings ? (
        <ReportedBookingDialog
          campaign={campaign}
          currency={currency}
          organizationId={organizationId}
        />
      ) : null}
    </div>
  );
}
