"use client";

import { useForm } from '@tanstack/react-form';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileUp,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { parse } from 'csv-parse/sync';
import {
  CONTACT_IMPORT_TARGET_FIELDS,
  autoMapContactImportHeaders,
  contactImportMappedFieldEntries,
  contactImportMappingReady,
  type ContactImportDetail,
  type CsvMapping,
} from '@retaino/shared/contracts';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { CountryCombobox } from '@/components/country-combobox';
import {
  ItemContent,
  ItemDescription,
  ItemHeader,
  ItemTitle,
} from '@/components/ui/item';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { useContactImport } from '@/features/contacts/hooks/use-contact-import';
import { useStartContactImport } from '@/features/contacts/hooks/use-start-contact-import';
import { useOrganizationSession } from '@/features/onboarding/hooks/use-organization-session';
import { cn } from '@/lib/utils';
import { routes } from '@/lib/routes';
import { BlockedContacts } from './blocked-contacts';
import { formatImportIssue, formatTargetField } from '../contacts-format';
import { ImportStatusBadge } from './status-badge';

const MAX_UPLOAD_SIZE = 25 * 1024 * 1024;
const SAMPLE_ROWS = 5;

type CsvPreview = {
  headers: string[];
  sampleRows: Record<string, string>[];
};

export function ContactImportUploadScreen() {
  const session = useOrganizationSession();
  const [currentImportId, setCurrentImportId] = useState<string | null>(null);

  if (session.isLoading) {
    return (
      <main className="flex flex-1 items-start bg-background">
        <section className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8 lg:px-10">
          <p className="text-sm text-muted-foreground">Loading import form.</p>
        </section>
      </main>
    );
  }

  if (session.isError) {
    return (
      <main className="flex flex-1 items-center justify-center bg-background px-5 py-10">
        <Alert className="max-w-lg" variant="destructive">
          <AlertCircle aria-hidden="true" />
          <AlertTitle>Import form could not be loaded</AlertTitle>
          <AlertDescription>{session.error.message}</AlertDescription>
        </Alert>
      </main>
    );
  }

  if (!session.data) {
    return null;
  }

  if (!session.data.eligibility.contactImports.allowed) {
    return <BlockedContacts session={session.data} />;
  }

  return (
    <main className="flex flex-1 items-start bg-background">
      <section className="mx-auto grid w-full max-w-5xl content-start gap-6 px-5 py-6 sm:px-8 lg:px-10">
        <AppPageHeader
          actions={
            <Button asChild variant="outline">
              <Link href={routes.contacts}>
                <ArrowLeft aria-hidden="true" data-icon="inline-start" />
                Back to contacts
              </Link>
            </Button>
          }
          description="Upload a CSV, map the contact fields, and start a background import."
          eyebrow="Contacts"
          title="Import contacts"
        />

        <AppPageContent>
          <AppPageItem asChild>
            <section>
              <ItemHeader className="items-start">
                <ItemContent className="gap-2">
                  <ItemTitle className="text-base">CSV import</ItemTitle>
                  <ItemDescription className="max-w-2xl">
                    Retaino reads the CSV in your browser for mapping, then
                    stores the file only while the import job runs.
                  </ItemDescription>
                </ItemContent>
              </ItemHeader>
              <ImportForm
                currentImportId={currentImportId}
                defaultCountryCode={session.data.profile?.countryCode ?? 'SE'}
                onCurrentImportChange={setCurrentImportId}
                organizationId={session.data.organization.id}
              />
            </section>
          </AppPageItem>
        </AppPageContent>
      </section>
    </main>
  );
}

function ImportForm({
  currentImportId,
  defaultCountryCode,
  onCurrentImportChange,
  organizationId,
}: {
  currentImportId: string | null;
  defaultCountryCode: string;
  onCurrentImportChange: (importId: string | null) => void;
  organizationId: string;
}) {
  const [activeFileName, setActiveFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<CsvPreview | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const upload = useStartContactImport({
    onSuccess: (response) => onCurrentImportChange(response.import.id),
    organizationId,
  });
  const form = useForm({
    defaultValues: {
      file: null as File | null,
      mapping: {} as CsvMapping,
      phoneCountryCode: defaultCountryCode,
      permissionAttestation: false as boolean,
    },
    onSubmit: async ({ value }) => {
      if (!value.file || parseError || !contactImportMappingReady(value.mapping)) {
        return;
      }

      setActiveFileName(value.file.name);

      try {
        await upload.mutation.mutateAsync({
          file: value.file,
          mapping: value.mapping,
          phoneCountryCode: value.phoneCountryCode,
          permissionAttestation: value.permissionAttestation,
        });
      } catch (error) {
        setActiveFileName(null);
        throw error;
      }
    },
  });

  if (currentImportId) {
    return (
      <ImportProgress
        fileName={activeFileName}
        importId={currentImportId}
        onImportAnother={() => {
          form.reset();
          upload.mutation.reset();
          setActiveFileName(null);
          setParseError(null);
          setPreview(null);
          onCurrentImportChange(null);
        }}
        organizationId={organizationId}
      />
    );
  }

  return (
    <form
      className="grid gap-6"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <form.Field
        name="file"
        validators={{
          onSubmit: ({ value }) => (value ? undefined : 'Choose a CSV file.'),
        }}
      >
        {(field) => {
          const error = field.state.meta.errors[0];

          return (
            <div className="grid gap-2">
              <Label htmlFor={field.name}>CSV file</Label>
              <label
                className="flex min-h-28 cursor-pointer flex-col justify-center gap-3 rounded-lg border border-dashed border-input px-4 py-5 transition-colors hover:bg-muted/50 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50"
                htmlFor={field.name}
              >
                <input
                  accept=".csv,text/csv"
                  className="sr-only"
                  id={field.name}
                  name={field.name}
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    field.handleChange(file);
                    void updatePreview(file, setPreview, setParseError).then(
                      (csvPreview) => {
                        form.setFieldValue(
                          'mapping',
                          csvPreview
                            ? autoMapContactImportHeaders(csvPreview.headers)
                            : {},
                        );
                      },
                    );
                  }}
                  type="file"
                />
                <span className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-lg bg-muted">
                    <FileUp aria-hidden="true" className="size-5" />
                  </span>
                  <span className="grid gap-1">
                    <span className="text-sm font-medium">
                      {field.state.value
                        ? field.state.value.name
                        : 'Choose a CSV file'}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      CSV only, up to 25 MB.
                    </span>
                  </span>
                </span>
              </label>
              {error ? (
                <p className="text-sm text-destructive">{String(error)}</p>
              ) : null}
              {parseError ? (
                <p className="text-sm text-destructive">{parseError}</p>
              ) : null}
            </div>
          );
        }}
      </form.Field>

      {preview ? (
        <>
          <div className="grid max-w-3xl gap-3">
            <div className="hidden grid-cols-[180px_2rem_minmax(0,1fr)] items-center gap-3 px-1 text-xs font-medium uppercase text-muted-foreground sm:grid">
              <span>Retaino field</span>
              <span aria-hidden="true" />
              <span>CSV column</span>
            </div>
            {CONTACT_IMPORT_TARGET_FIELDS.map((target) => (
              <form.Field key={target} name={`mapping.${target}`}>
                {(field) => (
                  <div className="grid gap-2 sm:grid-cols-[180px_2rem_minmax(0,1fr)] sm:items-center">
                    <Label>
                      <span className="text-xs font-medium uppercase text-muted-foreground sm:hidden">
                        Retaino field
                      </span>
                      <span>{formatTargetField(target)}</span>
                    </Label>
                    <ArrowRight
                      aria-hidden="true"
                      className="hidden size-4 justify-self-center text-muted-foreground sm:block"
                    />
                    <div className="grid gap-1">
                      <span className="text-xs font-medium uppercase text-muted-foreground sm:hidden">
                        CSV column
                      </span>
                      <Select
                        onValueChange={(value) =>
                          field.handleChange(
                            value === 'none' ? undefined : value,
                          )
                        }
                        value={field.state.value ?? 'none'}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Not mapped</SelectItem>
                          {preview.headers.map((header) => (
                            <SelectItem key={header} value={header}>
                              {header}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </form.Field>
            ))}
          </div>
          <form.Field name="phoneCountryCode">
            {(field) => (
              <div className="grid max-w-2xl gap-2 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-center">
                <Label htmlFor={field.name}>Phone country</Label>
                <CountryCombobox
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(value) =>
                    field.handleChange(value as typeof field.state.value)
                  }
                  value={field.state.value}
                />
                <p className="text-sm text-muted-foreground sm:col-start-2">
                  Used for phone numbers without a country code.
                </p>
              </div>
            )}
          </form.Field>

          <form.Subscribe selector={(state) => state.values.mapping}>
            {(mapping) => (
              <MappedPreviewTable
                fields={contactImportMappedFieldEntries(mapping)}
                sampleRows={preview.sampleRows}
              />
            )}
          </form.Subscribe>

          <form.Field
            name="permissionAttestation"
            validators={{
              onSubmit: ({ value }) =>
                value
                  ? undefined
                  : 'Confirm these contacts can lawfully receive marketing SMS.',
            }}
          >
            {(field) => (
              <div className="flex items-start gap-3">
                <Checkbox
                  aria-describedby={
                    field.state.meta.errors.length > 0
                      ? 'permission-attestation-error'
                      : undefined
                  }
                  checked={field.state.value}
                  id={field.name}
                  onBlur={field.handleBlur}
                  onCheckedChange={(checked) =>
                    field.handleChange(checked === true)
                  }
                />
                <div className="grid gap-1">
                  <Label htmlFor={field.name}>
                    I confirm these contacts can lawfully receive marketing SMS
                    from this organization.
                  </Label>
                  {field.state.meta.errors.length > 0 ? (
                    <p
                      className="text-xs text-destructive"
                      id="permission-attestation-error"
                    >
                      {String(field.state.meta.errors[0])}
                    </p>
                  ) : null}
                </div>
              </div>
            )}
          </form.Field>
        </>
      ) : null}

      {upload.error ? (
        <Alert variant="destructive">
          <AlertCircle aria-hidden="true" />
          <AlertTitle>Import could not start</AlertTitle>
          <AlertDescription>{upload.error}</AlertDescription>
        </Alert>
      ) : null}

      <form.Subscribe
        selector={(state) => ({
          canSubmit: state.canSubmit,
          file: state.values.file,
          isSubmitting: state.isSubmitting,
          mapping: state.values.mapping,
          permissionAttestation: state.values.permissionAttestation,
        })}
      >
        {({ canSubmit, file, isSubmitting, mapping, permissionAttestation }) => (
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              disabled={
                !file ||
                !canSubmit ||
                isSubmitting ||
                upload.mutation.isPending ||
                Boolean(parseError) ||
                !contactImportMappingReady(mapping) ||
                !permissionAttestation
              }
              type="submit"
            >
              {upload.mutation.isPending || isSubmitting ? (
                <Loader2
                  aria-hidden="true"
                  className="animate-spin"
                  data-icon="inline-start"
                />
              ) : (
                <CheckCircle2 aria-hidden="true" data-icon="inline-start" />
              )}
              Start import
            </Button>
          </div>
        )}
      </form.Subscribe>
    </form>
  );
}

function MappedPreviewTable({
  fields,
  sampleRows,
}: {
  fields: Array<{ header: string; target: keyof CsvMapping }>;
  sampleRows: Record<string, string>[];
}) {
  if (fields.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-2">
      <h3 className="text-sm font-medium">Sample values</h3>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="[&_tr]:border-0">
            <TableRow className="border-0 hover:bg-transparent">
              {fields.map((field) => (
                <TableHead key={field.target}>
                  {formatTargetField(field.target)}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sampleRows.map((row, index) => (
              <TableRow className="border-0 hover:bg-transparent" key={index}>
                {fields.map((field) => (
                  <TableCell key={field.target}>{row[field.header]}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function ImportProgress({
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
              : `${latestImport.processedRows} contacts are ready.`,
        },
      );
      notifiedStatus.current = latestImport.status;
    }

    if (latestImport.status === 'failed') {
      toast.error('Import failed', {
        description:
          latestImport.errorSummary[0] ?? 'Review the import result and try again.',
      });
      notifiedStatus.current = latestImport.status;
    }
  }, [latestImport]);

  if (importQuery.isLoading) {
    return (
      <section className="grid gap-4">
        <Separator />
        <p className="text-sm text-muted-foreground">Loading import status.</p>
      </section>
    );
  }

  if (importQuery.isError || !latestImport) {
    return (
      <Alert variant="destructive">
        <AlertCircle aria-hidden="true" />
        <AlertTitle>Import status could not be loaded</AlertTitle>
        <AlertDescription>
          {importQuery.error instanceof Error
            ? importQuery.error.message
            : 'Try refreshing the page.'}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <section className="grid gap-5">
      <ImportProgressHeader fileName={fileName} importRow={latestImport} />
      <ImportMetrics importRow={latestImport} />
      <ImportIssues importRow={latestImport} />
      {latestImport.status === 'completed' || latestImport.status === 'failed' ? (
        <div className="flex flex-wrap justify-end gap-2">
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
        </div>
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
      ? 'Import running'
      : importRow.status === 'failed'
        ? 'Import failed'
        : issueCount > 0
          ? 'Import complete with issues'
          : 'Import complete';
  const description =
    importRow.status === 'processing'
      ? 'Retaino is validating, deduplicating, and checking suppressions in the background.'
      : importRow.status === 'failed'
        ? 'The contacts were not imported. Review the issue below and try again.'
        : issueCount > 0
          ? 'Contacts were imported, but some rows need attention.'
          : 'Contacts are ready to use for segmentation and campaigns.';

  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="grid min-w-0 gap-2">
        <h3 className="text-base font-medium">{title}</h3>
        <p className="max-w-2xl text-sm text-muted-foreground">
          {description}
        </p>
        {fileName ? (
          <p className="truncate text-xs text-muted-foreground">
            File: {fileName}
          </p>
        ) : null}
      </div>
      <ImportStatusBadge status={importRow.status} />
    </div>
  );
}

function ImportMetrics({ importRow }: { importRow: ContactImportDetail }) {
  const rowsLabel =
    importRow.status === 'processing' && importRow.processedRows === 0
      ? 'Pending'
      : importRow.processedRows;

  return (
    <dl className="grid gap-3 text-sm sm:grid-cols-4">
      <Metric label="Rows" tone="neutral" value={rowsLabel} />
      <Metric label="Created" tone="green" value={importRow.createdCount} />
      <Metric label="Updated" tone="blue" value={importRow.updatedCount} />
      <Metric label="Skipped" tone="amber" value={importRow.skippedCount} />
      <Metric label="Invalid" tone="red" value={importRow.invalidCount} />
      <Metric label="Duplicate" tone="violet" value={importRow.duplicateCount} />
      <Metric label="Suppressed" tone="slate" value={importRow.suppressedCount} />
    </dl>
  );
}

function ImportIssues({ importRow }: { importRow: ContactImportDetail }) {
  if (importRow.errorSummary.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-2">
      <h3 className="text-sm font-medium">
        {importRow.status === 'failed' ? 'Import error' : 'Rows needing attention'}
      </h3>
      <div className="flex flex-wrap gap-2">
        {importRow.errorSummary.map((issue) => (
          <span
            className="rounded-md bg-muted px-2 py-1 text-sm text-muted-foreground"
            key={issue}
          >
            {formatImportIssue(issue)}
          </span>
        ))}
      </div>
    </div>
  );
}

type MetricTone =
  | 'amber'
  | 'blue'
  | 'green'
  | 'neutral'
  | 'red'
  | 'slate'
  | 'violet';

const metricToneClasses: Record<
  MetricTone,
  { panel: string; value: string }
> = {
  amber: {
    panel: 'bg-amber-50/55 dark:bg-amber-950/25',
    value: 'text-amber-800 dark:text-amber-200',
  },
  blue: {
    panel: 'bg-sky-50/55 dark:bg-sky-950/25',
    value: 'text-sky-800 dark:text-sky-200',
  },
  green: {
    panel: 'bg-emerald-50/55 dark:bg-emerald-950/25',
    value: 'text-emerald-800 dark:text-emerald-200',
  },
  neutral: {
    panel: 'bg-muted/20',
    value: 'text-foreground',
  },
  red: {
    panel: 'bg-rose-50/55 dark:bg-rose-950/25',
    value: 'text-rose-800 dark:text-rose-200',
  },
  slate: {
    panel: 'bg-slate-50/70 dark:bg-slate-950/30',
    value: 'text-slate-800 dark:text-slate-200',
  },
  violet: {
    panel: 'bg-violet-50/55 dark:bg-violet-950/25',
    value: 'text-violet-800 dark:text-violet-200',
  },
};

function Metric({
  label,
  tone,
  value,
}: {
  label: string;
  tone: MetricTone;
  value: number | string;
}) {
  const toneClasses = metricToneClasses[tone];

  return (
    <div
      className={cn(
        'grid min-h-16 gap-1 rounded-md border px-3 py-2',
        toneClasses.panel,
      )}
    >
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn('font-medium tabular-nums', toneClasses.value)}>
        {value}
      </dd>
    </div>
  );
}

function importIssueCount(importRow: ContactImportDetail) {
  return (
    importRow.skippedCount +
    importRow.invalidCount +
    importRow.duplicateCount +
    importRow.suppressedCount
  );
}

async function updatePreview(
  file: File | null,
  setPreview: (preview: CsvPreview | null) => void,
  setParseError: (error: string | null) => void,
): Promise<CsvPreview | null> {
  setParseError(null);
  setPreview(null);

  if (!file) {
    return null;
  }

  if (file.size > MAX_UPLOAD_SIZE) {
    setParseError('CSV uploads are limited to 25 MB.');
    return null;
  }

  try {
    const csvPreview = parseCsvPreview(await file.text());
    setPreview(csvPreview);
    return csvPreview;
  } catch {
    setParseError('CSV file could not be parsed.');
    return null;
  }
}

function parseCsvPreview(text: string): CsvPreview {
  const records = parse(text, {
    bom: true,
    relax_column_count: true,
    skip_empty_lines: true,
    trim: true,
    to_line: SAMPLE_ROWS + 1,
  }) as string[][];
  const [rawHeaders = [], ...valueRows] = records;
  const headers = rawHeaders
    .map((header) => header.trim())
    .filter((header) => header.length > 0);
  const sampleRows = valueRows.map((values) =>
    Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])),
  );

  if (headers.length === 0) {
    throw new Error('Missing header row.');
  }

  return { headers, sampleRows };
}
