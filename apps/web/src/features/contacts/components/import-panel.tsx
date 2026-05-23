"use client";

import { useForm } from '@tanstack/react-form';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileUp,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { parse } from 'csv-parse/sync';
import {
  CONTACT_IMPORT_TARGET_FIELDS,
  autoMapContactImportHeaders,
  contactImportMappedFieldEntries,
  contactImportMappingReady,
  type CsvMapping,
} from '@retaino/shared/contracts';
import { ItemNotice } from '@/components/item-notice';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { CountryCombobox } from '@/components/country-combobox';
import { ItemTitle } from '@/components/ui/item';
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
import {
  GuidedFlowActions,
  GuidedFlowFrame,
  GuidedFlowSection,
  type GuidedFlowStep,
} from '@/components/guided-flow';
import {
  AppPageContent,
  AppPageItem,
} from '@/features/appshell/components/app-page-content';
import { AppPageHeader } from '@/features/appshell/components/app-page-header';
import { useStartContactImport } from '@/features/contacts/hooks/use-start-contact-import';
import { useOrganizationSession } from '@/features/onboarding/hooks/use-organization-session';
import { routes } from '@/lib/routes';
import { textStyles } from '@/lib/text-styles';
import { cn } from '@/lib/utils';
import { BlockedContacts } from './blocked-contacts';
import { ContactImportProgress } from './contact-import-progress';
import { formatTargetField } from '../contacts-format';

const MAX_UPLOAD_SIZE = 25 * 1024 * 1024;
const SAMPLE_ROWS = 5;

type CsvPreview = {
  headers: string[];
  sampleRows: Record<string, string>[];
};

type ImportStepId = 'upload' | 'match' | 'review' | 'results';

const importSteps: GuidedFlowStep<ImportStepId>[] = [
  { id: 'upload', title: 'Upload' },
  { id: 'match', title: 'Match' },
  { id: 'review', title: 'Review' },
  { id: 'results', title: 'Results' },
];

export function ContactImportUploadScreen() {
  const session = useOrganizationSession();
  const [currentImportId, setCurrentImportId] = useState<string | null>(null);

  if (session.isLoading) {
    return (
      <main className="flex flex-1 items-start bg-background">
        <section className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8 lg:px-10">
          <p className={textStyles.mutedBody}>Loading import form.</p>
        </section>
      </main>
    );
  }

  if (session.isError) {
    return (
      <main className="flex flex-1 items-center justify-center bg-background px-5 py-10">
        <div className="max-w-lg">
          <ItemNotice
            description={session.error.message}
            title="Import form could not be loaded"
            variant="error"
          />
        </div>
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
          eyebrow="Contacts"
          title="Import contacts"
        />

        <ImportForm
          currentImportId={currentImportId}
          defaultCountryCode={session.data.profile?.countryCode ?? 'SE'}
          onCurrentImportChange={setCurrentImportId}
          organizationId={session.data.organization.id}
        />
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
  const [activeStep, setActiveStep] = useState<ImportStepId>('upload');
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
      <GuidedFlowFrame
        completedStepIds={['upload', 'match', 'review', 'results']}
        currentStepId="results"
        progressLabel="Contact import"
        steps={importSteps}
      >
      <AppPageContent>
        <AppPageItem asChild>
          <section className="grid gap-5">
            <ContactImportProgress
              fileName={activeFileName}
              importId={currentImportId}
              onImportAnother={() => {
                form.reset();
                upload.mutation.reset();
                setActiveFileName(null);
                setParseError(null);
                setPreview(null);
                setActiveStep('upload');
                onCurrentImportChange(null);
              }}
              organizationId={organizationId}
            />
          </section>
          </AppPageItem>
        </AppPageContent>
      </GuidedFlowFrame>
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
          <GuidedFlowFrame
            completedStepIds={completedImportSteps({
              activeStep,
              file,
              mapping,
              parseError,
              permissionAttestation,
              preview,
            })}
            currentStepId={activeStep}
            progressLabel="Contact import"
            steps={importSteps}
          >
            <AppPageContent>
              <AppPageItem asChild>
                <section>
                  {activeStep === 'upload' ? (
                    <GuidedFlowSection
                      description="Use a CSV export from your booking or customer system."
                      title="Upload the CSV"
                    >
                      <div className="grid gap-5">
                  <form.Field
                    name="file"
                    validators={{
                      onSubmit: ({ value }) =>
                        value ? undefined : 'Choose a CSV file.',
                    }}
                  >
                    {(field) => {
                      const error = field.state.meta.errors[0];
                      const selectedFile = field.state.value;

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
                                const nextFile = event.target.files?.[0] ?? null;
                                field.handleChange(nextFile);
                                void updatePreview(
                                  nextFile,
                                  setPreview,
                                  setParseError,
                                ).then((csvPreview) => {
                                  form.setFieldValue(
                                    'mapping',
                                    csvPreview
                                      ? autoMapContactImportHeaders(
                                          csvPreview.headers,
                                        )
                                      : {},
                                  );
                                });
                              }}
                              type="file"
                            />
                            <span className="flex items-center gap-3">
                              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                                {selectedFile ? (
                                  <CheckCircle2
                                    aria-hidden="true"
                                    className="size-5"
                                  />
                                ) : (
                                  <FileUp aria-hidden="true" className="size-5" />
                                )}
                              </span>
                              <span className="grid min-w-0 gap-1">
                                <span className="break-all text-sm font-medium">
                                  {selectedFile
                                    ? selectedFile.name
                                    : 'Choose a CSV file'}
                                </span>
                                {selectedFile ? (
                                  <span className={textStyles.mutedBody}>
                                    Selected. Choose another CSV to replace it.
                                  </span>
                                ) : (
                                  <span className={textStyles.mutedBody}>
                                    CSV only, up to 25 MB.
                                  </span>
                                )}
                              </span>
                            </span>
                          </label>
                          {error ? (
                            <p className={textStyles.error}>{String(error)}</p>
                          ) : null}
                          {parseError ? (
                            <p className={textStyles.error}>{parseError}</p>
                          ) : null}
                        </div>
                      );
                    }}
                  </form.Field>

                        <GuidedFlowActions
                          canContinue={Boolean(file && preview && !parseError)}
                          continueLabel="Continue to matching"
                          onContinue={() => setActiveStep('match')}
                        />
                      </div>
                    </GuidedFlowSection>
                  ) : null}

                  {activeStep === 'match' ? (
                    <GuidedFlowSection
                      description="Choose which CSV columns should fill each contact field."
                      title="Match the columns"
                    >
                      {preview ? (
                        <div className="grid gap-5">
                    <div className="grid max-w-3xl gap-3">
                      <div
                        className={cn(
                          'hidden grid-cols-[minmax(0,1fr)_2rem_minmax(0,1fr)] items-center gap-3 px-1 uppercase sm:grid',
                          textStyles.metaStrong,
                        )}
                      >
                        <span>CSV column</span>
                        <span aria-hidden="true" />
                        <span>Retaino field</span>
                      </div>
                      {CONTACT_IMPORT_TARGET_FIELDS.map((target) => (
                        <form.Field key={target} name={`mapping.${target}`}>
                          {(field) => (
                            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_2rem_minmax(0,1fr)] sm:items-center">
                              <div className="grid gap-1">
                                <span
                                  className={cn(
                                    'uppercase sm:hidden',
                                    textStyles.metaStrong,
                                  )}
                                >
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
                                    <SelectItem value="none">
                                      Not mapped
                                    </SelectItem>
                                    {preview.headers.map((header) => (
                                      <SelectItem key={header} value={header}>
                                        {header}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <ArrowRight
                                aria-hidden="true"
                                className="hidden size-4 justify-self-center text-muted-foreground sm:block"
                              />
                              <Label>
                                <span
                                  className={cn(
                                    'uppercase sm:hidden',
                                    textStyles.metaStrong,
                                  )}
                                >
                                  Retaino field
                                </span>
                                <span>{formatTargetField(target)}</span>
                              </Label>
                            </div>
                          )}
                        </form.Field>
                      ))}
                    </div>

                          <GuidedFlowActions
                            canContinue={contactImportMappingReady(mapping)}
                            continueLabel="Continue to review"
                            onBack={() => setActiveStep('upload')}
                            onContinue={() => setActiveStep('review')}
                          />
                        </div>
                      ) : (
                        <ItemNotice
                          description="Choose a CSV file before matching columns."
                          title="CSV file required"
                        />
                      )}
                    </GuidedFlowSection>
                  ) : null}

                  {activeStep === 'review' ? (
                    <GuidedFlowSection
                      description="Check the mapped sample and confirm permission before importing."
                      title="Review the import"
                    >
                      {preview ? (
                        <div className="grid gap-5">
                    <form.Field name="phoneCountryCode">
                      {(field) => (
                        <div className="grid max-w-2xl gap-2 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-center">
                          <Label htmlFor={field.name}>Phone country</Label>
                          <CountryCombobox
                            id={field.name}
                            name={field.name}
                            onBlur={field.handleBlur}
                            onChange={(value) =>
                              field.handleChange(
                                value as typeof field.state.value,
                              )
                            }
                            value={field.state.value}
                          />
                          <p className={cn('sm:col-start-2', textStyles.mutedBody)}>
                            Used for phone numbers without a country code.
                          </p>
                        </div>
                      )}
                    </form.Field>

                    <MappedPreviewTable
                      fields={contactImportMappedFieldEntries(mapping)}
                      sampleRows={preview.sampleRows}
                    />

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
                              I confirm these contacts can lawfully receive
                              marketing SMS from this organization.
                            </Label>
                            {field.state.meta.errors.length > 0 ? (
                              <p
                                className={textStyles.error}
                                id="permission-attestation-error"
                              >
                                {String(field.state.meta.errors[0])}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      )}
                    </form.Field>

                    {upload.error ? (
                      <ItemNotice
                        description={upload.error}
                        title="Import could not start"
                        variant="error"
                      />
                    ) : null}

                          <GuidedFlowActions onBack={() => setActiveStep('match')}>
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
                                <CheckCircle2
                                  aria-hidden="true"
                                  data-icon="inline-start"
                                />
                              )}
                              Start import
                            </Button>
                          </GuidedFlowActions>
                        </div>
                      ) : (
                        <ItemNotice
                          description="Choose a CSV file before reviewing the import."
                          title="CSV file required"
                        />
                      )}
                    </GuidedFlowSection>
                  ) : null}
                </section>
              </AppPageItem>
            </AppPageContent>
          </GuidedFlowFrame>
        )}
      </form.Subscribe>
    </form>
  );
}

function completedImportSteps({
  activeStep,
  file,
  mapping,
  parseError,
  permissionAttestation,
  preview,
}: {
  activeStep: ImportStepId;
  file: File | null;
  mapping: CsvMapping;
  parseError: string | null;
  permissionAttestation: boolean;
  preview: CsvPreview | null;
}): ImportStepId[] {
  const completed: ImportStepId[] = [];

  if (importStepIsPast(activeStep, 'upload') && file && preview && !parseError) {
    completed.push('upload');
  }

  if (importStepIsPast(activeStep, 'match') && contactImportMappingReady(mapping)) {
    completed.push('match');
  }

  if (importStepIsPast(activeStep, 'review') && permissionAttestation) {
    completed.push('review');
  }

  return completed;
}

function importStepIsPast(
  activeStep: ImportStepId,
  completedStep: ImportStepId,
) {
  return importStepRank(activeStep) > importStepRank(completedStep);
}

function importStepRank(step: ImportStepId) {
  return importSteps.findIndex((importStep) => importStep.id === step);
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
      <ItemTitle>Sample values</ItemTitle>
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
