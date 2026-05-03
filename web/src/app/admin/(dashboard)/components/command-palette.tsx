"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CornerDownLeft, Search } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  ADMIN_NAV_GROUPS,
  ADMIN_SETTINGS_ITEMS,
  type AdminNavItem,
} from "./nav-config";

type PaletteEntry = AdminNavItem & { group: string };

const ENTRIES: PaletteEntry[] = [
  ...ADMIN_NAV_GROUPS.flatMap((group) =>
    group.items.map((item) => ({ ...item, group: group.label })),
  ),
  ...ADMIN_SETTINGS_ITEMS.map((item) => ({ ...item, group: "Settings" })),
];

function score(entry: PaletteEntry, query: string): number {
  if (!query) return 0;
  const haystack = [
    entry.title.toLowerCase(),
    entry.group.toLowerCase(),
    ...(entry.keywords ?? []).map((k) => k.toLowerCase()),
  ].join(" ");
  const needle = query.toLowerCase();
  if (entry.title.toLowerCase().startsWith(needle)) return 3;
  if (haystack.includes(needle)) return 2;
  // Fuzzy: every char appears in order
  let i = 0;
  for (const ch of haystack) {
    if (ch === needle[i]) i++;
    if (i === needle.length) return 1;
  }
  return 0;
}

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    if (!query) return ENTRIES.map((entry, i) => ({ entry, rank: 0, key: i }));
    return ENTRIES.map((entry, i) => ({
      entry,
      rank: score(entry, query),
      key: i,
    }))
      .filter((r) => r.rank > 0)
      .sort((a, b) => b.rank - a.rank);
  }, [query]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const isMac = navigator.platform.toLowerCase().includes("mac");
      const mod = isMac ? event.metaKey : event.ctrlKey;
      if (mod && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setQuery("");
      setActiveIndex(0);
    }
  }

  function handleQueryChange(value: string) {
    setQuery(value);
    setActiveIndex(0);
  }

  function commit(entry: PaletteEntry) {
    handleOpenChange(false);
    router.push(entry.href);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, Math.max(results.length - 1, 0)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const target = results[activeIndex];
      if (target) commit(target.entry);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex w-full items-center gap-2 rounded-md border border-sidebar-border/60 bg-sidebar-accent/30 px-2.5 py-1.5 text-left text-xs text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
      >
        <Search className="h-3.5 w-3.5" aria-hidden />
        <span className="flex-1">Search…</span>
        <kbd className="rounded border border-sidebar-border/80 bg-sidebar-accent/40 px-1.5 py-0.5 font-mono text-[10px] text-sidebar-foreground/70">
          ⌘K
        </kbd>
      </button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="max-w-lg gap-0 overflow-hidden p-0"
        >
          <DialogTitle className="sr-only">Command palette</DialogTitle>
          <DialogDescription className="sr-only">
            Search admin routes and key actions
          </DialogDescription>
          <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" aria-hidden />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Jump to a page…"
              className="h-8 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              aria-label="Search admin routes"
            />
            <kbd className="rounded border border-border/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              esc
            </kbd>
          </div>
          <div className="max-h-80 overflow-auto py-1">
            {results.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs text-muted-foreground">
                No matches
              </div>
            ) : (
              results.map(({ entry, key }, idx) => {
                const Icon = entry.icon;
                const active = idx === activeIndex;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => commit(entry)}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={cn(
                      "flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors",
                      active
                        ? "bg-accent text-accent-foreground"
                        : "text-foreground/80 hover:bg-accent/50",
                    )}
                  >
                    <Icon
                      className="h-4 w-4 text-muted-foreground"
                      aria-hidden
                    />
                    <span className="flex-1">{entry.title}</span>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {entry.group}
                    </span>
                    {active ? (
                      <CornerDownLeft
                        className="h-3.5 w-3.5 text-muted-foreground"
                        aria-hidden
                      />
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
