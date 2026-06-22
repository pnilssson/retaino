"use client";

import type {
  Campaign,
  CampaignReport,
} from '@retaino/shared/contracts';
import {
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table';
import {
  CalendarCheck,
  Info,
} from 'lucide-react';
import {
  useLocale,
  useTranslations,
} from 'next-intl';
import { useState } from 'react';
import {
  DataTable,
  PaginationControls,
} from '@/components/data-table';
import { EmptyState } from '@/components/empty-state';
import { ContentSection } from '@/features/appshell/components/content-section';
import { textStyles } from '@/lib/text-styles';
import { cn } from '@/lib/utils';
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
  const t = useTranslations('Campaigns');
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
    <ContentSection
      actions={
        canCreateReportedBookings && hasBookings ? (
          <ReportedBookingDialog
            campaign={campaign}
            currency={report.reportedOutcome.currency}
            organizationId={organizationId}
          />
        ) : null
      }
      framed={false}
      id="reported-bookings"
      title={t('reportedBookings')}
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
    </ContentSection>
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
  const locale = useLocale();
  const t = useTranslations('Campaigns');

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    columns: createReportedBookingColumns(locale, t),
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
          itemLabel={t('bookings')}
          onPageChange={onPageChange}
          page={currentPage}
          pageSize={REPORTED_BOOKINGS_PAGE_SIZE}
          total={totalBookings}
        />
      ) : null}
    </div>
  );
}

function createReportedBookingColumns(
  locale: string,
  t: ReturnType<typeof useTranslations<'Campaigns'>>,
): ColumnDef<ReportedBookingRow>[] {
  return [
  {
    id: 'customer',
    header: t('customer'),
    cell: ({ row }) => (
      <span className={textStyles.h3}>
        {bookingTitle(row.original, t)}
      </span>
    ),
  },
  {
    accessorKey: 'bookingDate',
    header: t('bookingDate'),
    cell: ({ row }) => formatReportDate(row.original.bookingDate, locale),
  },
  {
    accessorKey: 'service',
    header: t('service'),
    cell: ({ row }) => row.original.service ?? t('notAdded'),
  },
  {
    id: 'phone',
    header: t('phone'),
    cell: ({ row }) => row.original.contact.phone ?? t('notAdded'),
  },
  {
    id: 'email',
    header: t('email'),
    cell: ({ row }) => row.original.contact.email ?? t('notAdded'),
  },
  {
    accessorKey: 'revenueAmountMinor',
    header: () => <div className="text-right">{t('revenue')}</div>,
    cell: ({ row }) => (
      <div className={cn('text-right', textStyles.smallNumber)}>
        {row.original.revenueAmountMinor === null
          ? t('notAdded')
          : formatReportCurrency(
              row.original.revenueAmountMinor,
              row.original.currency,
              locale,
            )}
      </div>
    ),
  },
  ];
}

function bookingTitle(
  booking: ReportedBookingRow,
  t: ReturnType<typeof useTranslations<'Campaigns'>>,
) {
  return (
    booking.contact.name ?? booking.contact.phone ?? booking.contact.email ??
    t('bookingFallback')
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
  const t = useTranslations('Campaigns');

  return (
    <EmptyState
      action={
        canCreateReportedBookings ? (
          <ReportedBookingDialog
            campaign={campaign}
            currency={currency}
            organizationId={organizationId}
          />
        ) : null
      }
      description={
        canCreateReportedBookings
          ? t('noBookingsReportedDescription')
          : t('bookingsAfterSendingDescription')
      }
      framed
      icon={canCreateReportedBookings ? CalendarCheck : Info}
      title={
        canCreateReportedBookings
          ? t('noBookingsReportedTitle')
          : t('bookingsAfterSendingTitle')
      }
    />
  );
}
