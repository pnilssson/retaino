"use client";

import type { ContactImportDetail } from '@retaino/shared/contracts';
import { CheckCircle2, FileUp } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { ItemNotice } from '@/components/item-notice';
import {
  SankeyBreakdown,
  type SankeyBreakdownLink,
  type SankeyBreakdownNode,
  type SankeyBreakdownSummaryItem,
} from '@/components/sankey-breakdown';
import { Button } from '@/components/ui/button';
import { GuidedFlowActions } from '@/components/guided-flow';
import { useContactImport } from '@/features/contacts/hooks/use-contact-import';
import { routes } from '@/lib/routes';
import { textStyles } from '@/lib/text-styles';
import { cn } from '@/lib/utils';
import { formatImportIssue } from '../contacts-format';
import { ImportStatusBadge } from './status-badge';

export function ContactImportProgress({
  fileName,
  importId,
  onImportAnother,
  organizationId,
}: {
  fileName: string | null;
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

  return (
    <section className="grid gap-5">
      <ImportProgressHeader
        fileName={fileName}
        importRow={latestImport}
      />
      {shouldShowImportMetrics(latestImport) ? (
        <ImportMetrics importRow={latestImport} />
      ) : null}
      <ImportIssues importRow={latestImport} />
      {latestImport.status === 'completed' || latestImport.status === 'failed' ? (
        <GuidedFlowActions>
          <Button onClick={onImportAnother} type="button" variant="outline">
            <FileUp aria-hidden="true" data-icon="inline-start" />
            Import another CSV
          </Button>
          {latestImport.status === 'completed' ? (
            <Button asChild>
              <Link href={routes.contacts}>
                <CheckCircle2 aria-hidden="true" data-icon="inline-start" />
                View contacts
              </Link>
            </Button>
          ) : null}
        </GuidedFlowActions>
      ) : null}
    </section>
  );
}

function ImportProgressHeader({
  fileName,
  importRow,
}: {
  fileName: string | null;
  importRow: ContactImportDetail;
}) {
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

  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="grid min-w-0 gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className={textStyles.sectionTitle}>{title}</h3>
        </div>
        <p className={cn('max-w-2xl', textStyles.mutedBody)}>
          {description}
        </p>
        {fileName ? (
          <p className={cn('truncate', textStyles.meta)}>
            {fileName}
          </p>
        ) : null}
      </div>
      <ImportStatusBadge status={importRow.status} />
    </div>
  );
}

function ImportMetrics({ importRow }: { importRow: ContactImportDetail }) {
  const importNodes = createImportNodes();
  const importLinks = createImportLinks(importRow);
  const importSummary = createImportSummary(importRow);

  return (
    <SankeyBreakdown
      links={importLinks}
      nodes={importNodes}
      showHeader={false}
      summary={importSummary}
      title="Import results"
    />
  );
}

function shouldShowImportMetrics(importRow: ContactImportDetail) {
  return importRow.status !== 'processing' || importRow.processedRows > 0;
}

function ImportIssues({ importRow }: { importRow: ContactImportDetail }) {
  if (importRow.errorSummary.length === 0) {
    return null;
  }

  return (
    <ItemNotice
      description={
        <div className="flex flex-wrap gap-2">
          {importRow.errorSummary.map((issue) => (
            <span
              className={cn('rounded-md bg-muted px-2 py-1', textStyles.mutedBody)}
              key={issue}
            >
              {formatImportIssue(issue)}
            </span>
          ))}
        </div>
      }
      title={
        importRow.status === 'failed' ? 'Import failed' : 'Rows need attention'
      }
      variant={importRow.status === 'failed' ? 'error' : 'warning'}
    />
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
      label: 'Created',
      value: importRow.createdCount,
    },
    {
      label: 'Updated',
      value: importRow.updatedCount,
    },
    {
      label: 'Suppressed',
      value: importRow.suppressedCount,
    },
    {
      label: 'Skipped',
      value: importRow.skippedCount,
    },
    {
      label: 'Invalid',
      value: importRow.invalidCount,
    },
    {
      label: 'Duplicate',
      value: importRow.duplicateCount,
    },
  ];
}
