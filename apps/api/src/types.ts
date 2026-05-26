import type { AuthObject } from '@clerk/backend';
import type { DbClient } from '@retaino/db';
import type { OrganizationContext, User } from '@retaino/shared/contracts';

type AppBindings = {
  APP_ALLOWED_ORIGINS?: string;
  CLERK_PUBLISHABLE_KEY: string;
  CLERK_SECRET_KEY: string;
  CONTACT_IMPORTS_BUCKET: R2Bucket;
  HYPERDRIVE: Hyperdrive;
  INNGEST_DEV?: string;
  INNGEST_DEVSERVER_URL?: string;
  INNGEST_EVENT_KEY?: string;
  INNGEST_SERVE_ORIGIN?: string;
  INNGEST_SERVE_PATH?: string;
  INNGEST_SIGNING_KEY?: string;
  SENTRY_DSN?: string;
  SENTRY_ENVIRONMENT?: string;
  STRIPE_CANCEL_URL: string;
  STRIPE_CHECKOUT_DISPLAY_NAME?: string;
  STRIPE_PRICE_CREDITS_1500_ID: string;
  STRIPE_PRICE_CREDITS_5000_ID: string;
  STRIPE_PRICE_CREDITS_500_ID: string;
  STRIPE_PRICE_GROWTH_ID: string;
  STRIPE_PRICE_SCALE_ID: string;
  STRIPE_PRICE_STARTER_ID: string;
  STRIPE_RETURN_URL: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_SUCCESS_URL: string;
  STRIPE_WEBHOOK_SECRET: string;
  SMS_SENDING_MODE?: 'disabled' | 'test' | 'live';
  TRACKING_BASE_URL?: string;
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_API_KEY_SECRET?: string;
  TWILIO_API_KEY_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_INBOUND_CALLBACK_BASE_URL?: string;
  TWILIO_STATUS_CALLBACK_BASE_URL?: string;
  TRACKING_REDIRECT_RATE_LIMITER?: RateLimit;
  TRACKING_REDIRECT_ROUTE_RATE_LIMITER?: RateLimit;
  CF_VERSION_METADATA?: WorkerVersionMetadata;
};

type AppVariables = {
  auth: AuthObject;
  db: DbClient;
  organization: OrganizationContext;
  user: User;
};

export type AppEnv = {
  Bindings: AppBindings;
  Variables: AppVariables;
};
