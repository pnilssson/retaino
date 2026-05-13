"use client";

import { useQuery } from '@tanstack/react-query';
import { AlertCircle, ChevronRight, FileUp, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { parseAsInteger, useQueryStates } from 'nuqs';
import {
  type ContactImportListResponse,
  type ContactImportSummary,
} from '@retaino/shared/contracts';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  ItemContent,
  ItemDescription,
  ItemHeader,
  ItemTitle,
} from '@/components/ui/item';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AppPageContent,
  AppPageItem,
} from '@/features/appshell/components/app-page-content';
import { AppPageHeader } from '@/features/appshell/components/app-page-header';
import { useApi } from '@/features/onboarding/hooks/use-api';
import { useOrganizationSession } from '@/features/onboarding/hooks/use-organization-session';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';
import { BlockedContacts } from './blocked-contacts';
import { formatDateTime } from './contacts-format';
import {
  EmptyState,
  PaginationControls,
  TableLoading,
} from './data-table';
import { ImportStatusBadge } from './status-badge';

const pageSize = 25;

export function ContactImportsScreen() {
  const api = useApi();
  const session = useOrganizationSession();
  const [query, setQuery] = useQueryStates({
    page: parseAsInteger.withDefault(1),
  });
  const imports = useQuery({
    enabled: Boolean(session.data?.readiness.ready),
    queryKey: ['contact-imports', query.page],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(query.page),
        pageSize: String(pageSize),
      });

      return api.get<ContactImportListResponse>(`/v1/contact-imports?${params}`);
    },
  });

  if (session.isLoading) {
    return (
      <main className="flex flex-1 items-start bg-background">
        <section className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
          <p className="text-sm text-muted-foreground">Loading imports.</p>
        </section>
      </main>
    );
  }

  if (session.isError) {
    return (
      <main className="flex flex-1 items-center justify-center bg-background px-5 py-10">
        <Alert className="max-w-lg" variant="destructive">
          <AlertCircle aria-hidden="true" />
          <AlertTitle>Imports could not be loaded</AlertTitle>
          <AlertDescription>{session.error.message}</AlertDescription>
        </Alert>
      </main>
    );
  }

  if (!session.data) {
    return null;
  }

  if (!session.data.readiness.ready) {
    return <BlockedContacts session={session.data} />;
  }

  return (
    <main className="flex flex-1 items-start bg-background">
      <section className="mx-auto grid w-full max-w-7xl content-start gap-6 px-5 py-6 sm:px-8 lg:px-10">
        <AppPageHeader
          actions={
            <>
              <Button asChild>
                <Link href={routes.contactsImport}>
                  <FileUp aria-hidden="true" />
                  Import CSV
                </Link>
              </Button>
              <Button
                disabled={imports.isFetching}
                onClick={() => void imports.refetch()}
                type="button"
                variant="outline"
              >
                <RefreshCw aria-hidden="true" />
                Refresh
              </Button>
            </>
          }
          description="Review CSV import history, processing status, and contact changes."
          eyebrow="Contacts"
          title="Imports"
        />

        <AppPageContent>
          <AppPageItem asChild>
            <section>
              <ItemHeader className="items-start">
                <ItemContent className="gap-2">
                  <ItemTitle className="text-base">Import history</ItemTitle>
                  <ItemDescription>
                    Track completed, failed, and in-progress CSV imports.
                  </ItemDescription>
                </ItemContent>
              </ItemHeader>

              {imports.isError ? (
                <Alert variant="destructive">
                  <AlertCircle aria-hidden="true" />
                  <AlertTitle>Imports could not be fetched</AlertTitle>
                  <AlertDescription>
                    {imports.error instanceof Error
                      ? imports.error.message
                      : 'Try refreshing the table.'}
                  </AlertDescription>
                </Alert>
              ) : imports.isLoading ? (
                <TableLoading label="Loading imports" />
              ) : imports.data && imports.data.imports.length > 0 ? (
                <>
                  <ContactImportsTable imports={imports.data.imports} />
                  <PaginationControls
                    itemLabel="imports"
                    onPageChange={(page) => void setQuery({ page })}
                    page={imports.data.page}
                    pageSize={imports.data.pageSize}
                    total={imports.data.total}
                  />
                </>
              ) : (
                <EmptyState
                  description="Upload a customer CSV to create the first import record."
                  title="No imports yet"
                />
              )}
            </section>
          </AppPageItem>
        </AppPageContent>
      </section>
    </main>
  );
}

function ContactImportsTable({
  imports,
}: {
  imports: ContactImportSummary[];
}) {
  return (
    <Table>
      <TableHeader className="[&_tr]:border-0">
        <TableRow className="border-0 hover:bg-transparent">
          <TableHead>File</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Imported</TableHead>
          <TableHead className="text-right">Created</TableHead>
          <TableHead className="text-right">Updated</TableHead>
          <TableHead className="text-right">Invalid</TableHead>
          <TableHead className="text-right">Suppressed</TableHead>
          <TableHead>
            <span className="sr-only">Open import</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {imports.map((contactImport) => {
          const detailPath = routes.contactImport(contactImport.id);

          return (
            <TableRow
              className="group border-0 hover:bg-muted/40"
              key={contactImport.id}
            >
              <TableCell className="min-w-64 p-0">
                <Link className="grid gap-1 p-2" href={detailPath}>
                  <span className="font-medium underline-offset-4 group-hover:underline">
                    {contactImport.filename}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatFileSize(contactImport.fileSize)}
                    {contactImport.source ? ` from ${contactImport.source}` : ''}
                  </span>
                  <span className="sr-only">Open import details</span>
                </Link>
              </TableCell>
              <LinkedCell href={detailPath}>
                <ImportStatusBadge status={contactImport.status} />
              </LinkedCell>
              <LinkedCell href={detailPath}>
                {formatDateTime(contactImport.createdAt)}
              </LinkedCell>
              <LinkedCell className="text-right tabular-nums" href={detailPath}>
                <CountValue tone="green" value={contactImport.createdCount} />
              </LinkedCell>
              <LinkedCell className="text-right tabular-nums" href={detailPath}>
                <CountValue tone="blue" value={contactImport.updatedCount} />
              </LinkedCell>
              <LinkedCell className="text-right tabular-nums" href={detailPath}>
                <CountValue tone="amber" value={contactImport.invalidCount} />
              </LinkedCell>
              <LinkedCell className="text-right tabular-nums" href={detailPath}>
                <CountValue
                  tone={contactImport.suppressedCount > 0 ? 'amber' : 'gray'}
                  value={contactImport.suppressedCount}
                />
              </LinkedCell>
              <TableCell className="p-0">
                <Link
                  aria-label={`Open import details for ${contactImport.filename}`}
                  className="flex justify-end p-2 text-muted-foreground transition-colors group-hover:text-foreground"
                  href={detailPath}
                >
                  <ChevronRight aria-hidden="true" className="size-4" />
                </Link>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function LinkedCell({
  children,
  className,
  href,
}: {
  children: React.ReactNode;
  className?: string;
  href: string;
}) {
  return (
    <TableCell className={cn('p-0', className)}>
      <Link className="block p-2" href={href} tabIndex={-1}>
        {children}
      </Link>
    </TableCell>
  );
}

type CountTone = 'amber' | 'blue' | 'gray' | 'green';

const countToneClasses: Record<CountTone, string> = {
  amber:
    'bg-amber-50 text-amber-800 dark:bg-amber-950/35 dark:text-amber-300',
  blue: 'bg-sky-50 text-sky-800 dark:bg-sky-950/35 dark:text-sky-300',
  gray: 'bg-slate-50 text-slate-700 dark:bg-slate-900/60 dark:text-slate-300',
  green:
    'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/35 dark:text-emerald-300',
};

function CountValue({ tone, value }: { tone: CountTone; value: number }) {
  return (
    <span
      className={cn(
        'inline-flex min-w-7 justify-center rounded-md px-2 py-1 text-xs font-medium tabular-nums',
        countToneClasses[tone],
      )}
    >
      {value}
    </span>
  );
}

function formatFileSize(value: number) {
  if (value < 1024) {
    return `${value} B`;
  }

  const units = ['KB', 'MB', 'GB'];
  let size = value / 1024;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}
