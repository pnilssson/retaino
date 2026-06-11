import type {
  ContactIssueCode,
  ContactImportStatus,
  ContactImportTargetField,
} from '@retaino/shared/contracts';
import { getIntlLocale } from '@/lib/locale-format';

const importStatusLabels: Record<ContactImportStatus, string> = {
  completed: 'Completed',
  failed: 'Failed',
  processing: 'Processing',
};

const targetFieldLabels: Record<ContactImportTargetField, string> = {
  email: 'Email',
  lastBookingAt: 'Last booking',
  name: 'Name',
  phone: 'Phone',
};

const contactIssueLabels: Record<ContactIssueCode, string> = {
  invalid_phone: 'Invalid phone',
  missing_consent: 'Missing consent',
  missing_phone: 'Missing phone',
  suppressed_phone: 'Suppressed phone',
};

const suppressionReasonLabels: Record<string, string> = {
  manual_contact_suppression: 'Suppressed manually',
};

const importIssueLabels: Record<string, string> = {
  ambiguous_last_booking_at:
    'Ambiguous last booking date (use YYYY-MM-DD, for example 2025-03-24)',
  duplicate_contact_method: 'Duplicate phone or email',
  invalid_email: 'Invalid email address',
  invalid_last_booking_at:
    'Invalid last booking date (use YYYY-MM-DD, for example 2025-03-24)',
  invalid_phone: 'Invalid phone number',
  missing_contact_method: 'Missing phone or email',
  suppressed_contact_method: 'Suppressed phone or email',
};

export function formatDate(value: string | null, locale: string) {
  if (!value) {
    return 'Not set';
  }

  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    dateStyle: 'medium',
  }).format(new Date(value));
}

export function formatDateTime(value: string | null, locale: string) {
  if (!value) {
    return 'Not set';
  }

  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function formatImportStatus(status: ContactImportStatus) {
  return importStatusLabels[status];
}

export function formatImportIssue(issue: string) {
  return importIssueLabels[issue] ?? humanizeIssueCode(issue);
}

export function formatContactIssue(issue: ContactIssueCode) {
  return contactIssueLabels[issue];
}

export function formatSuppressionReason(reason: string) {
  return suppressionReasonLabels[reason] ?? humanizeIssueCode(reason);
}

export function formatTargetField(target: ContactImportTargetField) {
  return targetFieldLabels[target];
}

function humanizeIssueCode(issue: string) {
  const words = issue
    .split('_')
    .map((word) => word.trim())
    .filter(Boolean);

  if (words.length === 0) {
    return 'Unknown issue';
  }

  const sentence = words.join(' ');
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}
