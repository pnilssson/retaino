"use client";

import {
  FileUp,
  MoreVertical,
  UserPlus,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Link } from '@/i18n/navigation';
import { routes } from '@/lib/routes';
import { ContactCreateDialog } from './contact-create-dialog';

export function ContactPageActions({
  organizationId,
  phoneCountryCode,
}: {
  organizationId: string;
  phoneCountryCode: string;
}) {
  const t = useTranslations('Contacts');
  const [addContactOpen, setAddContactOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            aria-label={t('openContactActions')}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <MoreVertical aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem
            onSelect={() =>
              window.setTimeout(() => setAddContactOpen(true), 0)
            }
          >
            <UserPlus aria-hidden="true" />
            {t('addContact')}
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={routes.contactsImport}>
              <FileUp aria-hidden="true" />
              {t('importCsv')}
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ContactCreateDialog
        onOpenChange={setAddContactOpen}
        open={addContactOpen}
        organizationId={organizationId}
        phoneCountryCode={phoneCountryCode}
      />
    </>
  );
}
