import * as Sentry from '@sentry/cloudflare';
import type {
  CaptureContext,
  CloudflareOptions,
} from '@sentry/cloudflare';
import {
  createRetainoSentryDataCollection,
  sanitizeSentryUrl,
  scrubSentryEvent,
} from '@retaino/shared/sentry-scrubbing';
import type { Context } from 'hono';
import type { AppEnv } from '../types';

type CaptureInput = {
  feature: string;
  operation: string;
  level?: 'error' | 'warning';
  httpStatus?: number;
  organizationId?: string | null;
  campaignId?: string | null;
  contactImportId?: string | null;
  provider?: string | null;
  providerErrorCode?: string | null;
  providerSenderReference?: string | null;
  retryable?: boolean | null;
};

export function createSentryOptions(
  env: Pick<
    AppEnv['Bindings'],
    'SENTRY_DSN' | 'SENTRY_ENVIRONMENT' | 'CF_VERSION_METADATA'
  > = {},
): CloudflareOptions {
  return {
    dsn: env.SENTRY_DSN,
    enabled: Boolean(env.SENTRY_DSN),
    environment:
      env.SENTRY_ENVIRONMENT ??
      (env.CF_VERSION_METADATA ? 'production' : 'development'),
    release: env.CF_VERSION_METADATA?.id,
    dataCollection: createRetainoSentryDataCollection(),
    skipOpenTelemetrySetup: true,
    integrations: (integrations) =>
      integrations.filter(
        (integration) => integration.name !== 'Hono' && integration.name !== 'Console',
      ),
    beforeSend: (event) => scrubSentryEvent(event),
  };
}

export function captureApiError(
  error: unknown,
  c: Context<AppEnv>,
  input: CaptureInput,
) {
  captureException(error, c, {
    ...input,
    level: 'error',
  });
}

export function captureHandledError(
  error: unknown,
  c: Context<AppEnv>,
  input: CaptureInput,
) {
  captureException(error, c, {
    ...input,
    level: input.level ?? 'error',
  });
}

export function captureOperationalMessage(
  message: string,
  c: Context<AppEnv>,
  input: CaptureInput,
) {
  Sentry.captureMessage(message, sentryCaptureContext(c, {
    ...input,
    level: input.level ?? 'warning',
  }));
}

export function captureBackgroundError(error: unknown, input: CaptureInput) {
  Sentry.captureException(toError(error), {
    level: input.level ?? 'error',
    tags: captureTags(input),
  });
}

function captureException(
  error: unknown,
  c: Context<AppEnv>,
  input: CaptureInput,
) {
  Sentry.captureException(toError(error), sentryCaptureContext(c, input));
}

function sentryCaptureContext(
  c: Context<AppEnv>,
  input: CaptureInput,
): CaptureContext {
  const requestTags = {
    route: c.req.path,
    method: c.req.method,
  };

  return {
    level: input.level ?? 'error',
    tags: {
      ...captureTags({
        ...input,
        organizationId: input.organizationId ?? currentOrganizationId(c),
      }),
      ...requestTags,
    },
    extra: {
      url: sanitizeSentryUrl(c.req.url),
    },
  };
}

function captureTags(input: CaptureInput): Record<string, string> {
  const tags: Record<string, string> = {
    feature: input.feature,
    operation: input.operation,
  };

  addTag(tags, 'http_status', input.httpStatus);
  addTag(tags, 'organization_id', input.organizationId);
  addTag(tags, 'campaign_id', input.campaignId);
  addTag(tags, 'contact_import_id', input.contactImportId);
  addTag(tags, 'provider', input.provider);
  addTag(tags, 'provider_error_code', input.providerErrorCode);
  addTag(tags, 'provider_sender_reference', input.providerSenderReference);
  addTag(tags, 'retryable', input.retryable);

  return tags;
}

function addTag(
  tags: Record<string, string>,
  key: string,
  value: string | number | boolean | null | undefined,
) {
  if (value !== null && value !== undefined && value !== '') {
    tags[key] = String(value);
  }
}

function currentOrganizationId(c: Context<AppEnv>) {
  try {
    return c.get('organization')?.id ?? null;
  } catch {
    return null;
  }
}

function toError(error: unknown) {
  return error instanceof Error ? error : new Error(String(error));
}
