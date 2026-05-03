"use client";

import { useTransition, type ReactNode } from "react";
import { parseAsString, useQueryState } from "nuqs";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type UrlTabItem = {
  value: string;
  label: ReactNode;
  content: ReactNode;
};

export function UrlTabs({
  items,
  paramKey = "tab",
  defaultValue,
  className,
}: {
  items: UrlTabItem[];
  paramKey?: string;
  defaultValue?: string;
  className?: string;
}) {
  const fallback = defaultValue ?? items[0]?.value ?? "";
  const [, startTransition] = useTransition();
  const [value, setValue] = useQueryState(
    paramKey,
    parseAsString.withDefault(fallback).withOptions({
      shallow: false,
      startTransition,
      clearOnDefault: true,
    }),
  );

  const active = items.some((item) => item.value === value) ? value : fallback;

  return (
    <Tabs
      value={active}
      onValueChange={(next) => {
        if (typeof next !== "string") return;
        void setValue(next);
      }}
      className={className}
    >
      <TabsList>
        {items.map((item) => (
          <TabsTrigger key={item.value} value={item.value}>
            {item.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {items.map((item) => (
        <TabsContent key={item.value} value={item.value}>
          {item.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
