import {
  createRetainoSentryDataCollection,
  scrubSentryEvent,
} from '@retaino/shared/sentry-scrubbing';

export const SENTRY_DSN =
  'https://d17edb179c71e9d8efc657b7b5d282d2@o4508629590081536.ingest.de.sentry.io/4511604020543568';

type SentryRuntime = 'client' | 'server' | 'edge';

export function createWebSentryOptions(runtime: SentryRuntime) {
  const environment = sentryEnvironment();

  return {
    dsn: SENTRY_DSN,
    environment,
    release: process.env.VERCEL_GIT_COMMIT_SHA,
    dataCollection: createRetainoSentryDataCollection(),
    enableLogs: false,
    beforeSend: scrubSentryEvent,
    initialScope: {
      tags: {
        runtime,
      },
    },
  };
}

export function shouldInitializeWebSentry() {
  const environment = sentryEnvironment();

  return environment === 'production' || environment === 'preview';
}

function sentryEnvironment() {
  return process.env.NEXT_PUBLIC_VERCEL_ENV ??
    process.env.VERCEL_ENV ??
    'development';
}
