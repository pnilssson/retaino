import { getTableConfig } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import { organizationLegalAcceptances } from './organization-acceptances';

describe('organization legal acceptances schema', () => {
  it('preserves legal acceptance audit records when a user delete is attempted', () => {
    const config = getTableConfig(organizationLegalAcceptances);
    const userForeignKey = config.foreignKeys.find(
      (foreignKey) =>
        foreignKey.getName() ===
        'organization_legal_acceptances_user_id_users_id_fk',
    );

    expect(userForeignKey?.onDelete).toBe('restrict');
  });
});
