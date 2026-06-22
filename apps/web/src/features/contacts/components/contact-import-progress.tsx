"use client";

import type { ContactImportDetail } from '@retaino/shared/contracts';
import {
  AlertCircle,
  CheckCircle2,
  CircleSlash,
  Copy,
  FileUp,
  RefreshCw,
  ShieldOff,
  TriangleAlert,
  UserPlus,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import {
  useEffect,
  useRef,
} from 'react';
import { toast } from 'sonner';
import {
  FunnelBreakdown,
  type FunnelBreakdownMetric,
  type FunnelBreakdownStage,
} from '@/components/funnel-breakdown';
import { ItemNotice } from '@/components/item-notice';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { GuidedFlowActions } from '@/components/guided-flow';
import { ContentSection } from '@/features/appshell/components/content-section';
import { useContactImport } from '@/features/contacts/hooks/use-contact-import';
import { routes } from '@/lib/routes';
import { textStyles } from '@/lib/text-styles';
import { cn } from '@/lib/utils';
import { ImportStatusBadge } from './status-badge';

export function ContactImportProgress({
  importId,
  onImportAnother,
  organizationId,
}: {
  importId: string;
  onImportAnother: () => void;
  organizationId: string;
}) {
  const t = useTranslations('Contacts');
  const common = useTranslations('Common');
  const { importQuery, latestImport } = useContactImport({
    importId,
    organizationId,
  });
  const notifiedStatus = useRef<ContactImportDetail['status'] | null>(null);

  useEffect(() => {
    if (!latestImport || notifiedStatus.current === latestImport.status) {
      return;
    }

    if (latestImport.status === 'completed') {
      const issueCount = importIssueCount(latestImport);

      toast.success(
        issueCount > 0
          ? t('importCompleteWithIssues')
          : t('importComplete'),
        {
          description:
            issueCount > 0
              ? t('importCompleteIssueToastDescription', {
                  rows: latestImport.processedRows,
                  issues: issueCount,
                })
              : t('importCompleteToastDescription', {
                  contacts: importedContactCount(latestImport),
                }),
          id: `contact-import-${latestImport.id}-completed`,
        },
      );
      notifiedStatus.current = latestImport.status;
    }

    if (latestImport.status === 'failed') {
      toast.error(t('importFailed'), {
        description:
          latestImport.errorSummary[0] ?? t('importFailedToastDescription'),
        id: `contact-import-${latestImport.id}-failed`,
      });
      notifiedStatus.current = latestImport.status;
    }
  }, [latestImport, t]);

  if (importQuery.isLoading) {
    return (
      <section className="grid gap-4">
        <p className={textStyles.mutedP}>{t('loadingImportStatus')}</p>
      </section>
    );
  }

  if (importQuery.isError || !latestImport) {
    return (
      <ItemNotice
        description={
          importQuery.error instanceof Error
            ? importQuery.error.message
            : common('tryAgainSoon')
        }
        title={t('importStatusLoadErrorTitle')}
        variant="error"
      />
    );
  }

  const showMetrics = shouldShowImportMetrics(latestImport);
  const importMetrics = showMetrics ? createImportMetrics(latestImport, t) : [];
  const showActions =
    latestImport.status === 'completed' || latestImport.status === 'failed';
  const showIssues = latestImport.errorSummary.length > 0;
  const header = importProgressHeaderView(latestImport, t);

  return (
    <div className="grid gap-5">
      <ContentSection
        actions={<ImportStatusBadge status={latestImport.status} />}
        description={header.description}
        title={header.title}
      >
        {showMetrics ? (
          <ImportFunnel importRow={latestImport} metrics={importMetrics} />
        ) : null}
      </ContentSection>

      {showIssues ? <ImportIssuesSection importRow={latestImport} /> : null}

      {showActions ? (
        <ImportActions
          importStatus={latestImport.status}
          onImportAnother={onImportAnother}
        />
      ) : null}
    </div>
  );
}

function importProgressHeaderView(
  importRow: ContactImportDetail,
  t: ReturnType<typeof useTranslations<'Contacts'>>,
) {
  const issueCount = importIssueCount(importRow);
  const title =
    importRow.status === 'processing'
      ? t('importProcessing')
      : importRow.status === 'failed'
        ? t('importFailed')
        : issueCount > 0
          ? t('importCompleteWithIssues')
          : t('importComplete');
  const description =
    importRow.status === 'processing'
      ? t('importProcessingDescription')
      : importRow.status === 'failed'
        ? t('importFailedDescription')
        : issueCount > 0
          ? t('importCompleteWithIssuesDescription')
          : t('importCompleteDescription');

  return { description, title };
}

function ImportFunnel({
  importRow,
  metrics,
}: {
  importRow: ContactImportDetail;
  metrics: FunnelBreakdownMetric[];
}) {
  const t = useTranslations('Contacts');
  const importStages = createImportStages(importRow, t);

  return (
    <FunnelBreakdown
      hideZeroMetrics={false}
      metrics={metrics}
      stages={importStages}
      title={t('importResults')}
    />
  );
}

function ImportActions({
  importStatus,
  onImportAnother,
}: {
  importStatus: ContactImportDetail['status'];
  onImportAnother: () => void;
}) {
  const t = useTranslations('Contacts');

  return (
    <GuidedFlowActions>
      <Button onClick={onImportAnother} type="button" variant="outline">
        <FileUp aria-hidden="true" data-icon="inline-start" />
        {t('importAnotherCsv')}
      </Button>
      {importStatus === 'completed' ? (
        <Button asChild>
          <Link href={routes.contacts}>
            <CheckCircle2 aria-hidden="true" data-icon="inline-start" />
            {t('viewContacts')}
          </Link>
        </Button>
      ) : null}
    </GuidedFlowActions>
  );
}

function shouldShowImportMetrics(importRow: ContactImportDetail) {
  return importRow.status !== 'processing' || importRow.processedRows > 0;
}

function ImportIssuesSection({ importRow }: { importRow: ContactImportDetail }) {
  const t = useTranslations('Contacts');
  if (importRow.errorSummary.length === 0) {
    return null;
  }

  const isFailed = importRow.status === 'failed';
  const IssueIcon = isFailed ? AlertCircle : TriangleAlert;
  const issueTone = isFailed ? 'red' : 'amber';

  return (
    <ContentSection
      description={t('importIssuesDescription')}
      title={
        <span className="inline-flex items-center gap-2">
          <IssueIcon
            aria-hidden="true"
            className={cn(
              'size-4 shrink-0',
              isFailed
                ? 'text-destructive'
                : 'text-amber-600 dark:text-amber-400',
            )}
          />
          {isFailed ? t('importFailed') : t('rowsNeedAttention')}
        </span>
      }
    >
      <div
        className="flex flex-wrap gap-2"
        role={isFailed ? 'alert' : 'status'}
      >
        {importRow.errorSummary.map((issue) => (
          <StatusBadge
            key={issue}
            label={formatImportIssueLabel(issue, t)}
            tone={issueTone}
          />
        ))}
      </div>
    </ContentSection>
  );
}

function importIssueCount(importRow: ContactImportDetail) {
  return importRow.skippedCount + importRow.invalidCount + importRow.duplicateCount;
}

function importedContactCount(importRow: ContactImportDetail) {
  return importRow.createdCount + importRow.updatedCount;
}

function createImportStages(
  importRow: ContactImportDetail,
  t: ReturnType<typeof useTranslations<'Contacts'>>,
): FunnelBreakdownStage[] {
  const importedCount = importedContactCount(importRow);
  const suppressedImportedCount = Math.min(
    importRow.suppressedCount,
    importedCount,
  );
  const readyImportedCount = Math.max(importedCount - suppressedImportedCount, 0);

  return [
    {
      label: t('importNodeRowsProcessed'),
      value: importRow.processedRows,
    },
    {
      label: t('importNodeImported'),
      value: importedCount,
    },
    {
      label: t('importNodeReady'),
      value: readyImportedCount,
    },
  ];
}

function createImportMetrics(
  importRow: ContactImportDetail,
  t: ReturnType<typeof useTranslations<'Contacts'>>,
): FunnelBreakdownMetric[] {
  return [
    {
      detail: t('importSummaryCreatedDetail'),
      icon: UserPlus,
      iconClassName: 'bg-emerald-50 text-emerald-700',
      label: t('importSummaryCreated'),
      value: importRow.createdCount,
    },
    {
      detail: t('importSummaryUpdatedDetail'),
      icon: RefreshCw,
      iconClassName: 'bg-blue-50 text-blue-700',
      label: t('importSummaryUpdated'),
      value: importRow.updatedCount,
    },
    {
      detail: t('importSummarySuppressedDetail'),
      icon: ShieldOff,
      iconClassName: 'bg-rose-50 text-rose-700',
      label: t('importSummarySuppressed'),
      value: importRow.suppressedCount,
    },
    {
      detail: t('importSummarySkippedDetail'),
      icon: CircleSlash,
      iconClassName: 'bg-zinc-100 text-zinc-700',
      label: t('importSummarySkipped'),
      value: importRow.skippedCount,
    },
    {
      detail: t('importSummaryInvalidDetail'),
      icon: AlertCircle,
      iconClassName: 'bg-rose-50 text-rose-700',
      label: t('importSummaryInvalid'),
      value: importRow.invalidCount,
    },
    {
      detail: t('importSummaryDuplicateDetail'),
      icon: Copy,
      iconClassName: 'bg-amber-50 text-amber-700',
      label: t('importSummaryDuplicate'),
      value: importRow.duplicateCount,
    },
  ];
}

function formatImportIssueLabel(
  issue: string,
  t: ReturnType<typeof useTranslations<'Contacts'>>,
) {
  switch (issue) {
    case 'ambiguous_last_booking_at':
      return t('importIssueAmbiguousLastBooking');
    case 'duplicate_contact_method':
      return t('importIssueDuplicateContactMethod');
    case 'invalid_email':
      return t('importIssueInvalidEmail');
    case 'invalid_last_booking_at':
      return t('importIssueInvalidLastBooking');
    case 'invalid_phone':
      return t('importIssueInvalidPhone');
    case 'missing_contact_method':
      return t('importIssueMissingContactMethod');
    case 'suppressed_contact_method':
      return t('importIssueSuppressedContactMethod');
    default:
      return issue
        .split('_')
        .map((word) => word.trim())
        .filter(Boolean)
        .join(' ');
  }
}
