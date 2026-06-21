const FILTERED = '[Filtered]';
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_PATTERN = /(?<![A-Za-z0-9])(?:\+?\d[\d\s().-]{6,}\d)(?![A-Za-z0-9])/g;
const SENSITIVE_KEYS = new Set([
  'authorization',
  'cookie',
  'set-cookie',
  'phone',
  'phonenumber',
  'normalizedphone',
  'fromphone',
  'tophone',
  'email',
  'normalizedemail',
  'body',
  'smsbody',
  'renderedbody',
  'rawbody',
  'rawpayload',
  'requestbody',
  'password',
  'secret',
  'token',
  'ip',
  'ipaddress',
  'ip_address',
]);
const SENSITIVE_KEY_PARTS = ['password', 'secret', 'token'];

export function createRetainoSentryDataCollection() {
  return {
    userInfo: false,
    cookies: false,
    httpHeaders: {
      request: false,
      response: false,
    },
    httpBodies: [],
    queryParams: false,
    genAI: {
      inputs: false,
      outputs: false,
    },
    stackFrameVariables: false,
    frameContextLines: 0,
  };
}

type SentryLikeEvent = {
  request?: Record<string, unknown>;
  user?: unknown;
  extra?: unknown;
  contexts?: unknown;
  breadcrumbs?: unknown[];
};

export function scrubSentryEvent<T extends object>(event: T): T {
  const sentryEvent = event as SentryLikeEvent;
  const request = sentryEvent.request
    ? sanitizedRequest(sentryEvent.request)
    : undefined;
  const rest = { ...sentryEvent };

  delete rest.user;

  return scrubObject({
    ...rest,
    request,
    extra: scrubValue(sentryEvent.extra),
    contexts: scrubValue(sentryEvent.contexts),
    breadcrumbs: sentryEvent.breadcrumbs?.map((breadcrumb) => scrubValue(breadcrumb)),
  }) as T;
}

function sanitizedRequest(request: Record<string, unknown>) {
  const rest = { ...request };

  delete rest.data;
  delete rest.cookies;
  delete rest.query_string;
  delete rest.fragment;

  return {
    ...rest,
    url: typeof request.url === 'string' ? sanitizeSentryUrl(request.url) : request.url,
    headers: scrubHeaders(request.headers),
  };
}

function scrubHeaders(headers: unknown) {
  if (!headers || typeof headers !== 'object' || Array.isArray(headers)) {
    return headers;
  }

  return Object.fromEntries(
    Object.entries(headers as Record<string, unknown>).filter(
      ([key]) => !isSensitiveKey(key),
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
    Object.entries(value)
      .filter(([, entry]) => entry !== undefined)
      .map(([key, entry]) => [
        key,
        isSensitiveKey(key) ? FILTERED : scrubValue(entry),
      ]),
  );
}

function isSensitiveKey(key: string) {
  const normalized = key.toLowerCase();

  return SENSITIVE_KEYS.has(normalized) ||
    SENSITIVE_KEY_PARTS.some((part) => normalized.includes(part));
}

export function sanitizeSentryUrl(value: string) {
  try {
    const url = new URL(value);
    url.search = '';
    url.hash = '';
    return url.toString().replace(/\/$/, url.pathname === '/' ? '/' : '');
  } catch {
    return value.split('?')[0] ?? value;
  }
}
