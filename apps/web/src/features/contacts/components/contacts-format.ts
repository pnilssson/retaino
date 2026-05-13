import type {
  ContactIssueCode,
  ContactImportRowStatus,
  ContactImportStatus,
  ContactImportTargetField,
} from '@retaino/shared/contracts';

const importStatusLabels: Record<ContactImportStatus, string> = {
  canceled: 'Canceled',
  completed: 'Completed',
  failed: 'Failed',
  mapped: 'Mapped',
  processing: 'Processing',
  uploaded: 'Uploaded',
};

const importRowStatusLabels: Record<ContactImportRowStatus, string> = {
  created: 'Created',
  duplicate: 'Duplicate',
  invalid: 'Invalid',
  skipped: 'Skipped',
  suppressed: 'Suppressed',
  updated: 'Updated',
};

const targetFieldLabels: Record<ContactImportTargetField, string> = {
  email: 'Email',
  lastBookingAt: 'Last booking',
  lastService: 'Latest service',
  name: 'Name',
  phone: 'Phone',
  source: 'Original system',
};

const contactIssueLabels: Record<ContactIssueCode, string> = {
  invalid_phone: 'Invalid phone',
  missing_consent: 'Missing consent',
  missing_phone: 'Missing phone',
  suppressed_phone: 'Suppressed phone',
};

const importRowIssueLabels: Record<string, string> = {
  conflicting_contact_methods: 'Phone and email match different contacts',
  duplicate_contact_method: 'Duplicate phone or email',
  invalid_email: 'Invalid email',
  invalid_last_booking_at: 'Invalid last booking date',
  invalid_phone: 'Invalid phone',
  missing_contact_method: 'Missing phone or email',
  missing_phone: 'Missing phone',
  suppressed_phone: 'Suppressed phone',
};

const suppressionReasonLabels: Record<string, string> = {
  manual_contact_suppression: 'Suppressed manually',
};

export function formatDate(value: string | null) {
  if (!value) {
    return 'Not set';
  }

  return new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(
    new Date(value),
  );
}

export function formatDateTime(value: string | null) {
  if (!value) {
    return 'Not set';
  }

  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function formatImportStatus(status: ContactImportStatus) {
  return importStatusLabels[status];
}

export function formatImportRowStatus(status: ContactImportRowStatus) {
  return importRowStatusLabels[status];
}

export function formatImportRowIssue(issue: string) {
  return importRowIssueLabels[issue] ?? humanizeIssueCode(issue);
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
