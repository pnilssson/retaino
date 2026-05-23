import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { and, eq, sql } from 'drizzle-orm';
import { legalDocuments as manifest } from '../../legal/manifest';
import { connectDb } from '../client';
import { legalDocuments, legalDocumentVersions } from '../schema';

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);
const legalRoot = path.join(packageRoot, 'legal');

async function main() {
  await loadLocalEnv();

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required to publish legal documents.');
  }

  const connection = await connectDb(databaseUrl);

  try {
    for (const document of manifest) {
      const bodyMdx = await readLegalBody(document.path);
      const contentHash = hashLegalBody(bodyMdx);
      const [legalDocument] = await connection.db
        .insert(legalDocuments)
        .values({
          documentType: document.documentType,
          slug: document.slug,
          title: document.title,
          publicVisible: document.publicVisible,
          acceptanceRequired: document.acceptanceRequired,
          sortOrder: document.sortOrder,
        })
        .onConflictDoUpdate({
          target: legalDocuments.documentType,
          set: {
            slug: document.slug,
            title: document.title,
            publicVisible: document.publicVisible,
            acceptanceRequired: document.acceptanceRequired,
            sortOrder: document.sortOrder,
            updatedAt: sql`now()`,
          },
        })
        .returning();

      if (!legalDocument) {
        throw new Error(`Failed to upsert ${document.documentType}.`);
      }

      const [existingVersion] = await connection.db
        .select()
        .from(legalDocumentVersions)
        .where(
          and(
            eq(legalDocumentVersions.documentType, document.documentType),
            eq(legalDocumentVersions.documentVersion, document.version),
          ),
        )
        .limit(1);

      if (existingVersion) {
        if (existingVersion.contentHash !== contentHash) {
          throw new Error(
            [
              `Published legal document changed without a new version: ${document.documentType} ${document.version}.`,
              `Database hash: ${existingVersion.contentHash}.`,
              `Manifest hash: ${contentHash}.`,
            ].join(' '),
          );
        }

        console.log(
          `Legal document already published: ${document.documentType} ${document.version}`,
        );
        continue;
      }

      await connection.db.insert(legalDocumentVersions).values({
        legalDocumentId: legalDocument.id,
        documentType: document.documentType,
        documentVersion: document.version,
        title: document.title,
        bodyMdx,
        contentHash,
        status: 'published',
        effectiveDate: document.effectiveDate,
        publishedAt: new Date(`${document.effectiveDate}T00:00:00.000Z`),
      });

      console.log(
        `Published legal document: ${document.documentType} ${document.version}`,
      );
    }
  } finally {
    await connection.close();
  }
}

async function loadLocalEnv() {
  if (process.env.DATABASE_URL) {
    return;
  }

  try {
    const env = await readFile(path.join(packageRoot, '.env'), 'utf8');

    for (const line of env.split(/\r?\n/)) {
      const trimmedLine = line.trim();

      if (!trimmedLine || trimmedLine.startsWith('#')) {
        continue;
      }

      const separatorIndex = trimmedLine.indexOf('=');

      if (separatorIndex === -1) {
        continue;
      }

      const key = trimmedLine.slice(0, separatorIndex).trim();
      const value = trimmedLine.slice(separatorIndex + 1).trim();

      if (key && process.env[key] === undefined) {
        process.env[key] = value.replace(/^["']|["']$/g, '');
      }
    }
  } catch {
    // DATABASE_URL validation below reports the actionable error.
  }
}

async function readLegalBody(relativePath: string) {
  const body = await readFile(path.join(legalRoot, relativePath), 'utf8');
  return body.replace(/\r\n/g, '\n').trimEnd();
}

function hashLegalBody(body: string) {
  return createHash('sha256').update(body).digest('hex');
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
