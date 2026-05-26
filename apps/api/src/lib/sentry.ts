import * as Sentry from '@sentry/cloudflare';
import type {
  CaptureContext,
  CloudflareOptions,
  ErrorEvent,
} from '@sentry/cloudflare';
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

const FILTERED = '[Filtered]';
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_PATTERN = /(?:\+?\d[\d\s().-]{6,}\d)/g;
const SENSITIVE_KEYS = new Set([
  'authorization',
  'cookie',
  'set-cookie',
  'phone',
  'phoneNumber',
  'normalizedPhone',
  'fromPhone',
  'toPhone',
  'email',
  'normalizedEmail',
  'body',
  'smsBody',
  'renderedBody',
  'rawBody',
  'rawPayload',
  'requestBody',
  'password',
  'secret',
  'token',
]);

export function createSentryOptions(
  env: Pick<
    AppEnv['Bindings'],
    'SENTRY_DSN' | 'SENTRY_ENVIRONMENT' | 'CF_VERSION_METADATA'
  > = {},
): CloudflareOptions {
  return {
    dsn: env.SENTRY_DSN,
    enabled: Boolean(env.SENTRY_DSN),
    environment: env.SENTRY_ENVIRONMENT ?? 'development',
    release: env.CF_VERSION_METADATA?.id,
    sendDefaultPii: false,
    skipOpenTelemetrySetup: true,
    integrations: (integrations) =>
      integrations.filter(
        (integration) => integration.name !== 'Hono' && integration.name !== 'Console',
      ),
    beforeSend: (event) => scrubEvent(event),
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
      url: sanitizedUrl(c.req.url),
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

function scrubEvent(event: ErrorEvent): ErrorEvent {
  const request = event.request ? sanitizedRequest(event.request) : undefined;

  return scrubObject({
    ...event,
    request,
    extra: scrubValue(event.extra),
    contexts: scrubValue(event.contexts),
    breadcrumbs: event.breadcrumbs?.map((breadcrumb) => scrubValue(breadcrumb)),
  }) as unknown as ErrorEvent;
}

function sanitizedRequest(request: NonNullable<ErrorEvent['request']>) {
  const rest = { ...request };

  delete rest.data;

  return {
    ...rest,
    url: request.url ? sanitizedUrl(request.url) : undefined,
    headers: scrubHeaders(request.headers),
  };
}

function scrubHeaders(headers: ErrorEvent['request'] extends { headers?: infer T }
  ? T
  : unknown) {
  if (!headers || typeof headers !== 'object' || Array.isArray(headers)) {
    return headers;
  }

  return Object.fromEntries(
    Object.entries(headers as Record<string, unknown>).filter(
      ([key]) => !SENSITIVE_KEYS.has(key.toLowerCase()),
    ),
  );
}

function scrubValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return value.replace(EMAIL_PATTERN, '[Email]').replace(PHONE_PATTERN, '[Phone]');
  }

  if (Array.isArray(value)) {
    return value.map((item) => scrubValue(item));
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  return scrubObject(value as Record<string, unknown>);
}

function scrubObject(value: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      SENSITIVE_KEYS.has(key) || SENSITIVE_KEYS.has(key.toLowerCase())
        ? FILTERED
        : scrubValue(entry),
    ]),
  );
}

function sanitizedUrl(value: string) {
  try {
    const url = new URL(value);
    url.search = '';
    url.hash = '';
    return url.toString().replace(/\/$/, url.pathname === '/' ? '/' : '');
  } catch {
    return value.split('?')[0] ?? value;
  }
}
