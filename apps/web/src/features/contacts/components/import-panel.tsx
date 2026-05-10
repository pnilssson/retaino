"use client";

import { useAuth } from '@clerk/nextjs';
import { useForm } from '@tanstack/react-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileUp,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs';
import {
  CONTACT_IMPORT_TARGET_FIELDS,
  type ContactImportDetail,
  type ContactImportProcessInput,
  type ContactImportRowsResponse,
  type CreateContactImportResponse,
  type CsvMapping,
} from '@retaino/shared/contracts';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CountryCombobox } from '@/components/country-combobox';
import { Input } from '@/components/ui/input';
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemHeader,
  ItemTitle,
} from '@/components/ui/item';
import { Label } from '@/components/ui/label';
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
import { AppPageHeader } from '@/features/appshell/components/app-page-header';
import { useApi } from '@/features/onboarding/hooks/use-api';
import { useOrganizationSession } from '@/features/onboarding/hooks/use-organization-session';
import { ApiClientError } from '@/lib/api-client';
import { routes } from '@/lib/routes';
import { BlockedContacts } from './blocked-contacts';
import { formatTargetField } from './contacts-format';
import { ImportStatusPanel } from './import-status-panel';
import { ImportStatusBadge } from './status-badge';

type ContactImportDetailResponse = {
  import: ContactImportDetail;
};

export function ContactImportUploadScreen() {
  const session = useOrganizationSession();
  const router = useRouter();
  const upload = useUploadContactImport({
    onSuccess: (response) => router.push(routes.contactImport(response.import.id)),
  });

  if (session.isLoading) {
    return (
      <main className="flex flex-1 items-start bg-background">
        <section className="mx-auto w-full max-w-4xl px-5 py-8 sm:px-8 lg:px-10">
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

  if (!session.data.readiness.ready) {
    return <BlockedContacts session={session.data} />;
  }

  return (
    <main className="flex flex-1 items-start bg-background">
      <section className="mx-auto grid w-full max-w-4xl content-start gap-6 px-5 py-6 sm:px-8 lg:px-10">
        <AppPageHeader
          actions={
            <Button asChild variant="outline">
              <Link href={routes.contacts}>
                <ArrowLeft aria-hidden="true" />
                Back to contacts
              </Link>
            </Button>
          }
          description="Upload a customer CSV, preview the columns, then confirm how each column should be imported."
          eyebrow="Contacts"
          title="Import contacts"
        />

        <ItemGroup className="gap-5">
          <Item
            asChild
            className="grid items-stretch gap-5 border-border bg-card px-5 py-5"
          >
            <section>
              <ItemHeader className="items-start">
                <ItemContent className="gap-2">
                  <ItemTitle className="text-base">Upload CSV</ItemTitle>
                  <ItemDescription className="max-w-2xl">
                    CSV files are stored privately and processed only after you
                    review the detected columns.
                  </ItemDescription>
                </ItemContent>
              </ItemHeader>
              <UploadForm mutation={upload.mutation} />
              {upload.error ? (
                <Alert variant="destructive">
                  <AlertCircle aria-hidden="true" />
                  <AlertTitle>Upload failed</AlertTitle>
                  <AlertDescription>{upload.error}</AlertDescription>
                </Alert>
              ) : null}
            </section>
          </Item>
        </ItemGroup>
      </section>
    </main>
  );
}

export function ContactImportDetailScreen({ importId }: { importId: string }) {
  const api = useApi();
  const queryClient = useQueryClient();
  const session = useOrganizationSession();
  const [query, setQuery] = useQueryStates({
    rowStatus: parseAsString.withDefault('invalid'),
    rowPage: parseAsInteger.withDefault(1),
  });
  const importDetail = useQuery({
    enabled: Boolean(session.data?.readiness.ready),
    queryKey: ['contact-import', importId],
    queryFn: () =>
      api.get<ContactImportDetailResponse>(`/v1/contact-imports/${importId}`),
  });
  const latestImport = importDetail.data?.import ?? null;
  const rows = useQuery({
    enabled: Boolean(latestImport?.id),
    queryKey: [
      'contact-import-rows',
      latestImport?.id,
      query.rowStatus,
      query.rowPage,
    ],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(query.rowPage),
        pageSize: '25',
      });

      if (query.rowStatus !== 'all') params.set('status', query.rowStatus);

      return api.get<ContactImportRowsResponse>(
        `/v1/contact-imports/${latestImport?.id}/rows?${params}`,
      );
    },
  });

  if (session.isLoading) {
    return (
      <main className="flex flex-1 items-start bg-background">
        <section className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 lg:px-10">
          <p className="text-sm text-muted-foreground">Loading import.</p>
        </section>
      </main>
    );
  }

  if (session.isError) {
    return (
      <main className="flex flex-1 items-center justify-center bg-background px-5 py-10">
        <Alert className="max-w-lg" variant="destructive">
          <AlertCircle aria-hidden="true" />
          <AlertTitle>Import could not be loaded</AlertTitle>
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

  const title = latestImport?.filename ?? 'Contact import';
  const showMapping = latestImport?.status === 'uploaded';

  return (
    <main className="flex flex-1 items-start bg-background">
      <section className="mx-auto grid w-full max-w-6xl content-start gap-6 px-5 py-6 sm:px-8 lg:px-10">
        <AppPageHeader
          actions={
            <Button asChild variant="outline">
              <Link href={routes.contactImports}>
                <ArrowLeft aria-hidden="true" />
                Back to imports
              </Link>
            </Button>
          }
          badge={
            latestImport ? (
              <ImportStatusBadge status={latestImport.status} />
            ) : undefined
          }
          description="Review mapping, processing progress, and row-level import results."
          eyebrow="Contact import"
          title={title}
        />

        {importDetail.isError ? (
          <Alert variant="destructive">
            <AlertCircle aria-hidden="true" />
            <AlertTitle>Import could not be fetched</AlertTitle>
            <AlertDescription>
              {importDetail.error instanceof Error
                ? importDetail.error.message
                : 'Try refreshing the page.'}
            </AlertDescription>
          </Alert>
        ) : importDetail.isLoading ? (
          <section className="py-8">
            <p className="text-sm text-muted-foreground">Loading import.</p>
          </section>
        ) : latestImport && showMapping ? (
          <MappingPanel
            importDetail={latestImport}
            onProcessed={async () => {
              await queryClient.invalidateQueries({
                queryKey: ['contact-import', importId],
              });
              await queryClient.invalidateQueries({
                queryKey: ['contact-imports'],
              });
              await queryClient.invalidateQueries({ queryKey: ['contacts'] });
            }}
          />
        ) : latestImport ? (
          <ImportStatusPanel
            latestImport={latestImport}
            onPageChange={(page) => void setQuery({ rowPage: page })}
            onStatusChange={(rowStatus) =>
              void setQuery({ rowPage: 1, rowStatus })
            }
            rowStatus={query.rowStatus}
            rows={rows.data}
          />
        ) : null}
      </section>
    </main>
  );
}

function UploadForm({
  mutation,
}: {
  mutation: ReturnType<typeof useUploadContactImport>['mutation'];
}) {
  const form = useForm({
    defaultValues: {
      file: null as File | null,
      source: '',
    },
    onSubmit: async ({ value }) => {
      if (!value.file) {
        return;
      }

      await mutation.mutateAsync({ file: value.file, source: value.source });
    },
  });

  return (
    <form
      className="grid gap-4"
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
                <Input
                  accept=".csv,text/csv"
                  className="sr-only"
                  id={field.name}
                  name={field.name}
                  onChange={(event) =>
                    field.handleChange(event.target.files?.[0] ?? null)
                  }
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
            </div>
          );
        }}
      </form.Field>
      <form.Field name="source">
        {(field) => (
          <div className="grid gap-2">
            <Label htmlFor={field.name}>Original system</Label>
            <Input
              id={field.name}
              name={field.name}
              onChange={(event) => field.handleChange(event.target.value)}
              placeholder="Bokadirekt, Fresha, spreadsheet export"
              value={field.state.value}
            />
            <p className="text-sm text-muted-foreground">
              Optional, shown in contact history. Example: Bokadirekt, Fresha,
              spreadsheet export.
            </p>
          </div>
        )}
      </form.Field>
      <form.Subscribe
        selector={(state) => ({
          canSubmit: state.canSubmit,
          file: state.values.file,
          isSubmitting: state.isSubmitting,
        })}
      >
        {({ canSubmit, file, isSubmitting }) => (
          <Button
            disabled={!file || !canSubmit || isSubmitting || mutation.isPending}
            type="submit"
          >
            {mutation.isPending || isSubmitting ? (
              <Loader2 aria-hidden="true" className="animate-spin" />
            ) : (
              <FileUp aria-hidden="true" />
            )}
            Upload and preview
          </Button>
        )}
      </form.Subscribe>
    </form>
  );
}

function MappingPanel({
  importDetail,
  onProcessed,
}: {
  importDetail: ContactImportDetail;
  onProcessed: () => void | Promise<void>;
}) {
  const processImport = useProcessContactImport(importDetail.id, onProcessed);
  const headers = importDetail.preview?.headers ?? [];
  const sampleRows = importDetail.preview?.sampleRows ?? [];
  const [step, setStep] = useState<'map' | 'review'>('map');
  const form = useForm({
    defaultValues: {
      mapping: autoMapHeaders(headers),
      phoneCountryCode: importDetail.phoneCountryCode,
    } satisfies ContactImportProcessInput,
    onSubmit: async ({ value }) => processImport.mutateAsync(value),
  });

  return (
    <Item
      asChild
      className="grid items-stretch gap-5 border-border bg-card px-5 py-5"
    >
      <section>
        <ItemHeader className="items-start">
          <ItemContent className="gap-2">
            <ItemTitle className="flex-wrap text-base">
              {step === 'map' ? 'Map CSV columns' : 'Review import'}
              <Badge variant="outline">
                {step === 'map' ? 'Step 1 of 2' : 'Step 2 of 2'}
              </Badge>
            </ItemTitle>
            <ItemDescription className="max-w-2xl">
              {step === 'map'
                ? 'Map a phone column to send SMS. Other fields help with filtering and matching.'
                : 'Review the imported preview before Retaino starts processing this import.'}
            </ItemDescription>
          </ItemContent>
        </ItemHeader>

        <form
          className="grid gap-5"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void form.handleSubmit();
          }}
        >
          {step === 'map' ? (
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
                            {headers.map((header) => (
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
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button
                      disabled={!mappingReady(mapping)}
                      onClick={() => setStep('review')}
                      type="button"
                    >
                      Review import
                    </Button>
                  </div>
                )}
              </form.Subscribe>
            </>
          ) : (
            <form.Subscribe selector={(state) => state.values}>
              {({ mapping }) => (
                <ReviewStep
                  isSubmitting={processImport.isPending}
                  mapping={mapping}
                  onBack={() => setStep('map')}
                  processError={processImport.error}
                  sampleRows={sampleRows}
                />
              )}
            </form.Subscribe>
          )}
        </form>
      </section>
    </Item>
  );
}

function ReviewStep({
  isSubmitting,
  mapping,
  onBack,
  processError,
  sampleRows,
}: {
  isSubmitting: boolean;
  mapping: CsvMapping;
  onBack: () => void;
  processError: Error | null;
  sampleRows: Record<string, string>[];
}) {
  const mappedFields = mappedFieldEntries(mapping);

  return (
    <div className="grid gap-5">
      <MappedPreviewTable fields={mappedFields} sampleRows={sampleRows} />
      {processError ? (
        <Alert variant="destructive">
          <AlertCircle aria-hidden="true" />
          <AlertTitle>Import could not start</AlertTitle>
          <AlertDescription>{processError.message}</AlertDescription>
        </Alert>
      ) : null}
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          disabled={isSubmitting}
          onClick={onBack}
          type="button"
          variant="outline"
        >
          Back to mapping
        </Button>
        <Button disabled={isSubmitting || !mappingReady(mapping)} type="submit">
          {isSubmitting ? (
            <Loader2 aria-hidden="true" className="animate-spin" />
          ) : (
            <CheckCircle2 aria-hidden="true" />
          )}
          Start import
        </Button>
      </div>
    </div>
  );
}

function MappedPreviewTable({
  fields,
  sampleRows,
}: {
  fields: Array<{ header: string; target: keyof CsvMapping }>;
  sampleRows: Record<string, string>[];
}) {
  return (
    <div className="grid gap-2">
      <h3 className="text-sm font-medium">Imported preview</h3>
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

function useUploadContactImport({
  onSuccess,
}: {
  onSuccess: (response: CreateContactImportResponse) => void;
}) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (value: { file: File; source: string }) => {
      const token = await getToken();
      const body = new FormData();
      body.set('file', value.file);

      if (value.source.trim()) {
        body.set('source', value.source.trim());
      }

      const response = await fetch(apiUrl('/v1/contact-imports'), {
        method: 'POST',
        headers: token ? { authorization: `Bearer ${token}` } : undefined,
        body,
      });

      if (!response.ok) {
        throw await parseUploadError(response);
      }

      return (await response.json()) as CreateContactImportResponse;
    },
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ['contact-imports'] });
      onSuccess(response);
    },
  });

  return {
    error: mutation.error instanceof Error ? mutation.error.message : null,
    mutation,
  };
}

function useProcessContactImport(
  importId: string,
  onProcessed: () => void | Promise<void>,
) {
  const api = useApi();

  return useMutation({
    mutationFn: (value: ContactImportProcessInput) =>
      api.post(`/v1/contact-imports/${importId}/process`, value),
    onSuccess: async () => {
      await onProcessed();
    },
  });
}

function autoMapHeaders(headers: string[]) {
  const mapping: ContactImportProcessInput['mapping'] = {
    phone: headers.find((header) => /phone|mobile|telefon/i.test(header)),
  };

  for (const header of headers) {
    if (/name|namn/i.test(header)) mapping.name = header;
    if (/email|e-mail|epost/i.test(header)) mapping.email = header;
    if (/booking|last.*date|senaste/i.test(header)) mapping.lastBookingAt = header;
    if (/service|treatment|category/i.test(header)) mapping.lastService = header;
    if (/consent|marketing|sms/i.test(header)) mapping.consentStatus = header;
    if (/source|system/i.test(header)) mapping.source = header;
  }

  return mapping;
}

function mappingReady(mapping: CsvMapping) {
  return Boolean(mapping.phone || mapping.email);
}

function mappedFieldEntries(mapping: CsvMapping) {
  return CONTACT_IMPORT_TARGET_FIELDS.flatMap((target) => {
    const header = mapping[target];

    return header ? [{ target, header }] : [];
  });
}

function apiUrl(path: string) {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_API_URL is not configured.');
  }

  return `${baseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

async function parseUploadError(response: Response) {
  try {
    const payload = await response.json();

    if (
      payload &&
      typeof payload === 'object' &&
      'error' in payload &&
      payload.error &&
      typeof payload.error === 'object' &&
      'message' in payload.error &&
      typeof payload.error.message === 'string'
    ) {
      return new ApiClientError({
        code:
          'code' in payload.error && typeof payload.error.code === 'string'
            ? (payload.error.code as ApiClientError['code'])
            : 'unknown_error',
        message: payload.error.message,
        status: response.status,
      });
    }
  } catch {
    // Fall through to generic error.
  }

  return new Error(`Upload failed with status ${response.status}.`);
}
