import type { AuthObject } from '@clerk/backend';
import type { DbClient } from '@retaino/db';
import type { OrganizationContext, User } from '@retaino/shared/contracts';

export type AppBindings = {
  APP_ALLOWED_ORIGINS?: string;
  CLERK_PUBLISHABLE_KEY: string;
  CLERK_SECRET_KEY: string;
  DATABASE_URL: string;
};

export type AppVariables = {
  auth: AuthObject;
  db: DbClient;
  organization: OrganizationContext;
  user: User;
};

export type AppEnv = {
  Bindings: AppBindings;
  Variables: AppVariables;
};
