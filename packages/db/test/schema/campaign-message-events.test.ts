import { getTableConfig } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import { campaignMessageEvents } from '../../src/schema/campaign-message-events';

describe('campaign message events schema', () => {
  it('stores normalized provider message events', () => {
    expect(campaignMessageEvents.organizationId.name).toBe('organization_id');
    expect(campaignMessageEvents.campaignId.name).toBe('campaign_id');
    expect(campaignMessageEvents.messageId.name).toBe('message_id');
    expect(campaignMessageEvents.recipientId.name).toBe('recipient_id');
    expect(campaignMessageEvents.provider.name).toBe('provider');
    expect(campaignMessageEvents.providerMessageId.name).toBe(
      'provider_message_id',
    );
    expect(campaignMessageEvents.eventType.name).toBe('event_type');
    expect(campaignMessageEvents.rawStatus.name).toBe('raw_status');
    expect(campaignMessageEvents.rawPayload.name).toBe('raw_payload');
    expect(campaignMessageEvents.occurredAt.name).toBe('occurred_at');
  });

  it('deduplicates provider retries for the same message event type', () => {
    const indexes = getTableConfig(campaignMessageEvents).indexes.map(
      (index) => index.config,
    );
    const uniqueIndex = indexes.find(
      (index) =>
        index.name === 'campaign_message_events_provider_message_event_idx',
    );

    expect(uniqueIndex?.unique).toBe(true);
    expect(uniqueIndex?.columns.map((column) => column.name)).toEqual([
      'provider',
      'provider_message_id',
      'event_type',
    ]);
  });
});
