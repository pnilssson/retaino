import type { AuthObject } from '@clerk/backend';
import type { DbClient } from '@retaino/db';
import type { OrganizationContext, User } from '@retaino/shared/contracts';

type AppBindings = {
  APP_ALLOWED_ORIGINS?: string;
  CLERK_PUBLISHABLE_KEY: string;
  CLERK_SECRET_KEY: string;
  CONTACT_IMPORTS_BUCKET: R2Bucket;
  DATABASE_URL: string;
  INNGEST_DEV?: string;
  INNGEST_EVENT_KEY?: string;
  INNGEST_SIGNING_KEY?: string;
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
