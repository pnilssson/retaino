import { getTableConfig } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import { smsConversations } from '../../src/schema/sms-conversations';

describe('sms conversations schema', () => {
  it('stores minimal mutable inbox conversation state', () => {
    expect(smsConversations.organizationId.name).toBe('organization_id');
    expect(smsConversations.phoneHash.name).toBe('phone_hash');
    expect(smsConversations.normalizedPhone.name).toBe('normalized_phone');
    expect(smsConversations.lastReadAt.name).toBe('last_read_at');
  });

  it('keeps one conversation state row per organization phone identity', () => {
    const indexes = getTableConfig(smsConversations).indexes.map(
      (index) => index.config.name,
    );

    expect(indexes).toContain('sms_conversations_organization_phone_hash_idx');
  });
});
