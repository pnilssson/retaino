import { drizzle } from 'drizzle-orm/node-postgres';
import { Client } from 'pg';
import * as schema from './schema';

export type DbClient = ReturnType<typeof createDb>;
export type DbConnection = {
  db: DbClient;
  close: () => Promise<void>;
};

export function createDb(client: Client) {
  return drizzle(client, { schema, casing: 'snake_case' });
}

export async function connectDb(connectionString: string): Promise<DbConnection> {
  const client = new Client({ connectionString });

  await client.connect();

  let closed = false;

  return {
    db: createDb(client),
    close: async () => {
      if (closed) {
        return;
      }

      closed = true;
      await client.end();
    },
  };
}
