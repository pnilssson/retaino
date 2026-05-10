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
