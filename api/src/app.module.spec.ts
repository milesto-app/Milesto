import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";

import { AppModule } from "./app.module.js";

describe("AppModule", () => {
  it("should include ThrottlerModule in imports", () => {
    const imports = Reflect.getMetadata("imports", AppModule) as unknown[];
    expect(
      imports.some((imp: unknown) => {
        if (imp === ThrottlerModule) {
          return true;
        }
        if (imp !== null && typeof imp === "object" && "module" in imp) {
          return imp.module === ThrottlerModule;
        }
        return false;
      }),
    ).toBe(true);
  });

  it("should register ThrottlerGuard as APP_GUARD", () => {
    const providers = Reflect.getMetadata("providers", AppModule) as unknown[];
    const guardProvider = providers.find((p) => {
      if (p === null || typeof p !== "object") {
        return false;
      }
      const provider = p as { provide?: unknown; useClass?: unknown };
      return (
        provider.provide === APP_GUARD && provider.useClass === ThrottlerGuard
      );
    });
    expect(guardProvider).toBeDefined();
  });
});
