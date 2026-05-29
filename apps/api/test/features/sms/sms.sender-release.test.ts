import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearOrganizationSmsSenderReleaseSchedule,
  getOrganizationBillingProfile,
  getOrganizationSmsSender,
  markOrganizationSmsSenderReleaseFailed,
  markOrganizationSmsSenderReleased,
  scheduleOrganizationSmsSenderRelease,
} from '@retaino/db';
import { createSmsProvider } from '../../../src/lib/sms-provider';
import { processSmsSenderRelease } from '../../../src/features/sms/sms.sender-release';

vi.mock('@retaino/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@retaino/db')>();

  return {
    ...actual,
    clearOrganizationSmsSenderReleaseSchedule: vi.fn(),
    getOrganizationBillingProfile: vi.fn(),
    getOrganizationSmsSender: vi.fn(),
    markOrganizationSmsSenderReleaseFailed: vi.fn(),
    markOrganizationSmsSenderReleased: vi.fn(),
    scheduleOrganizationSmsSenderRelease: vi.fn(),
  };
});

vi.mock('../../../src/lib/sms-provider', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/lib/sms-provider')>();

  return {
    ...actual,
    createSmsProvider: vi.fn(),
  };
});

const db = {} as never;
const env = { SMS_SENDING_MODE: 'live' } as never;
const organizationId = '22222222-2222-4222-8222-222222222222';
const releaseSender = vi.fn();
const sender = {
  id: '11111111-1111-4111-8111-111111111111',
  organizationId,
  provider: 'twilio',
  status: 'release_pending',
  phoneNumber: '+46700000000',
  countryCode: 'SE',
  numberType: 'mobile',
  providerMessagingServiceId: 'MG123',
  providerPhoneNumberId: 'PN123',
  regulatoryStatus: 'ready',
  failureReason: null,
  provisionedAt: '2026-05-18T00:00:00.000Z',
  lastVerifiedAt: '2026-05-18T00:01:00.000Z',
  releaseScheduledAt: '2026-05-29T00:00:00.000Z',
  releasedAt: null,
  createdAt: '2026-05-18T00:00:00.000Z',
  updatedAt: '2026-05-18T00:01:00.000Z',
} as const;

describe('SMS sender release processing', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-29T12:00:00.000Z'));
    vi.mocked(clearOrganizationSmsSenderReleaseSchedule).mockReset();
    vi.mocked(getOrganizationBillingProfile).mockReset();
    vi.mocked(getOrganizationSmsSender).mockReset();
    vi.mocked(markOrganizationSmsSenderReleaseFailed).mockReset();
    vi.mocked(markOrganizationSmsSenderReleased).mockReset();
    vi.mocked(scheduleOrganizationSmsSenderRelease).mockReset();
    vi.mocked(createSmsProvider).mockReturnValue({
      name: 'twilio',
      releaseSender,
    } as never);
    releaseSender.mockReset();
    releaseSender.mockResolvedValue(undefined);
    vi.mocked(getOrganizationSmsSender).mockResolvedValue(sender);
    vi.mocked(getOrganizationBillingProfile).mockResolvedValue({
      subscriptionStatus: 'canceled',
    } as never);
  });

  it('releases due senders for inactive subscriptions', async () => {
    await expect(
      processSmsSenderRelease({ db, env, organizationId }),
    ).resolves.toEqual({ status: 'released' });

    expect(releaseSender).toHaveBeenCalledWith({
      providerMessagingServiceId: 'MG123',
      providerPhoneNumberId: 'PN123',
    });
    expect(markOrganizationSmsSenderReleased).toHaveBeenCalledWith(
      expect.anything(),
      {
        id: sender.id,
        releasedAt: new Date('2026-05-29T12:00:00.000Z'),
      },
    );
  });

  it('clears pending release when subscription access is restored', async () => {
    vi.mocked(getOrganizationBillingProfile).mockResolvedValue({
      subscriptionStatus: 'active',
      cancelAtPeriodEnd: false,
    } as never);

    await expect(
      processSmsSenderRelease({ db, env, organizationId }),
    ).resolves.toEqual({ status: 'subscription_restored' });

    expect(releaseSender).not.toHaveBeenCalled();
    expect(clearOrganizationSmsSenderReleaseSchedule).toHaveBeenCalledWith(
      expect.anything(),
      {
        organizationId,
        provider: 'twilio',
      },
    );
  });

  it('marks release failures and lets the job retry', async () => {
    const error = new Error('Twilio unavailable');
    releaseSender.mockRejectedValue(error);

    await expect(
      processSmsSenderRelease({ db, env, organizationId }),
    ).rejects.toThrow(error);

    expect(markOrganizationSmsSenderReleaseFailed).toHaveBeenCalledWith(
      expect.anything(),
      {
        id: sender.id,
        failureReason:
          'Sender release needs support review. Retaino has been notified.',
      },
    );
  });
});
