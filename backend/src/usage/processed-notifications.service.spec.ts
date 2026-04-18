import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { SupabaseService } from '../supabase/supabase.service.js';
import { ProcessedNotificationsService } from './processed-notifications.service.js';

type InsertFn = jest.Mock<
  Promise<{ error: { code?: string; message: string } | null }>,
  unknown[]
>;
type MaybeSingleFn = jest.Mock<
  Promise<{
    data: { notification_uuid: string } | null;
    error: { code?: string; message: string } | null;
  }>,
  unknown[]
>;

describe('ProcessedNotificationsService', () => {
  let service: ProcessedNotificationsService;
  let insertMock: InsertFn;
  let maybeSingleMock: MaybeSingleFn;

  function buildSupabaseStub(): SupabaseService {
    return {
      getAdminClient: () => ({
        from: () => ({
          insert: insertMock,
          select: () => ({
            eq: () => ({
              maybeSingle: maybeSingleMock,
            }),
          }),
        }),
      }),
    } as unknown as SupabaseService;
  }

  beforeEach(async () => {
    insertMock = jest.fn();
    maybeSingleMock = jest.fn();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcessedNotificationsService,
        { provide: SupabaseService, useValue: buildSupabaseStub() },
      ],
    }).compile();
    service = module.get(ProcessedNotificationsService);
  });

  describe('markProcessed', () => {
    it('should return true when insert succeeds', async () => {
      insertMock.mockResolvedValue({ error: null });
      const didMark = await service.markProcessed('uuid-1', 'SUBSCRIBED', null);
      expect(didMark).toBe(true);
    });

    it('should return false when insert fails with unique violation', async () => {
      insertMock.mockResolvedValue({
        error: { code: '23505', message: 'duplicate key' },
      });
      const didMark = await service.markProcessed('uuid-1', 'SUBSCRIBED', null);
      expect(didMark).toBe(false);
    });

    it('should throw when insert fails with other error', async () => {
      insertMock.mockResolvedValue({
        error: { code: '08006', message: 'connection failure' },
      });
      await expect(
        service.markProcessed('uuid-1', 'SUBSCRIBED', null),
      ).rejects.toMatchObject({ code: '08006' });
    });
  });

  describe('isProcessed', () => {
    it('should return true when a row exists', async () => {
      maybeSingleMock.mockResolvedValue({
        data: { notification_uuid: 'uuid-1' },
        error: null,
      });
      const isProcessed = await service.isProcessed('uuid-1');
      expect(isProcessed).toBe(true);
    });

    it('should return false when no row exists', async () => {
      maybeSingleMock.mockResolvedValue({ data: null, error: null });
      const isProcessed = await service.isProcessed('uuid-1');
      expect(isProcessed).toBe(false);
    });

    it('should throw when select fails with non-PGRST116 error', async () => {
      maybeSingleMock.mockResolvedValue({
        data: null,
        error: { code: '08006', message: 'connection failure' },
      });
      await expect(service.isProcessed('uuid-1')).rejects.toMatchObject({
        code: '08006',
      });
    });
  });
});
