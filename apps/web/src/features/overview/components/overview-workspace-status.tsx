"use client";

import type {
  OverviewResponse,
  SmsSenderStatus,
} from "@retaino/shared/contracts";
import {
  Coins,
  Phone,
  RadioTower,
} from "lucide-react";
import {
  useLocale,
  useTranslations,
} from "next-intl";
import { MetricSummaryEntry } from "@/components/metric-summary-entry";
import { ContentSection } from "@/features/appshell/components/content-section";
import { formatOverviewNumber } from "../overview-format";

type OverviewSender = OverviewResponse["sender"];

export function OverviewWorkspaceStatus({
  credits,
  sender,
}: {
  credits: number;
  sender: OverviewSender;
}) {
  const locale = useLocale();
  const t = useTranslations("Overview");
  const senderStatus = senderStatusView(sender.status, t);

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <ContentSection asChild>
        <dl>
          <MetricSummaryEntry
            className="min-h-0 border-t-0 p-0"
            detail={creditDetail(credits, t)}
            icon={Coins}
            iconClassName={creditIconClassName(credits)}
            label={t("smsCredits")}
            value={formatOverviewNumber(credits, locale)}
          />
        </dl>
      </ContentSection>

      <ContentSection asChild>
        <dl>
          <MetricSummaryEntry
            className="min-h-0 border-t-0 p-0"
            detail={t("senderNumberDetail")}
            icon={Phone}
            iconClassName="bg-sky-50 text-sky-700"
            label={t("senderNumber")}
            value={sender.phoneNumber ?? t("senderNotActive")}
          />
        </dl>
      </ContentSection>

      <ContentSection asChild>
        <dl>
          <MetricSummaryEntry
            className="min-h-0 border-t-0 p-0"
            detail={senderStatus.detail}
            icon={RadioTower}
            iconClassName={senderStatus.iconClassName}
            label={t("senderStatus")}
            value={senderStatus.value}
          />
        </dl>
      </ContentSection>
    </div>
  );
}

function creditDetail(
  credits: number,
  t: ReturnType<typeof useTranslations<"Overview">>,
) {
  if (credits <= 0) {
    return t("noCreditsAvailable");
  }

  return t("creditsAvailable");
}

function creditIconClassName(credits: number) {
  if (credits <= 0) {
    return "bg-rose-50 text-rose-700";
  }

  if (credits < 50) {
    return "bg-amber-50 text-amber-700";
  }

  return "bg-sky-50 text-sky-700";
}

function senderStatusView(
  status: SmsSenderStatus | null,
  t: ReturnType<typeof useTranslations<"Overview">>,
): {
  detail: string;
  iconClassName: string;
  value: string;
} {
  if (status === "ready") {
    return {
      detail: t("senderReadyDetail"),
      iconClassName: "bg-emerald-50 text-emerald-700",
      value: t("senderReady"),
    };
  }

  if (status === "pending") {
    return {
      detail: t("senderPendingDetail"),
      iconClassName: "bg-sky-50 text-sky-700",
      value: t("senderSettingUp"),
    };
  }

  if (status === "manual_action_required") {
    return {
      detail: t("senderManualActionDetail"),
      iconClassName: "bg-amber-50 text-amber-700",
      value: t("senderActionNeeded"),
    };
  }

  if (status === "failed" || status === "release_failed") {
    return {
      detail: t("senderFailedDetail"),
      iconClassName: "bg-rose-50 text-rose-700",
      value: t("senderNeedsReview"),
    };
  }

  if (status === "release_pending") {
    return {
      detail: t("senderReleasePendingDetail"),
      iconClassName: "bg-amber-50 text-amber-700",
      value: t("senderStoppingSoon"),
    };
  }

  return {
    detail: t("senderNotActiveDetail"),
    iconClassName: "bg-muted text-muted-foreground",
    value: t("senderNotActive"),
  };
}
