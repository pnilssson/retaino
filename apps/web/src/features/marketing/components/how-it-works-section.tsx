'use client';

import { type ReactNode, useId, useState } from 'react';
import { Building2, User } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useTranslations } from 'next-intl';

import { FunnelChart, type FunnelStage } from '@/components/charts/funnel-chart';
import { funnelStageGradient } from '@/components/charts/funnel-palette';
import { textStyles } from '@/lib/text-styles';
import { cn } from '@/lib/utils';

type WorkflowStep = {
  tone: string;
  titleKey:
    | 'howItWorksImportTitle'
    | 'howItWorksAudienceTitle'
    | 'howItWorksCampaignTitle'
    | 'howItWorksReplyTitle'
    | 'howItWorksReportTitle';
  variant: 'wide' | 'tall' | 'standard';
};

type CustomerSheetHeaderKey =
  | 'howItWorksSheetHeaderClient'
  | 'howItWorksSheetHeaderPhone'
  | 'howItWorksSheetHeaderLastVisit'
  | 'howItWorksSheetHeaderBookingSystem'
  | 'howItWorksSheetHeaderPermission';

type CustomerSheetStatusKey =
  | 'howItWorksSheetStatusAllowed'
  | 'howItWorksSheetStatusMissing'
  | 'howItWorksSheetStatusOptOut';

type CustomerSheetRow = {
  bookingSystem: string;
  client: string;
  lastVisit: string;
  permissionKey: CustomerSheetStatusKey;
  phone: string;
};

type AudienceFunnelScenario = {
  canReceive: number;
  matching: number;
  sendable: number;
};

type CampaignIdeaKey =
  | 'howItWorksCampaignIdeaTime'
  | 'howItWorksCampaignIdeaConsultation'
  | 'howItWorksCampaignIdeaSeasonal';

const workflowSteps: WorkflowStep[] = [
  {
    titleKey: 'howItWorksImportTitle',
    tone: 'from-emerald-50 via-white to-sky-50',
    variant: 'wide',
  },
  {
    titleKey: 'howItWorksAudienceTitle',
    tone: '',
    variant: 'tall',
  },
  {
    titleKey: 'howItWorksCampaignTitle',
    tone: '',
    variant: 'standard',
  },
  {
    titleKey: 'howItWorksReplyTitle',
    tone: 'from-violet-50 via-white to-slate-50',
    variant: 'standard',
  },
  {
    titleKey: 'howItWorksReportTitle',
    tone: 'from-amber-50 via-white to-emerald-50',
    variant: 'standard',
  },
];

const customerSheetHeaders: CustomerSheetHeaderKey[] = [
  'howItWorksSheetHeaderClient',
  'howItWorksSheetHeaderPhone',
  'howItWorksSheetHeaderLastVisit',
  'howItWorksSheetHeaderBookingSystem',
  'howItWorksSheetHeaderPermission',
];

const customerSheetRows: CustomerSheetRow[] = [
  {
    bookingSystem: 'BokaDirekt',
    client: 'Alma Lind',
    lastVisit: '2025-10-14',
    permissionKey: 'howItWorksSheetStatusAllowed',
    phone: '+46 70 142 18 03',
  },
  {
    bookingSystem: 'BokaDirekt',
    client: 'Erik Holm',
    lastVisit: '2025-09-02',
    permissionKey: 'howItWorksSheetStatusAllowed',
    phone: '+46 72 443 90 15',
  },
  {
    bookingSystem: 'ClinicBuddy',
    client: 'Elin Nyberg',
    lastVisit: '2025-07-28',
    permissionKey: 'howItWorksSheetStatusAllowed',
    phone: '+46 73 809 44 21',
  },
  {
    bookingSystem: 'BokaDirekt',
    client: 'Noah Ek',
    lastVisit: '2025-05-19',
    permissionKey: 'howItWorksSheetStatusMissing',
    phone: '+46 76 218 75 40',
  },
  {
    bookingSystem: 'ClinicBuddy',
    client: 'Sara Dahl',
    lastVisit: '2025-04-06',
    permissionKey: 'howItWorksSheetStatusAllowed',
    phone: '+46 70 665 12 88',
  },
  {
    bookingSystem: 'BokaDirekt',
    client: 'Liam Fors',
    lastVisit: '2025-03-11',
    permissionKey: 'howItWorksSheetStatusOptOut',
    phone: '+46 73 502 16 72',
  },
  {
    bookingSystem: 'ClinicBuddy',
    client: 'Ida Berg',
    lastVisit: '2025-02-24',
    permissionKey: 'howItWorksSheetStatusAllowed',
    phone: '+46 70 394 83 11',
  },
  {
    bookingSystem: 'BokaDirekt',
    client: 'Felix Lund',
    lastVisit: '2025-01-18',
    permissionKey: 'howItWorksSheetStatusAllowed',
    phone: '+46 72 106 54 90',
  },
  {
    bookingSystem: 'ClinicBuddy',
    client: 'Julia Sand',
    lastVisit: '2024-12-09',
    permissionKey: 'howItWorksSheetStatusMissing',
    phone: '+46 76 480 23 57',
  },
  {
    bookingSystem: 'BokaDirekt',
    client: 'Sofia West',
    lastVisit: '2024-11-21',
    permissionKey: 'howItWorksSheetStatusAllowed',
    phone: '+46 70 912 64 33',
  },
  {
    bookingSystem: 'ClinicBuddy',
    client: 'Emilia Roos',
    lastVisit: '2024-10-07',
    permissionKey: 'howItWorksSheetStatusAllowed',
    phone: '+46 72 381 09 64',
  },
  {
    bookingSystem: 'BokaDirekt',
    client: 'Theo Nordin',
    lastVisit: '2024-09-16',
    permissionKey: 'howItWorksSheetStatusOptOut',
    phone: '+46 73 742 50 18',
  },
];

const audienceFunnelScenarios = [
  { canReceive: 48, matching: 64, sendable: 36 },
  { canReceive: 36, matching: 48, sendable: 26 },
  { canReceive: 24, matching: 32, sendable: 16 },
  { canReceive: 12, matching: 18, sendable: 8 },
] as const satisfies readonly [
  AudienceFunnelScenario,
  ...AudienceFunnelScenario[],
];
const defaultAudienceFunnelScenario = audienceFunnelScenarios[2] as
  | AudienceFunnelScenario
  | undefined;
const campaignIdeaKeys: CampaignIdeaKey[] = [
  'howItWorksCampaignIdeaTime',
  'howItWorksCampaignIdeaConsultation',
  'howItWorksCampaignIdeaSeasonal',
];
const stableCardContentClassName =
  'origin-center transition-transform duration-300 ease-out group-hover/card:scale-[0.988] group-focus-within/card:scale-[0.988] motion-reduce:transition-none motion-reduce:group-hover/card:scale-100 motion-reduce:group-focus-within/card:scale-100';

export function HowItWorksSection() {
  const shouldReduceMotion = useReducedMotion();
  const t = useTranslations('Marketing');

  return (
    <section className="bg-background px-3 pt-24 pb-10 sm:px-5 sm:pt-32 sm:pb-14">
      <div className="mx-auto w-full max-w-7xl">
        <div className="max-w-5xl">
          <motion.h2
            animate={{ opacity: 1, y: 0 }}
            className={textStyles.h2}
            initial={{ opacity: 0, y: 16 }}
            transition={{
              delay: shouldReduceMotion ? 0 : 0.08,
              duration: shouldReduceMotion ? 0 : 0.55,
            }}
          >
            {t('howItWorksTitle')}
            <span className="text-muted-foreground">
              {' '}
              {t('howItWorksTitleMuted')}
            </span>
          </motion.h2>
        </div>

        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 grid auto-rows-[minmax(15rem,auto)] grid-cols-1 gap-3 sm:mt-10 md:auto-rows-[18rem] md:grid-cols-3"
          initial={{ opacity: 0, y: 18 }}
          transition={{
            delay: shouldReduceMotion ? 0 : 0.22,
            duration: shouldReduceMotion ? 0 : 0.55,
          }}
        >
          {workflowSteps.map((step) => (
            <article
              className={cn(
                'group/card relative isolate flex min-h-[20rem] transform-gpu overflow-hidden rounded-lg border border-border/70 bg-card p-6 transition-transform duration-300 ease-out hover:z-20 hover:scale-[1.012] focus-within:z-20 focus-within:scale-[1.012] motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:focus-within:scale-100 md:min-h-0',
                step.variant === 'wide' &&
                  'md:col-span-2 md:row-span-2',
                step.variant === 'tall' && 'md:row-span-2',
                step.variant === 'standard' && 'md:row-span-2',
              )}
              key={step.titleKey}
            >
              <div
                aria-hidden="true"
                className={cn(
                  'pointer-events-none absolute inset-0',
                  step.variant === 'wide' ? 'opacity-100' : 'opacity-80',
                  step.variant === 'wide'
                    ? 'bg-white'
                    : step.titleKey === 'howItWorksAudienceTitle' ||
                        step.titleKey === 'howItWorksCampaignTitle'
                      ? 'bg-white'
                    : cn('bg-gradient-to-br', step.tone),
                )}
              />
              {step.variant === 'wide' ? <ImportCardHalfMoon /> : null}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 opacity-[0.18]"
                style={{
                  backgroundImage:
                    'radial-gradient(circle at 1px 1px, rgb(15 23 42 / 0.18) 1px, transparent 0)',
                  backgroundSize: '18px 18px',
                }}
              />

              <div className="relative z-10 flex min-h-full w-full flex-col">
                <div className="flex items-start justify-between gap-4">
                  <h3
                    className={cn(
                      'transition-transform duration-300 ease-out group-hover/card:-translate-y-0.5 group-focus-within/card:-translate-y-0.5 motion-reduce:transition-none motion-reduce:group-hover/card:translate-y-0 motion-reduce:group-focus-within/card:translate-y-0',
                      step.variant === 'wide'
                        ? 'max-w-[14rem] sm:max-w-[18rem] md:max-w-[20rem]'
                        : 'max-w-md',
                      textStyles.h2,
                    )}
                  >
                    {t(step.titleKey)}
                  </h3>
                </div>

                {step.variant === 'wide' ? (
                  <CustomerSheetWindowMockup
                    headers={customerSheetHeaders.map((header) => t(header))}
                    rows={customerSheetRows.map((row) => ({
                      ...row,
                      permission: t(row.permissionKey),
                    }))}
                    className={stableCardContentClassName}
                    title={t('howItWorksSheetTitle')}
                  />
                ) : step.titleKey === 'howItWorksAudienceTitle' ? (
                  <AudienceSelectionMockup
                    canReceiveLabel={t('howItWorksAudienceCanReceiveSms')}
                    dayOptions={[
                      t('howItWorksAudienceDays30'),
                      t('howItWorksAudienceDays60'),
                      t('howItWorksAudienceDays90'),
                      t('howItWorksAudienceDays180'),
                    ]}
                    daysLabel={t('howItWorksAudienceDaysLabel')}
                    matchingLabel={t('howItWorksAudienceMatchingContacts')}
                    sendableLabel={t('howItWorksAudienceSendable')}
                    className={stableCardContentClassName}
                    selectedIndex={2}
                  />
                ) : step.titleKey === 'howItWorksCampaignTitle' ? (
                  <CampaignIdeasMockup
                    className={stableCardContentClassName}
                    ideas={campaignIdeaKeys.map((ideaKey) => t(ideaKey))}
                  />
                ) : (
                  <PlaceholderLines
                    className={stableCardContentClassName}
                    variant={step.variant}
                  />
                )}
              </div>
            </article>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function CampaignIdeasMockup({
  className,
  ideas,
}: {
  className?: string;
  ideas: string[];
}) {
  const maskIdPrefix = useId().replaceAll(':', '');
  const branches = [
    {
      d: 'M164 53 H86 Q74 53 74 65 V236',
      id: 'left',
      label: {
        height: 36,
        textX: 88,
        textY: 136,
        width: 152,
        x: 12,
        y: 118,
      },
      maskClassName: 'campaign-reveal-left',
      user: { x: 52, y: 236 },
    },
    {
      d: 'M210 82 V410',
      id: 'center',
      label: {
        height: 36,
        textX: 210,
        textY: 318,
        width: 190,
        x: 115,
        y: 300,
      },
      maskClassName: 'campaign-reveal-center',
      user: { x: 188, y: 410 },
    },
    {
      d: 'M256 53 H334 Q346 53 346 65 V278',
      id: 'right',
      label: {
        height: 36,
        textX: 332,
        textY: 178,
        width: 152,
        x: 256,
        y: 160,
      },
      maskClassName: 'campaign-reveal-right',
      user: { x: 324, y: 278 },
    },
  ];

  return (
    <div
      aria-hidden="true"
      className={cn(
        'mt-4 flex min-h-0 flex-1 items-center justify-center md:mt-5',
        className,
      )}
    >
      <svg
        className="h-[27rem] w-full max-w-[28rem]"
        fill="none"
        viewBox="0 0 420 468"
      >
        <style>
          {`
            .campaign-path-active {
              stroke-opacity: 0.72;
            }
            .campaign-reveal-left,
            .campaign-reveal-center,
            .campaign-reveal-right {
              stroke-dasharray: 1;
              stroke-dashoffset: 1;
            }
            .campaign-reveal-left {
              animation: campaign-reveal-left 8s ease-out infinite;
            }
            .campaign-reveal-center {
              animation: campaign-reveal-center 8s ease-out infinite;
            }
            .campaign-reveal-right {
              animation: campaign-reveal-right 8s ease-out infinite;
            }
            @keyframes campaign-reveal-left {
              0% { stroke-dashoffset: 1; }
              18% { stroke-dashoffset: 0; }
              72% { stroke-dashoffset: 0; }
              76% { stroke-dashoffset: 1; }
              100% { stroke-dashoffset: 1; }
            }
            @keyframes campaign-reveal-center {
              0% { stroke-dashoffset: 1; }
              22% { stroke-dashoffset: 1; }
              40% { stroke-dashoffset: 0; }
              72% { stroke-dashoffset: 0; }
              76% { stroke-dashoffset: 1; }
              100% { stroke-dashoffset: 1; }
            }
            @keyframes campaign-reveal-right {
              0% { stroke-dashoffset: 1; }
              44% { stroke-dashoffset: 1; }
              62% { stroke-dashoffset: 0; }
              72% { stroke-dashoffset: 0; }
              76% { stroke-dashoffset: 1; }
              100% { stroke-dashoffset: 1; }
            }
            @media (prefers-reduced-motion: reduce) {
              .campaign-reveal-left,
              .campaign-reveal-center,
              .campaign-reveal-right {
                animation: none !important;
                stroke-dashoffset: 1;
              }
            }
          `}
        </style>
        <defs>
          {branches.map((branch) => (
            <mask
              height="430"
              id={`${maskIdPrefix}-campaign-mask-${branch.id}`}
              key={branch.id}
              maskUnits="userSpaceOnUse"
              width="420"
              x="0"
              y="0"
            >
              <rect fill="black" height="430" width="420" x="0" y="0" />
              <path
                className={branch.maskClassName}
                d={branch.d}
                fill="none"
                pathLength="1"
                stroke="white"
                strokeLinecap="round"
                strokeWidth="10"
              />
            </mask>
          ))}
        </defs>

        {branches.map((branch) => (
          <g key={branch.d}>
            <path
              d={branch.d}
              stroke="var(--primary)"
              strokeDasharray="0 12"
              strokeLinecap="round"
              strokeOpacity="0.22"
              strokeWidth="4"
            />
            <path
              className="campaign-path-active"
              d={branch.d}
              mask={`url(#${maskIdPrefix}-campaign-mask-${branch.id})`}
              stroke="var(--primary)"
              strokeDasharray="0 12"
              strokeDashoffset="0"
              strokeLinecap="round"
              strokeWidth="4"
            />
          </g>
        ))}

        <rect
          fill="var(--primary)"
          height="58"
          rx="8"
          width="58"
          x="181"
          y="24"
        />
        <Building2
          aria-hidden="true"
          className="text-primary-foreground"
          height="25"
          strokeWidth={1.8}
          width="25"
          x="197.5"
          y="40.5"
        />

        {branches.map((branch, index) => (
          <g key={branch.d}>
            <rect
              fill="var(--primary)"
              height={branch.label.height}
              rx="6"
              width={branch.label.width}
              x={branch.label.x}
              y={branch.label.y}
            />
            <text
              className={cn(textStyles.small, 'fill-primary-foreground')}
              dominantBaseline="central"
              textAnchor="middle"
              x={branch.label.textX}
              y={branch.label.textY}
            >
              {ideas[index]}
            </text>

            <rect
              fill="var(--primary)"
              height="44"
              rx="8"
              width="44"
              x={branch.user.x}
              y={branch.user.y}
            />
            <User
              aria-hidden="true"
              className="text-primary-foreground"
              height="19"
              strokeWidth={1.8}
              width="19"
              x={branch.user.x + 12.5}
              y={branch.user.y + 12.5}
            />
          </g>
        ))}
      </svg>
    </div>
  );
}

function AudienceSelectionMockup({
  canReceiveLabel,
  className,
  dayOptions,
  daysLabel,
  matchingLabel,
  selectedIndex,
  sendableLabel,
}: {
  canReceiveLabel: string;
  className?: string;
  dayOptions: string[];
  daysLabel: string;
  matchingLabel: string;
  selectedIndex: number;
  sendableLabel: string;
}) {
  const [activeIndex, setActiveIndex] = useState(selectedIndex);
  const scenario =
    audienceFunnelScenarios[activeIndex] ??
    audienceFunnelScenarios[selectedIndex] ??
    defaultAudienceFunnelScenario;
  if (!scenario) {
    return null;
  }
  const funnelData: FunnelStage[] = [
    {
      displayValue: String(scenario.matching),
      gradient: funnelStageGradient(0, 3),
      label: matchingLabel,
      value: scenario.matching,
    },
    {
      displayValue: String(scenario.canReceive),
      gradient: funnelStageGradient(1, 3),
      label: canReceiveLabel,
      value: scenario.canReceive,
    },
    {
      displayValue: String(scenario.sendable),
      gradient: funnelStageGradient(2, 3),
      label: sendableLabel,
      value: scenario.sendable,
    },
  ];

  return (
    <div
      className={cn(
        'mt-4 flex min-h-0 w-full flex-1 flex-col justify-between md:mt-5',
        className,
      )}
    >
      <p className={cn('mb-2 text-foreground', textStyles.small)}>
        {daysLabel}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {dayOptions.map((option, index) => (
          <button
            aria-pressed={index === activeIndex}
            className={cn(
              'cursor-pointer rounded-md border px-2.5 py-1 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
              textStyles.small,
              index === activeIndex
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border/80 bg-white/75 text-foreground hover:border-primary/70 hover:bg-white',
            )}
            key={option}
            onClick={() => setActiveIndex(index)}
            type="button"
          >
            {option}
          </button>
        ))}
      </div>

      <FunnelChart
        className="-mx-6 -mb-6 mt-4 w-[calc(100%+3rem)] [--audience-funnel-height:18rem] [&_span]:!text-sm [&_span]:!font-medium [&_span]:!text-black md:-mx-8 md:mt-5 md:min-h-0 md:w-[calc(100%+4rem)] md:flex-1 md:[--audience-funnel-height:100%]"
        data={funnelData}
        edges="curved"
        gap={2}
        labelLayout="grouped"
        labelOrientation="horizontal"
        layers={3}
        orientation="vertical"
        showLabels
        showPercentage={false}
        showValues
        staggerDelay={0.12}
        style={{ height: 'var(--audience-funnel-height)' }}
      />
    </div>
  );
}

function ImportCardHalfMoon() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0"
      style={{
        background:
          'radial-gradient(ellipse 82% 76% at 100% 0%, var(--primary) 0%, oklch(0.31 0.08 160) 34%, oklch(0.48 0.13 150) 50%, oklch(0.68 0.13 140) 63%, oklch(0.86 0.09 134) 76%, oklch(0.96 0.03 132) 88%, rgb(255 255 255) 98%, rgb(255 255 255) 100%)',
      }}
    />
  );
}

function CustomerSheetWindowMockup({
  className,
  headers,
  rows,
  title,
}: {
  className?: string;
  headers: string[];
  rows: Array<Omit<CustomerSheetRow, 'permissionKey'> & { permission: string }>;
  title: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'absolute top-[6.75rem] left-9 w-[36rem] sm:top-[8.5rem] sm:left-auto sm:right-[-7rem] sm:w-[45rem] md:top-[7.75rem] md:right-[-6rem] lg:w-[52rem]',
        className,
      )}
    >
      <div className="overflow-hidden rounded-lg border border-border/70 bg-white">
        <div className="relative flex h-9 items-center border-b border-border/70 bg-muted/60 px-3">
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-red-400" />
            <span className="size-2 rounded-full bg-amber-400" />
            <span className="size-2 rounded-full bg-emerald-400" />
          </div>
          <span
            className={cn(
              'absolute left-1/2 max-w-[16rem] -translate-x-1/2 truncate',
              textStyles.small,
            )}
          >
            {title}
          </span>
        </div>

        <div className="grid grid-cols-[1.1fr_1.1fr_0.8fr_1fr_0.8fr] border-b border-border/70 bg-muted/60">
          {headers.map((header) => (
            <span
              className={cn(
                'whitespace-nowrap border-r border-border/70 px-3 py-2 last:border-r-0',
                textStyles.small,
              )}
              key={header}
            >
              {header}
            </span>
          ))}
        </div>

        <div>
          {rows.map((row) => (
            <div
              className={cn(
                'grid grid-cols-[1.1fr_1.1fr_0.8fr_1fr_0.8fr] border-b border-border/55 transition-colors last:border-b-0 hover:bg-muted/55',
              )}
              key={row.phone}
            >
              <SheetCell>{row.client}</SheetCell>
              <SheetCell>{row.phone}</SheetCell>
              <SheetCell>{row.lastVisit}</SheetCell>
              <SheetCell>{row.bookingSystem}</SheetCell>
              <SheetCell>{row.permission}</SheetCell>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SheetCell({ children }: { children: ReactNode }) {
  return (
    <span
      className={cn(
        'truncate border-r border-border/45 px-3 py-2 last:border-r-0',
        textStyles.small,
      )}
    >
      {children}
    </span>
  );
}

function PlaceholderLines({
  className,
  variant,
}: {
  className?: string;
  variant: WorkflowStep['variant'];
}) {
  const lineCount = variant === 'wide' ? 7 : 5;

  return (
    <div
      aria-hidden="true"
      className={cn(
        'mt-auto grid gap-3 pt-10',
        variant === 'wide' ? 'sm:grid-cols-2' : 'grid-cols-1',
        className,
      )}
    >
      {Array.from({ length: lineCount }).map((_, index) => (
        <span
          className={cn(
            'h-2 rounded-full bg-foreground/10',
            index % 4 === 0 && 'w-3/4',
            index % 4 === 1 && 'w-full',
            index % 4 === 2 && 'w-1/2',
            index % 4 === 3 && 'w-5/6',
          )}
          key={index}
        />
      ))}
    </div>
  );
}
