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
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { ItemNotice } from '@/components/item-notice';
import { MetricSummaryEntry } from '@/components/metric-summary-entry';
import {
  SankeyBreakdown,
  type SankeyBreakdownLink,
  type SankeyBreakdownNode,
  type SankeyBreakdownSummaryItem,
} from '@/components/sankey-breakdown';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { GuidedFlowActions } from '@/components/guided-flow';
import {
  AppPageContent,
  AppPageItem,
  AppPageSection,
} from '@/features/appshell/components/app-page-content';
import { useContactImport } from '@/features/contacts/hooks/use-contact-import';
import { routes } from '@/lib/routes';
import { textStyles } from '@/lib/text-styles';
import { cn } from '@/lib/utils';
import { formatImportIssue } from '../contacts-format';
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
          ? 'Import complete with issues'
          : 'Import complete',
        {
          description:
            issueCount > 0
              ? `${latestImport.processedRows} rows processed, ${issueCount} need attention.`
              : `${importedContactCount(latestImport)} contacts imported.`,
          id: `contact-import-${latestImport.id}-completed`,
        },
      );
      notifiedStatus.current = latestImport.status;
    }

    if (latestImport.status === 'failed') {
      toast.error('Import failed', {
        description:
          latestImport.errorSummary[0] ?? 'Review the import result and try again.',
        id: `contact-import-${latestImport.id}-failed`,
      });
      notifiedStatus.current = latestImport.status;
    }
  }, [latestImport]);

  if (importQuery.isLoading) {
    return (
      <section className="grid gap-4">
        <p className={textStyles.mutedBody}>Loading import status.</p>
      </section>
    );
  }

  if (importQuery.isError || !latestImport) {
    return (
      <ItemNotice
        description={
          importQuery.error instanceof Error
            ? importQuery.error.message
            : 'Try refreshing the page.'
        }
        title="Import status could not be loaded"
        variant="error"
      />
    );
  }

  const showMetrics = shouldShowImportMetrics(latestImport);
  const importSummary = showMetrics ? createImportSummary(latestImport) : [];
  const showActions =
    latestImport.status === 'completed' || latestImport.status === 'failed';
  const showIssues = latestImport.errorSummary.length > 0;
  const header = importProgressHeaderView(latestImport);

  return (
    <AppPageContent>
      <AppPageSection
        actions={<ImportStatusBadge status={latestImport.status} />}
        description={header.description}
        title={header.title}
      >
          {showMetrics ? (
            <ImportFunnel importRow={latestImport} summary={importSummary} />
          ) : null}
      </AppPageSection>

      {importSummary.length > 0 ? (
        <div className="hidden min-w-0 gap-5 sm:grid sm:grid-cols-2 xl:grid-cols-3">
          {importSummary.map((metric) => (
            <ImportMetricItem key={metric.label} metric={metric} />
          ))}
        </div>
      ) : null}

      {showIssues || showActions ? (
        <AppPageItem asChild>
          <section className="grid gap-5">
            {showIssues ? <ImportIssues importRow={latestImport} /> : null}
            {showActions ? (
              <ImportActions
                importStatus={latestImport.status}
                onImportAnother={onImportAnother}
              />
            ) : null}
          </section>
        </AppPageItem>
      ) : null}
    </AppPageContent>
  );
}

function importProgressHeaderView(importRow: ContactImportDetail) {
  const issueCount = importIssueCount(importRow);
  const title =
    importRow.status === 'processing'
      ? 'Import is processing'
      : importRow.status === 'failed'
        ? 'Import failed'
        : issueCount > 0
          ? 'Import complete with issues'
          : 'Import complete';
  const description =
    importRow.status === 'processing'
      ? 'Validating, deduplicating, and checking suppressions.'
      : importRow.status === 'failed'
        ? 'The contacts were not imported. Review the issue below and try again.'
        : issueCount > 0
          ? 'Contacts were imported, but some rows need attention.'
          : 'Contacts were imported.';

  return { description, title };
}

function ImportFunnel({
  importRow,
  summary,
}: {
  importRow: ContactImportDetail;
  summary: SankeyBreakdownSummaryItem[];
}) {
  const importNodes = createImportNodes();
  const importLinks = createImportLinks(importRow);

  return (
    <SankeyBreakdown
      links={importLinks}
      nodes={importNodes}
      showHeader={false}
      summary={summary}
      title="Import results"
    />
  );
}

function ImportMetricItem({
  metric,
}: {
  metric: SankeyBreakdownSummaryItem;
}) {
  return (
    <AppPageItem asChild>
      <dl>
        <ImportMetric metric={metric} />
      </dl>
    </AppPageItem>
  );
}

function ImportMetric({ metric }: { metric: SankeyBreakdownSummaryItem }) {
  return (
    <MetricSummaryEntry
      className="min-h-0 border-t-0 p-0"
      icon={metric.icon}
      iconClassName={metric.iconClassName}
      label={metric.label}
      value={metric.value}
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
  return (
    <GuidedFlowActions>
      <Button onClick={onImportAnother} type="button" variant="outline">
        <FileUp aria-hidden="true" data-icon="inline-start" />
        Import another CSV
      </Button>
      {importStatus === 'completed' ? (
        <Button asChild>
          <Link href={routes.contacts}>
            <CheckCircle2 aria-hidden="true" data-icon="inline-start" />
            View contacts
          </Link>
        </Button>
      ) : null}
    </GuidedFlowActions>
  );
}

function shouldShowImportMetrics(importRow: ContactImportDetail) {
  return importRow.status !== 'processing' || importRow.processedRows > 0;
}

function ImportIssues({ importRow }: { importRow: ContactImportDetail }) {
  if (importRow.errorSummary.length === 0) {
    return null;
  }

  const isFailed = importRow.status === 'failed';
  const IssueIcon = isFailed ? AlertCircle : TriangleAlert;
  const issueTone = isFailed ? 'red' : 'amber';

  return (
    <div className="grid gap-2" role={isFailed ? 'alert' : 'status'}>
      <div className="flex items-center gap-2">
        <IssueIcon
          aria-hidden="true"
          className={cn(
            'size-4 shrink-0',
            isFailed
              ? 'text-destructive'
              : 'text-amber-600 dark:text-amber-400',
          )}
        />
        <h3 className={textStyles.itemTitle}>
          {isFailed ? 'Import failed' : 'Rows need attention'}
        </h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {importRow.errorSummary.map((issue) => (
          <StatusBadge
            key={issue}
            label={formatImportIssue(issue)}
            tone={issueTone}
          />
        ))}
      </div>
    </div>
  );
}

function importIssueCount(importRow: ContactImportDetail) {
  return importRow.skippedCount + importRow.invalidCount + importRow.duplicateCount;
}

function importedContactCount(importRow: ContactImportDetail) {
  return importRow.createdCount + importRow.updatedCount;
}

function createImportNodes(): SankeyBreakdownNode[] {
  return [
    {
      color: 'var(--chart-3)',
      name: 'Rows processed',
    },
    {
      color: 'var(--chart-2)',
      name: 'Imported',
    },
    {
      color: 'var(--chart-4)',
      name: 'Needs attention',
    },
    {
      color: 'var(--chart-2)',
      name: 'Ready',
    },
    {
      color: 'var(--muted-foreground)',
      name: 'Suppressed',
    },
    {
      color: 'var(--chart-4)',
      name: 'Skipped',
    },
    {
      color: 'var(--destructive)',
      name: 'Invalid',
    },
    {
      color: 'var(--chart-5)',
      name: 'Duplicate',
    },
  ];
}

function createImportLinks(
  importRow: ContactImportDetail,
): SankeyBreakdownLink[] {
  const importedCount = importedContactCount(importRow);
  const suppressedImportedCount = Math.min(
    importRow.suppressedCount,
    importedCount,
  );
  const readyImportedCount = Math.max(importedCount - suppressedImportedCount, 0);
  const attentionCount = importIssueCount(importRow);

  return [
    { source: 0, target: 1, value: importedCount },
    { source: 0, target: 2, value: attentionCount },
    { source: 1, target: 3, value: readyImportedCount },
    { source: 1, target: 4, value: suppressedImportedCount },
    { source: 2, target: 5, value: importRow.skippedCount },
    { source: 2, target: 6, value: importRow.invalidCount },
    { source: 2, target: 7, value: importRow.duplicateCount },
  ];
}

function createImportSummary(
  importRow: ContactImportDetail,
): SankeyBreakdownSummaryItem[] {
  return [
    {
      icon: UserPlus,
      iconClassName: 'bg-emerald-50 text-emerald-700',
      label: 'Created',
      value: importRow.createdCount,
    },
    {
      icon: RefreshCw,
      iconClassName: 'bg-blue-50 text-blue-700',
      label: 'Updated',
      value: importRow.updatedCount,
    },
    {
      icon: ShieldOff,
      iconClassName: 'bg-rose-50 text-rose-700',
      label: 'Suppressed',
      value: importRow.suppressedCount,
    },
    {
      icon: CircleSlash,
      iconClassName: 'bg-zinc-100 text-zinc-700',
      label: 'Skipped',
      value: importRow.skippedCount,
    },
    {
      icon: AlertCircle,
      iconClassName: 'bg-rose-50 text-rose-700',
      label: 'Invalid',
      value: importRow.invalidCount,
    },
    {
      icon: Copy,
      iconClassName: 'bg-amber-50 text-amber-700',
      label: 'Duplicate',
      value: importRow.duplicateCount,
    },
  ];
}
