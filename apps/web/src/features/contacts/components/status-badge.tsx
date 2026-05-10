import type {
  ContactImportRowStatus,
  ContactImportStatus,
  ContactStatus,
} from '@retaino/shared/contracts';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  formatImportRowStatus,
  formatImportStatus,
} from './contacts-format';

type BadgeTone = 'amber' | 'blue' | 'gray' | 'green' | 'red';

const toneClasses: Record<BadgeTone, string> = {
  amber:
    'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/35 dark:text-amber-300',
  blue:
    'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900/60 dark:bg-sky-950/35 dark:text-sky-300',
  gray:
    'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300',
  green:
    'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/35 dark:text-emerald-300',
  red:
    'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/35 dark:text-rose-300',
};

const contactStatusMeta: Record<
  ContactStatus,
  { label: string; tone: BadgeTone }
> = {
  blocked: { label: 'Blocked', tone: 'red' },
  incomplete: { label: 'Needs data', tone: 'amber' },
  ready: { label: 'Ready', tone: 'green' },
};

const importStatusTone: Record<ContactImportStatus, BadgeTone> = {
  canceled: 'gray',
  completed: 'green',
  failed: 'red',
  mapped: 'blue',
  processing: 'blue',
  uploaded: 'gray',
};

const importRowStatusTone: Record<ContactImportRowStatus, BadgeTone> = {
  created: 'green',
  duplicate: 'amber',
  invalid: 'red',
  skipped: 'gray',
  suppressed: 'red',
  updated: 'blue',
};

export function ContactStatusBadge({ status }: { status: ContactStatus }) {
  const meta = contactStatusMeta[status];

  return <StatusBadge label={meta.label} tone={meta.tone} />;
}

export function ImportStatusBadge({
  status,
}: {
  status: ContactImportStatus;
}) {
  return (
    <StatusBadge label={formatImportStatus(status)} tone={importStatusTone[status]} />
  );
}

export function ImportRowStatusBadge({
  status,
}: {
  status: ContactImportRowStatus;
}) {
  return (
    <StatusBadge
      label={formatImportRowStatus(status)}
      tone={importRowStatusTone[status]}
    />
  );
}

function StatusBadge({ label, tone }: { label: string; tone: BadgeTone }) {
  return (
    <Badge
      className={cn(
        'border px-2.5 font-medium shadow-none',
        toneClasses[tone],
      )}
      variant="outline"
    >
      {label}
    </Badge>
  );
}
