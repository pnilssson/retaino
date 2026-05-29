import type { AppEnv } from '../types';
import { SmsProviderError } from './sms-provider';

export type TwilioConfig = {
  accountSid: string;
  authUser: string;
  authSecret: string;
  authToken: string | null;
};

type AppBindings = AppEnv['Bindings'];

export function getTwilioConfig(env: AppBindings): TwilioConfig {
  const accountSid = env.TWILIO_ACCOUNT_SID;
  const apiKeySid = env.TWILIO_API_KEY_SID;
  const apiKeySecret = env.TWILIO_API_KEY_SECRET;
  const authToken = env.TWILIO_AUTH_TOKEN;

  if (!accountSid) {
    throw new SmsProviderError({
      code: 'configuration_missing',
      retryable: false,
      publicMessage: 'SMS sending is not configured.',
      internalMessage: 'TWILIO_ACCOUNT_SID is missing.',
    });
  }

  if (apiKeySid && apiKeySecret) {
    return {
      accountSid,
      authUser: apiKeySid,
      authSecret: apiKeySecret,
      authToken: authToken ?? null,
    };
  }

  if (authToken) {
    return {
      accountSid,
      authUser: accountSid,
      authSecret: authToken,
      authToken,
    };
  }

  throw new SmsProviderError({
    code: 'configuration_missing',
    retryable: false,
    publicMessage: 'SMS sending is not configured.',
    internalMessage: 'TWILIO_API_KEY_SECRET or TWILIO_AUTH_TOKEN is missing.',
  });
}

export function createTwilioRestClient(
  config: TwilioConfig,
  fetchImpl: typeof fetch,
) {
  return {
    request: async <TResponse = unknown>(input: {
      host: string;
      method: 'DELETE' | 'GET' | 'POST';
      path: string;
      query?: Record<string, string>;
      body?: Record<string, string | undefined>;
    }) => {
      const url = new URL(`https://${input.host}${input.path}`);

      Object.entries(input.query ?? {}).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });

      const headers = new Headers({
        authorization: `Basic ${toBasicAuth(config.authUser, config.authSecret)}`,
      });
      let body: URLSearchParams | undefined;

      if (input.body) {
        headers.set('content-type', 'application/x-www-form-urlencoded');
        body = new URLSearchParams();

        Object.entries(input.body).forEach(([key, value]) => {
          if (value !== undefined) {
            body?.set(key, value);
          }
        });
      }

      const requestInit: RequestInit = {
        method: input.method,
        headers,
      };

      if (body) {
        requestInit.body = body;
      }

      const response = await fetchImpl(url, requestInit);

      if (!response.ok) {
        const responseText = await response.text();

        throw new SmsProviderError({
          code: normalizeTwilioError(response.status),
          retryable: response.status === 429 || response.status >= 500,
          publicMessage: 'The SMS provider could not complete the request.',
          internalMessage: responseText,
          providerErrorCode:
            twilioProviderErrorCode(responseText) ?? String(response.status),
        });
      }

      if (response.status === 204) {
        return undefined as TResponse;
      }

      return (await response.json()) as TResponse;
    },
  };
}

function twilioProviderErrorCode(responseText: string) {
  try {
    const body = JSON.parse(responseText) as { code?: unknown };

    return typeof body.code === 'number' || typeof body.code === 'string'
      ? String(body.code)
      : null;
  } catch {
    return null;
  }
}

function toBasicAuth(user: string, secret: string) {
  return btoa(`${user}:${secret}`);
}

function normalizeTwilioError(status: number) {
  if (status === 429) {
    return 'provider_rate_limited';
  }

  if (status >= 500) {
    return 'provider_temporary_failure';
  }

  if (status === 400) {
    return 'message_invalid';
  }

  if (status === 401 || status === 403) {
    return 'configuration_missing';
  }

  return 'provider_permanent_failure';
}
