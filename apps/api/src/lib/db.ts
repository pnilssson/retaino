import { connectDb, type DbClient } from '@retaino/db';
import type { AppEnv } from '../types';

type DatabaseBindings = Pick<AppEnv['Bindings'], 'HYPERDRIVE'>;

export function getDatabaseConnectionString(env: DatabaseBindings) {
  if (!env.HYPERDRIVE?.connectionString) {
    throw new Error('Database connection is not configured.');
  }

  return env.HYPERDRIVE.connectionString;
}

export async function connectAppDb(
  env: DatabaseBindings,
): Promise<DbClient> {
  const connection = await connectDb(getDatabaseConnectionString(env));

  return connection.db;
}
