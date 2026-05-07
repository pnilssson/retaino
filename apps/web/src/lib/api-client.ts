import type { ApiError, ApiErrorCode } from '@retaino/shared/schemas';

type TokenProvider = () => Promise<string | null>;

type ApiClientOptions = {
  baseUrl?: string;
  fetch?: typeof fetch;
  getToken: TokenProvider;
};

type RequestOptions = {
  body?: unknown;
  headers?: HeadersInit;
  method?: string;
  signal?: AbortSignal;
};

export class ApiClientError extends Error {
  readonly code: ApiErrorCode | 'network_error' | 'unknown_error';
  readonly details: unknown;
  readonly status: number;

  constructor(input: {
    code: ApiClientError['code'];
    details?: unknown;
    message: string;
    status: number;
  }) {
    super(input.message);
    this.name = 'ApiClientError';
    this.code = input.code;
    this.details = input.details;
    this.status = input.status;
  }
}

export function createApiClient(options: ApiClientOptions) {
  const baseUrl = normalizeBaseUrl(
    options.baseUrl ?? process.env.NEXT_PUBLIC_API_URL
  );
  const fetcher = options.fetch ?? fetch;

  async function request<TResponse>(
    path: string,
    requestOptions: RequestOptions = {}
  ): Promise<TResponse> {
    const token = await options.getToken();
    const headers = new Headers(requestOptions.headers);

    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }

    const init: RequestInit = {
      method: requestOptions.method ?? 'GET'
    };

    if (requestOptions.signal) {
      init.signal = requestOptions.signal;
    }

    if (requestOptions.body !== undefined) {
      headers.set('content-type', 'application/json');
      init.body = JSON.stringify(requestOptions.body);
    }

    init.headers = Object.fromEntries(headers.entries());

    let response: Response;

    try {
      response = await fetcher(joinUrl(baseUrl, path), init);
    } catch (error) {
      throw new ApiClientError({
        code: 'network_error',
        message:
          error instanceof Error
            ? error.message
            : 'The API request could not be completed.',
        status: 0
      });
    }

    if (!response.ok) {
      throw await parseApiError(response);
    }

    return parseJsonResponse<TResponse>(response);
  }

  return {
    get: <TResponse>(
      path: string,
      options?: Omit<RequestOptions, 'body' | 'method'>
    ) => request<TResponse>(path, { ...options, method: 'GET' }),
    post: <TResponse>(
      path: string,
      body?: unknown,
      options?: Omit<RequestOptions, 'body' | 'method'>
    ) => request<TResponse>(path, { ...options, body, method: 'POST' }),
    request
  };
}

function normalizeBaseUrl(baseUrl: string | undefined) {
  if (!baseUrl?.trim()) {
    throw new Error('NEXT_PUBLIC_API_URL is not configured.');
  }

  return baseUrl.replace(/\/+$/, '');
}

function joinUrl(baseUrl: string, path: string) {
  return `${baseUrl}/${path.replace(/^\/+/, '')}`;
}

async function parseApiError(response: Response) {
  const payload = await readJson(response);

  if (isApiError(payload)) {
    return new ApiClientError({
      code: payload.error.code,
      details: payload.error.details,
      message: payload.error.message,
      status: response.status
    });
  }

  return new ApiClientError({
    code: 'unknown_error',
    message: `API request failed with status ${response.status}.`,
    status: response.status
  });
}

async function parseJsonResponse<TResponse>(response: Response) {
  if (response.status === 204) {
    return undefined as TResponse;
  }

  const text = await response.text();

  if (!text) {
    return undefined as TResponse;
  }

  return JSON.parse(text) as TResponse;
}

async function readJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function isApiError(payload: unknown): payload is ApiError {
  if (!payload || typeof payload !== 'object' || !('error' in payload)) {
    return false;
  }

  const error = payload.error;

  if (!error || typeof error !== 'object') {
    return false;
  }

  return (
    'code' in error &&
    'message' in error &&
    typeof error.code === 'string' &&
    typeof error.message === 'string'
  );
}
