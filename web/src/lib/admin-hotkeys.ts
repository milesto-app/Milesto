"use client";

import { createContext, useContext, useEffect } from "react";

export type HotkeyScope = "global" | "list" | "detail" | "dialog";

export type HotkeyBinding = {
  keys: string;
  description: string;
  scope: HotkeyScope;
  handler: (event: KeyboardEvent) => void;
};

type HotkeyContextValue = {
  register: (binding: HotkeyBinding) => () => void;
  bindings: HotkeyBinding[];
  cheatsheetOpen: boolean;
  setCheatsheetOpen: (open: boolean) => void;
  setActiveScope: (scope: HotkeyScope | null) => void;
};

const HotkeyContext = createContext<HotkeyContextValue | null>(null);

export function useHotkeyContext(): HotkeyContextValue {
  const ctx = useContext(HotkeyContext);
  if (!ctx) throw new Error("useHotkeyContext outside KeyboardScopeProvider");
  return ctx;
}

export function useHotkeys(binding: HotkeyBinding): void {
  const { register } = useHotkeyContext();
  useEffect(() => register(binding), [register, binding]);
}

export function useScope(scope: HotkeyScope): void {
  const { setActiveScope } = useHotkeyContext();
  useEffect(() => {
    setActiveScope(scope);
    return () => setActiveScope(null);
  }, [setActiveScope, scope]);
}

export { HotkeyContext };
