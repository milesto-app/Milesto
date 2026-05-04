"use client";

import { useTransition } from "react";
import { Search, X } from "lucide-react";
import {
  parseAsString,
  parseAsStringLiteral,
  useQueryState,
  useQueryStates,
} from "nuqs";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SEARCH_DEBOUNCE_MS = 300;

export type FilterFacet = {
  key: string;
  label: string;
  options: { value: string; label: string }[];
  placeholder?: string;
};

const ALL_VALUE = "__all__";

export function FilterBar({
  searchKey = "q",
  searchPlaceholder = "Search…",
  facets = [],
  showDateRange = false,
  className,
}: {
  searchKey?: string;
  searchPlaceholder?: string;
  facets?: FilterFacet[];
  showDateRange?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-lg border border-border-default bg-surface-2 px-3 py-2",
        className,
      )}
    >
      <SearchInput name={searchKey} placeholder={searchPlaceholder} />
      {facets.map((facet) => (
        <FacetSelect key={facet.key} facet={facet} />
      ))}
      {showDateRange ? <DateRange /> : null}
      <ResetButton
        searchKey={searchKey}
        facetKeys={facets.map((f) => f.key)}
        showDateRange={showDateRange}
      />
    </div>
  );
}

function SearchInput({
  name,
  placeholder,
}: {
  name: string;
  placeholder: string;
}) {
  const [, startTransition] = useTransition();
  const [value, setValue] = useQueryState(
    name,
    parseAsString.withDefault("").withOptions({
      shallow: false,
      throttleMs: SEARCH_DEBOUNCE_MS,
      startTransition,
      clearOnDefault: true,
    }),
  );

  return (
    <div className="relative min-w-0 flex-1 sm:max-w-xs">
      <Search
        className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-text-secondary"
        aria-hidden
      />
      <Input
        type="search"
        value={value}
        onChange={(e) => void setValue(e.target.value)}
        placeholder={placeholder}
        className="h-8 pl-8"
        aria-label={placeholder}
      />
    </div>
  );
}

function FacetSelect({ facet }: { facet: FilterFacet }) {
  const allowed = facet.options.map((o) => o.value);
  const [, startTransition] = useTransition();
  const [value, setValue] = useQueryState(
    facet.key,
    parseAsStringLiteral(allowed).withOptions({
      shallow: false,
      startTransition,
      clearOnDefault: true,
    }),
  );

  const current = value ?? ALL_VALUE;

  return (
    <Select
      value={current}
      onValueChange={(next) => {
        void setValue(next === ALL_VALUE ? null : (next as typeof value));
      }}
    >
      <SelectTrigger className="h-8 min-w-[8rem] text-[0.8rem]">
        <SelectValue placeholder={facet.placeholder ?? facet.label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_VALUE}>
          All {facet.label.toLowerCase()}
        </SelectItem>
        {facet.options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function DateRange() {
  const [, startTransition] = useTransition();
  const [{ from, to }, setRange] = useQueryStates(
    {
      from: parseAsString.withDefault(""),
      to: parseAsString.withDefault(""),
    },
    {
      shallow: false,
      startTransition,
      clearOnDefault: true,
    },
  );

  return (
    <div className="flex items-center gap-1.5 text-xs text-text-secondary">
      <label className="sr-only" htmlFor="filter-from">
        From
      </label>
      <Input
        id="filter-from"
        type="date"
        value={from}
        onChange={(e) =>
          void setRange((prev) => ({ ...prev, from: e.target.value }))
        }
        className="h-8 w-36"
      />
      <span aria-hidden>—</span>
      <label className="sr-only" htmlFor="filter-to">
        To
      </label>
      <Input
        id="filter-to"
        type="date"
        value={to}
        onChange={(e) =>
          void setRange((prev) => ({ ...prev, to: e.target.value }))
        }
        className="h-8 w-36"
      />
    </div>
  );
}

function ResetButton({
  searchKey,
  facetKeys,
  showDateRange,
}: {
  searchKey: string;
  facetKeys: string[];
  showDateRange: boolean;
}) {
  const [, startTransition] = useTransition();
  const parsers: Record<
    string,
    ReturnType<typeof parseAsString.withDefault>
  > = {
    [searchKey]: parseAsString.withDefault(""),
  };
  for (const key of facetKeys) {
    parsers[key] = parseAsString.withDefault("");
  }
  if (showDateRange) {
    parsers["from"] = parseAsString.withDefault("");
    parsers["to"] = parseAsString.withDefault("");
  }
  const [values, setValues] = useQueryStates(parsers, {
    shallow: false,
    startTransition,
    clearOnDefault: true,
  });

  const hasAny = Object.values(values).some((v) => v !== "" && v !== null);
  if (!hasAny) return null;

  return (
    <Button
      type="button"
      variant="ghost"
      size="xs"
      onClick={() => {
        const cleared: Record<string, null> = {};
        for (const key of Object.keys(parsers)) cleared[key] = null;
        void setValues(cleared);
      }}
      className="ml-auto text-text-secondary hover:text-text-primary"
    >
      <X className="size-3" aria-hidden />
      Reset
    </Button>
  );
}
