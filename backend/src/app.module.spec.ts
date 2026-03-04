import { APP_GUARD } from '@nestjs/core';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppModule } from './app.module.js';

describe('AppModule - event handling', () => {
  it('should configure EventEmitter2 global error handler', () => {
    const mockOn = jest.fn();
    const mockEventEmitter = { on: mockOn } as unknown as EventEmitter2;

    const appModule = new AppModule(mockEventEmitter);
    appModule.onModuleInit();

    expect(mockOn).toHaveBeenCalledWith('error', expect.any(Function));
  });

  it('should log errors via the error handler', () => {
    const handlers: Record<string, (...args: unknown[]) => void> = {};
    const mockOn = jest.fn((event: string, handler: (...args: unknown[]) => void) => {
      handlers[event] = handler;
    });
    const mockEventEmitter = { on: mockOn } as unknown as EventEmitter2;

    const appModule = new AppModule(mockEventEmitter);
    appModule.onModuleInit();

    const testError = new Error('test error');
    testError.stack = 'test stack';

    const errorHandler = handlers['error'];

    if (errorHandler === undefined) {
      throw new Error('error handler not registered');
    }
    expect(() => {
      errorHandler(testError);
    }).not.toThrow();
  });
});

describe('AppModule - module metadata', () => {
  it('should include ThrottlerModule in imports', () => {
    const imports = Reflect.getMetadata('imports', AppModule) as unknown[];
    expect(
      imports.some((imp: unknown) => {
        if (imp === ThrottlerModule) {
          return true;
        }
        if (imp !== null && typeof imp === 'object' && 'module' in imp) {
          return (imp as { module: unknown }).module === ThrottlerModule;
        }
        return false;
      }),
    ).toBe(true);
  });

  it('should register ThrottlerGuard as APP_GUARD', () => {
    const providers = Reflect.getMetadata('providers', AppModule) as unknown[];
    const guardProvider = providers.find((p) => {
      if (p === null || typeof p !== 'object') {
        return false;
      }
      const provider = p as { provide?: unknown; useClass?: unknown };
      return provider.provide === APP_GUARD && provider.useClass === ThrottlerGuard;
    });
    expect(guardProvider).toBeDefined();
  });
});
