"use client";

import type { ReactNode } from "react";

export function RouteTransition({ children }: { children: ReactNode }) {
  return <div data-route-transition="passthrough" className="contents">{children}</div>;
}
