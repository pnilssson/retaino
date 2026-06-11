import type { OverviewResponse } from '@retaino/shared/contracts';
import { formatOverviewNumber } from './overview-format';

export function attentionItemView(
  item: OverviewResponse['attentionItems'][number],
  overview: OverviewResponse,
  locale: string,
) {
  const isEnglish = locale === 'en';

  if (item.id === 'needs-reply') {
    const count = formatOverviewNumber(overview.metrics.needsReplyCount, locale);

    return {
      title: isEnglish
        ? `${count} conversations need a reply`
        : `${count} konversationer behöver svar`,
      description: isEnglish
        ? 'Answer recent replies before the customer moves on.'
        : 'Svara på nya svar innan kunden går vidare.',
    };
  }

  if (item.id === 'billing-plan-required') {
    return {
      title: isEnglish ? 'Plan setup is required' : 'Planen måste konfigureras',
      description: isEnglish
        ? 'Set up a plan before sending SMS campaigns.'
        : 'Konfigurera en plan innan SMS-kampanjer skickas.',
    };
  }

  if (item.id === 'billing-access-inactive') {
    return {
      title: isEnglish ? 'Billing needs attention' : 'Fakturering kräver åtgärd',
      description: isEnglish
        ? 'Restore subscription access before sending SMS.'
        : 'Återställ abonnemangsatkomst innan SMS skickas.',
    };
  }

  if (item.id === 'credits-empty') {
    return {
      title: isEnglish ? 'SMS credits are empty' : 'SMS-krediterna är slut',
      description: isEnglish
        ? 'Campaign sending is paused until SMS credits are available.'
        : 'Kampanjutskick pausas tills SMS-krediter finns tillgängliga.',
    };
  }

  if (item.id === 'credits-low') {
    return {
      title: isEnglish
        ? 'SMS credits are running low'
        : 'SMS-krediterna börjar ta slut',
      description: isEnglish
        ? 'Review the balance before the next campaign.'
        : 'Kontrollera saldot innan nästa kampanj.',
    };
  }

  if (item.id === 'sender-release-scheduled') {
    return {
      title: isEnglish
        ? 'SMS sender release is scheduled'
        : 'SMS-avsändaren är planerad att avslutas',
      description: isEnglish
        ? 'Restore billing access to keep the sender number.'
        : 'Återställ faktureringsatkomst för att behålla avsändarnumret.',
    };
  }

  if (item.id.startsWith('campaign-failed:')) {
    return {
      title: isEnglish ? 'A campaign failed' : 'En kampanj misslyckades',
      description: isEnglish
        ? 'Review the failed campaign before starting another send.'
        : 'Granska kampanjen innan ett nytt utskick startas.',
    };
  }

  if (item.id.startsWith('report-bookings:')) {
    return {
      title: isEnglish
        ? 'Report bookings for the latest campaign'
        : 'Rapportera bokningar för den senaste kampanjen',
      description: isEnglish
        ? 'Add bookings and revenue so the report reflects outcomes.'
        : 'Lägg till bokningar och intäkter så att rapporten visar utfallet.',
    };
  }

  return {
    title: isEnglish ? 'Review this item' : 'Granska detta',
    description: isEnglish
      ? 'Open the related page to continue.'
      : 'Öppna den relaterade sidan för att fortsätta.',
  };
}
