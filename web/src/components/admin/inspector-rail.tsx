"use client";

import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useQueryState } from "nuqs";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import { useHotkeys } from "@/lib/admin-hotkeys";

type InspectorContent = {
  id: string;
  render: () => ReactNode;
};

type InspectorContextValue = {
  registered: InspectorContent | null;
  setRegistered: (content: InspectorContent | null) => void;
  inspectId: string | null;
  open: (id: string) => void;
  close: () => void;
};

const InspectorContext = createContext<InspectorContextValue | null>(null);

function useInspectorContext(): InspectorContextValue {
  const ctx = useContext(InspectorContext);
  if (!ctx) throw new Error("useInspector outside InspectorRailProvider");
  return ctx;
}

export function useInspector(content: InspectorContent | null): {
  inspectId: string | null;
  open: (id: string) => void;
  close: () => void;
} {
  const ctx = useInspectorContext();

  useEffect(() => {
    ctx.setRegistered(content);
    return () => ctx.setRegistered(null);
  }, [ctx, content]);

  return { inspectId: ctx.inspectId, open: ctx.open, close: ctx.close };
}

export function InspectorRailProvider({ children }: { children: ReactNode }) {
  const [inspectId, setInspectId] = useQueryState("inspect", {
    defaultValue: "",
    shallow: true,
  });
  const [registered, setRegistered] = useState<InspectorContent | null>(null);

  const open = useCallback(
    (id: string) => {
      setInspectId(id);
    },
    [setInspectId],
  );

  const close = useCallback(() => {
    setInspectId("");
  }, [setInspectId]);

  useHotkeys({
    keys: "Escape",
    description: "Close inspector",
    scope: "list",
    handler: () => {
      if (inspectId) close();
    },
  });

  const value = useMemo<InspectorContextValue>(
    () => ({
      registered,
      setRegistered,
      inspectId: inspectId || null,
      open,
      close,
    }),
    [registered, inspectId, open, close],
  );

  return (
    <InspectorContext.Provider value={value}>
      {children}
      <RailOutlet />
    </InspectorContext.Provider>
  );
}

function RailOutlet() {
  const { registered, inspectId, close } = useInspectorContext();
  const open = registered != null && inspectId != null;

  return (
    <aside
      data-rail-open={open ? "true" : "false"}
      className={cn(
        "pointer-events-none fixed top-14 right-0 z-30 h-[calc(100vh-3.5rem)] w-[360px] overflow-y-auto border-l border-border-default bg-surface-3 transition-transform",
        open ? "translate-x-0 pointer-events-auto" : "translate-x-full",
      )}
      style={{
        transitionDuration: "220ms",
        transitionTimingFunction: "cubic-bezier(0.2, 0.8, 0.2, 1)",
      }}
      aria-hidden={!open}
    >
      <div className="flex items-center justify-between border-b border-border-default px-4 py-3">
        <span className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary">
          Inspector
        </span>
        <button
          type="button"
          onClick={close}
          className="rounded-md p-1 text-text-secondary hover:bg-surface-2 hover:text-text-primary"
          aria-label="Close inspector"
        >
          <X className="size-4" />
        </button>
      </div>
      <div className="px-4 py-4">{registered?.render() ?? null}</div>
    </aside>
  );
}

export const InspectorSection = ({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) => (
  <section className="mb-5">
    {title ? (
      <h3 className="mb-2 text-[10px] uppercase tracking-[0.14em] text-text-tertiary">
        {title}
      </h3>
    ) : null}
    {children}
  </section>
);

export const InspectorActions = ({ children }: { children: ReactNode }) => (
  <div className="mt-4 flex flex-col gap-2">{children}</div>
);
