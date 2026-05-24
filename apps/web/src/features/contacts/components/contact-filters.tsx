import { Filter, Search, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const statusLabels: Record<string, string> = {
  all: 'All statuses',
  blocked: 'Blocked',
  incomplete: 'Incomplete',
  ready: 'Ready for SMS',
};

const issueLabels: Record<string, string> = {
  all: 'All issues',
  invalid_phone: 'No valid phone',
  missing_phone: 'No valid phone',
  suppressed_phone: 'Suppressed phone',
};

export function ContactFilters({
  issue,
  onChange,
  search,
  status,
}: {
  issue: string;
  onChange: (values: Record<string, string>) => void;
  search: string;
  status: string;
}) {
  const issueValue = issue === 'invalid_phone' ? 'missing_phone' : issue;
  const advancedFilterCount = [issue !== 'all'].filter(Boolean).length;
  const activeFilters = [
    search.trim() ? `Search: ${search.trim()}` : null,
    status !== 'all' ? statusLabels[status] ?? status : null,
    issue !== 'all' ? issueLabels[issue] ?? issue : null,
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
            className="h-9 pl-9"
            onChange={(event) => onChange({ search: event.target.value })}
            placeholder="Search contacts"
            value={search}
          />
        </div>

        <div className="flex min-w-0 flex-wrap gap-2">
          <Select
            onValueChange={(value) => onChange({ status: value })}
            value={status}
          >
            <SelectTrigger className="h-9 min-h-9 flex-1 sm:w-40 sm:flex-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="ready">Ready for SMS</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
              <SelectItem value="incomplete">Incomplete</SelectItem>
            </SelectContent>
          </Select>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                className="h-9 flex-1 sm:flex-none"
                type="button"
                variant="outline"
              >
                <Filter aria-hidden="true" data-icon="inline-start" />
                Filters
                {advancedFilterCount > 0 ? (
                  <Badge className="ml-1 px-1.5" variant="secondary">
                    {advancedFilterCount}
                  </Badge>
                ) : null}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Issue</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                onValueChange={(value) => onChange({ issue: value })}
                value={issueValue}
              >
                <DropdownMenuRadioItem
                  onSelect={(event) => event.preventDefault()}
                  value="all"
                >
                  All issues
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem
                  onSelect={(event) => event.preventDefault()}
                  value="missing_phone"
                >
                  No valid phone
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem
                  onSelect={(event) => event.preventDefault()}
                  value="suppressed_phone"
                >
                  Suppressed phone
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

        </div>
      </div>

      {activeFilters.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {activeFilters.map((filter) => (
            <Badge
              className="max-w-full font-normal"
              key={filter}
              variant="secondary"
            >
              <span className="truncate">{filter}</span>
            </Badge>
          ))}
          <Button
            className="h-7 px-2 text-xs"
            onClick={() =>
              onChange({
                issue: 'all',
                search: '',
                status: 'all',
              })
            }
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
