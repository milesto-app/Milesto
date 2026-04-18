/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument, @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-non-null-assertion, @typescript-eslint/naming-convention, @typescript-eslint/explicit-function-return-type, complexity */
import {
  VerificationException,
  VerificationStatus,
} from '@apple/app-store-server-library/dist/jws_verification.js';
import type { JWSTransactionDecodedPayload } from '@apple/app-store-server-library/dist/models/JWSTransactionDecodedPayload.js';
import type { ResponseBodyV2DecodedPayload } from '@apple/app-store-server-library/dist/models/ResponseBodyV2DecodedPayload.js';
import {
  BadRequestException,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';

const TEST_BUNDLE_ID = 'app.momentum-ai.auth.mobile';
const TEST_USER_ID = '11111111-1111-1111-1111-111111111111';
const OTHER_USER_ID = '22222222-2222-2222-2222-222222222222';

process.env.NODE_ENV = 'test';
process.env.APPLE_BUNDLE_ID = TEST_BUNDLE_ID;
process.env.APPLE_ENVIRONMENT = 'Sandbox';
process.env.APPLE_ROOT_CA_DIR = 'apple-root-certs';

const verifyAndDecodeTransactionMock = jest.fn();
const verifyAndDecodeNotificationMock = jest.fn();
const verifyAndDecodeRenewalInfoMock = jest.fn();

jest.mock('@apple/app-store-server-library/dist/jws_verification.js', () => {
  const actual = jest.requireActual(
    '@apple/app-store-server-library/dist/jws_verification.js',
  );
  return {
    ...actual,
    SignedDataVerifier: jest.fn().mockImplementation(() => ({
      verifyAndDecodeTransaction: verifyAndDecodeTransactionMock,
      verifyAndDecodeNotification: verifyAndDecodeNotificationMock,
      verifyAndDecodeRenewalInfo: verifyAndDecodeRenewalInfoMock,
    })),
  };
});

jest.mock('./apple-root-certs.js', () => ({
  loadAppleRootCertificates: jest.fn(() => [Buffer.alloc(16)]),
}));

import type { SupabaseService } from '../supabase/supabase.service.js';
import type { ProcessedNotificationsService } from './processed-notifications.service.js';
import { SubscriptionService } from './subscription.service.js';

type MaybeSingleResult = {
  data: Record<string, unknown> | null;
  error: { code?: string; message: string } | null;
};

interface ProfileRow {
  id?: string;
  subscription_apple_signed_at?: string | null;
  subscription_status?: string;
  subscription_expires_at?: string | null;
  subscription_product_id?: string | null;
  subscription_auto_renew_status?: boolean | null;
  subscription_original_transaction_id?: string | null;
}

interface FakeDbState {
  profileById: Map<string, ProfileRow>;
  profileByOriginalTx: Map<string, ProfileRow>;
  updates: Array<{ where: string; patch: Record<string, unknown> }>;
  maybeSingleQueue: MaybeSingleResult[];
}

function buildFakeSupabase(state: FakeDbState): SupabaseService {
  const from = () => {
    const builder: any = {
      _selectCols: '',
      _filters: [] as Array<{ op: string; col: string; val: any }>,
      _patch: null as Record<string, unknown> | null,
      _insert: null as Record<string, unknown> | null,
      select(cols: string) {
        this._selectCols = cols;
        return this;
      },
      eq(col: string, val: any) {
        this._filters.push({ op: 'eq', col, val });
        return this;
      },
      neq(col: string, val: any) {
        this._filters.push({ op: 'neq', col, val });
        return this;
      },
      update(patch: Record<string, unknown>) {
        this._patch = patch;
        return {
          eq: async (col: string, val: any) => {
            state.updates.push({ where: `${col}=${String(val)}`, patch });
            return Promise.resolve({ error: null });
          },
        };
      },
      async maybeSingle() {
        if (state.maybeSingleQueue.length > 0) {
          return Promise.resolve(state.maybeSingleQueue.shift()!);
        }
        const idFilter = this._filters.find(
          (f: any) => f.op === 'eq' && f.col === 'id',
        );
        const origFilter = this._filters.find(
          (f: any) =>
            f.op === 'eq' && f.col === 'subscription_original_transaction_id',
        );
        const neqId = this._filters.find(
          (f: any) => f.op === 'neq' && f.col === 'id',
        );
        if (idFilter) {
          const row = state.profileById.get(idFilter.val);
          return Promise.resolve({
            data: row ?? null,
            error: row ? null : { code: 'PGRST116', message: 'not found' },
          });
        }
        if (origFilter) {
          const row = state.profileByOriginalTx.get(origFilter.val);
          if (row && neqId && row.id === neqId.val) {
            return Promise.resolve({
              data: null,
              error: { code: 'PGRST116', message: 'not found' },
            });
          }
          return Promise.resolve({
            data: row ?? null,
            error: row ? null : { code: 'PGRST116', message: 'not found' },
          });
        }
        return Promise.resolve({
          data: null,
          error: { code: 'PGRST116', message: 'not found' },
        });
      },
    };
    return builder;
  };

  return {
    getAdminClient: () => ({ from }),
  } as unknown as SupabaseService;
}

function buildService(state: FakeDbState): SubscriptionService {
  const supabase = buildFakeSupabase(state);
  const processed = {
    tryClaim: jest.fn().mockResolvedValue(true),
  } as unknown as ProcessedNotificationsService;
  return new SubscriptionService(supabase, processed);
}

function buildTransaction(
  overrides: Partial<JWSTransactionDecodedPayload> = {},
): JWSTransactionDecodedPayload {
  return {
    type: 'Auto-Renewable Subscription',
    bundleId: TEST_BUNDLE_ID,
    productId: 'momentum_monthly',
    appAccountToken: TEST_USER_ID,
    inAppOwnershipType: 'PURCHASED',
    transactionId: 'tx-1',
    originalTransactionId: 'orig-1',
    expiresDate: Date.now() + 60_000,
    signedDate: Date.now(),
    environment: 'Sandbox',
    ...overrides,
  };
}

function buildNotification(
  overrides: Partial<ResponseBodyV2DecodedPayload> = {},
): ResponseBodyV2DecodedPayload {
  return {
    notificationType: 'DID_RENEW',
    notificationUUID: 'uuid-1',
    signedDate: Date.now(),
    data: {
      signedTransactionInfo: 'signed-tx',
    },
    ...overrides,
  };
}

describe('SubscriptionService', () => {
  beforeEach(() => {
    verifyAndDecodeTransactionMock.mockReset();
    verifyAndDecodeNotificationMock.mockReset();
    verifyAndDecodeRenewalInfoMock.mockReset();
  });

  describe('verifyAndSync', () => {
    it('should reject when appAccountToken does not match user', async () => {
      verifyAndDecodeTransactionMock.mockResolvedValue(
        buildTransaction({ appAccountToken: OTHER_USER_ID }),
      );
      const state: FakeDbState = {
        profileById: new Map(),
        profileByOriginalTx: new Map(),
        updates: [],
        maybeSingleQueue: [],
      };
      const service = buildService(state);
      await expect(
        service.verifyAndSync(TEST_USER_ID, 'jws'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('should reject FAMILY_SHARED transactions', async () => {
      verifyAndDecodeTransactionMock.mockResolvedValue(
        buildTransaction({ inAppOwnershipType: 'FAMILY_SHARED' }),
      );
      const service = buildService({
        profileById: new Map(),
        profileByOriginalTx: new Map(),
        updates: [],
        maybeSingleQueue: [],
      });
      await expect(
        service.verifyAndSync(TEST_USER_ID, 'jws'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('should reject unknown productId', async () => {
      verifyAndDecodeTransactionMock.mockResolvedValue(
        buildTransaction({ productId: 'momentum_unknown' }),
      );
      const service = buildService({
        profileById: new Map(),
        profileByOriginalTx: new Map(),
        updates: [],
        maybeSingleQueue: [],
      });
      await expect(
        service.verifyAndSync(TEST_USER_ID, 'jws'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('should reject wrong bundleId', async () => {
      verifyAndDecodeTransactionMock.mockResolvedValue(
        buildTransaction({ bundleId: 'app.attacker.fake' }),
      );
      const service = buildService({
        profileById: new Map(),
        profileByOriginalTx: new Map(),
        updates: [],
        maybeSingleQueue: [],
      });
      await expect(
        service.verifyAndSync(TEST_USER_ID, 'jws'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('should no-op when signedDate is stale', async () => {
      const oldSignedDate = 1_000_000;
      verifyAndDecodeTransactionMock.mockResolvedValue(
        buildTransaction({ signedDate: oldSignedDate }),
      );
      const state: FakeDbState = {
        profileById: new Map([
          [
            TEST_USER_ID,
            {
              id: TEST_USER_ID,
              subscription_apple_signed_at: new Date(
                oldSignedDate + 1000,
              ).toISOString(),
            },
          ],
        ]),
        profileByOriginalTx: new Map(),
        updates: [],
        maybeSingleQueue: [],
      };
      const service = buildService(state);
      await service.verifyAndSync(TEST_USER_ID, 'jws');
      expect(state.updates).toHaveLength(0);
    });

    it('should reject replay when originalTransactionId is owned by another user', async () => {
      verifyAndDecodeTransactionMock.mockResolvedValue(buildTransaction());
      const state: FakeDbState = {
        profileById: new Map(),
        profileByOriginalTx: new Map([['orig-1', { id: OTHER_USER_ID }]]),
        updates: [],
        maybeSingleQueue: [],
      };
      const service = buildService(state);
      await expect(
        service.verifyAndSync(TEST_USER_ID, 'jws'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('should NOT fall back on VERIFICATION_FAILURE even in production mode', async () => {
      verifyAndDecodeTransactionMock.mockRejectedValue(
        new VerificationException(VerificationStatus.VERIFICATION_FAILURE),
      );
      const service = buildService({
        profileById: new Map(),
        profileByOriginalTx: new Map(),
        updates: [],
        maybeSingleQueue: [],
      });
      await expect(
        service.verifyAndSync(TEST_USER_ID, 'jws'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(verifyAndDecodeTransactionMock).toHaveBeenCalledTimes(1);
    });

    it('should rethrow on VERIFICATION_FAILURE', async () => {
      verifyAndDecodeTransactionMock.mockRejectedValue(
        new VerificationException(VerificationStatus.VERIFICATION_FAILURE),
      );
      const service = buildService({
        profileById: new Map(),
        profileByOriginalTx: new Map(),
        updates: [],
        maybeSingleQueue: [],
      });
      await expect(
        service.verifyAndSync(TEST_USER_ID, 'jws'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('handleWebhook', () => {
    it('should 400 when signedPayload missing', async () => {
      const service = buildService({
        profileById: new Map(),
        profileByOriginalTx: new Map(),
        updates: [],
        maybeSingleQueue: [],
      });
      await expect(service.handleWebhook('')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('should return early on dedupe (tryClaim returns false)', async () => {
      verifyAndDecodeNotificationMock.mockResolvedValue(buildNotification());
      const state: FakeDbState = {
        profileById: new Map(),
        profileByOriginalTx: new Map(),
        updates: [],
        maybeSingleQueue: [],
      };
      const supabase = buildFakeSupabase(state);
      const processed = {
        tryClaim: jest.fn().mockResolvedValue(false),
      } as unknown as ProcessedNotificationsService;
      const service = new SubscriptionService(supabase, processed);

      await service.handleWebhook('signed-payload');
      expect(state.updates).toHaveLength(0);
      expect(verifyAndDecodeTransactionMock).not.toHaveBeenCalled();
    });
  });

  describe('getStatus', () => {
    it('should return unknown when profile row does not exist', async () => {
      const state: FakeDbState = {
        profileById: new Map(),
        profileByOriginalTx: new Map(),
        updates: [],
        maybeSingleQueue: [],
      };
      const service = buildService(state);
      const result = await service.getStatus(TEST_USER_ID);
      expect(result.status).toBe('unknown');
      expect(result.expiresAt).toBeNull();
      expect(result.productId).toBeNull();
      expect(result.autoRenew).toBeNull();
    });

    it('should return profile row when it exists', async () => {
      const expires = new Date(Date.now() + 60_000).toISOString();
      const state: FakeDbState = {
        profileById: new Map([
          [
            TEST_USER_ID,
            {
              id: TEST_USER_ID,
              subscription_status: 'active',
              subscription_expires_at: expires,
              subscription_product_id: 'momentum_monthly',
              subscription_auto_renew_status: true,
            },
          ],
        ]),
        profileByOriginalTx: new Map(),
        updates: [],
        maybeSingleQueue: [],
      };
      const service = buildService(state);
      const result = await service.getStatus(TEST_USER_ID);
      expect(result.status).toBe('active');
      expect(result.expiresAt).toBe(expires);
      expect(result.productId).toBe('momentum_monthly');
      expect(result.autoRenew).toBe(true);
    });

    it('should throw on real DB error (non-PGRST116)', async () => {
      const state: FakeDbState = {
        profileById: new Map(),
        profileByOriginalTx: new Map(),
        updates: [],
        maybeSingleQueue: [
          { data: null, error: { code: '08006', message: 'conn fail' } },
        ],
      };
      const service = buildService(state);
      await expect(service.getStatus(TEST_USER_ID)).rejects.toBeInstanceOf(
        InternalServerErrorException,
      );
    });
  });
});
