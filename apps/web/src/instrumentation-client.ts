import * as Sentry from '@sentry/nextjs';
import {
  createWebSentryOptions,
  shouldInitializeWebSentry,
} from './sentry.config';

if (shouldInitializeWebSentry()) {
  Sentry.init(createWebSentryOptions('client'));
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
