import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { SupabaseService } from '../supabase/supabase.service.js';
import { ProcessedNotificationsService } from './processed-notifications.service.js';

type InsertFn = jest.Mock<
  Promise<{ error: { code?: string; message: string } | null }>,
  unknown[]
>;

describe('ProcessedNotificationsService', () => {
  let service: ProcessedNotificationsService;
  let insertMock: InsertFn;

  function buildSupabaseStub(): SupabaseService {
    return {
      getAdminClient: () => ({
        from: () => ({ insert: insertMock }),
      }),
    } as unknown as SupabaseService;
  }

  beforeEach(async () => {
    insertMock = jest.fn();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcessedNotificationsService,
        { provide: SupabaseService, useValue: buildSupabaseStub() },
      ],
    }).compile();
    service = module.get(ProcessedNotificationsService);
  });

  it('should return true when insert succeeds', async () => {
    insertMock.mockResolvedValue({ error: null });
    const didClaim = await service.tryClaim('uuid-1', 'SUBSCRIBED', null);
    expect(didClaim).toBe(true);
  });

  it('should return false when insert fails with unique violation', async () => {
    insertMock.mockResolvedValue({
      error: { code: '23505', message: 'duplicate key' },
    });
    const didSecondClaim = await service.tryClaim('uuid-1', 'SUBSCRIBED', null);
    expect(didSecondClaim).toBe(false);
  });

  it('should throw when insert fails with other error', async () => {
    insertMock.mockResolvedValue({
      error: { code: '08006', message: 'connection failure' },
    });
    await expect(
      service.tryClaim('uuid-1', 'SUBSCRIBED', null),
    ).rejects.toMatchObject({ code: '08006' });
  });
});
