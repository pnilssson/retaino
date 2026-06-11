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
import { useLocale } from "next-intl";
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
  const senderStatus = senderStatusView(sender.status);

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <ContentSection asChild>
        <dl>
          <MetricSummaryEntry
            className="min-h-0 border-t-0 p-0"
            detail={creditDetail(credits)}
            icon={Coins}
            iconClassName={creditIconClassName(credits)}
            label="SMS credits"
            value={formatOverviewNumber(credits, locale)}
          />
        </dl>
      </ContentSection>

      <ContentSection asChild>
        <dl>
          <MetricSummaryEntry
            className="min-h-0 border-t-0 p-0"
            detail="Used for campaigns and replies."
            icon={Phone}
            iconClassName="bg-sky-50 text-sky-700"
            label="Sender number"
            value={sender.phoneNumber ?? "Not active"}
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
            label="Sender status"
            value={senderStatus.value}
          />
        </dl>
      </ContentSection>
    </div>
  );
}

function creditDetail(credits: number) {
  if (credits <= 0) {
    return "No credits available for campaigns or replies.";
  }

  return "Available for campaigns and replies.";
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

function senderStatusView(status: SmsSenderStatus | null): {
  detail: string;
  iconClassName: string;
  value: string;
} {
  if (status === "ready") {
    return {
      detail: "Ready to send messages.",
      iconClassName: "bg-emerald-50 text-emerald-700",
      value: "Ready",
    };
  }

  if (status === "pending") {
    return {
      detail: "Sender setup is still in progress.",
      iconClassName: "bg-sky-50 text-sky-700",
      value: "Setting up",
    };
  }

  if (status === "manual_action_required") {
    return {
      detail: "Complete sender setup before sending.",
      iconClassName: "bg-amber-50 text-amber-700",
      value: "Action needed",
    };
  }

  if (status === "failed" || status === "release_failed") {
    return {
      detail: "Review sender setup before sending.",
      iconClassName: "bg-rose-50 text-rose-700",
      value: "Needs review",
    };
  }

  if (status === "release_pending") {
    return {
      detail: "The sender number is scheduled to stop.",
      iconClassName: "bg-amber-50 text-amber-700",
      value: "Stopping soon",
    };
  }

  return {
    detail: "Set up a sender before sending campaigns.",
    iconClassName: "bg-muted text-muted-foreground",
    value: "Not active",
  };
}
