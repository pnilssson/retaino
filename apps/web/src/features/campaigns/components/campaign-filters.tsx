"use client";

import {
  Search,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { CampaignListStatusFilter } from '../campaign-list-state';
import { formatCampaignStatus } from './campaign-status-badge';

export function CampaignFilters({
  onChange,
  search,
  status,
}: {
  onChange: (values: {
    search?: string;
    status?: CampaignListStatusFilter;
  }) => void;
  search: string;
  status: CampaignListStatusFilter;
}) {
  const activeFilters = [
    search.trim() ? `Search: ${search.trim()}` : null,
    status !== 'all' ? formatCampaignStatus(status) : null,
  ].filter((value): value is string => Boolean(value));
  return (
    <div className="grid gap-3">
      <div className="grid gap-2 lg:grid-cols-[minmax(18rem,1fr)_auto] lg:items-center">
        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            aria-label="Search campaigns"
            autoComplete="off"
            className="h-9 pl-9"
            name="campaign-search"
            onChange={(event) => onChange({ search: event.target.value })}
            placeholder="Search campaigns"
            value={search}
          />
        </div>

        <div className="flex min-w-0 flex-wrap gap-2">
          <Select
            onValueChange={(value) =>
              onChange({ status: value as CampaignListStatusFilter })
            }
            value={status}
          >
            <SelectTrigger
              aria-label="Filter by campaign status"
              className="h-9 min-h-9 flex-1 sm:w-40 sm:flex-none"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="ready_to_send">Ready to send</SelectItem>
              <SelectItem value="sending">Sending</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {activeFilters.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {activeFilters.map((filter) => (
            <Badge
              className="max-w-full"
              key={filter}
              variant="secondary"
            >
              <span className="truncate">{filter}</span>
            </Badge>
          ))}
          <Button
            className="h-7 px-2"
            onClick={() => onChange({ search: '', status: 'all' })}
            size="sm"
            type="button"
            variant="ghost"
          >
            <X aria-hidden="true" data-icon="inline-start" />
            Clear
          </Button>
        </div>
      ) : null}
    </div>
  );
}
