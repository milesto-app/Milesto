/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call, @typescript-eslint/explicit-function-return-type, @typescript-eslint/explicit-member-accessibility, @typescript-eslint/promise-function-async */
import {
  Environment,
  InAppOwnershipType,
  type JWSRenewalInfoDecodedPayload,
  type JWSTransactionDecodedPayload,
  type LastTransactionsItem,
  type ResponseBodyV2DecodedPayload,
  Status,
  type StatusResponse,
  type SubscriptionGroupIdentifierItem,
  Type,
} from "@apple/app-store-server-library";
import { mock } from "bun:test";

const MS_PER_DAY = 86_400_000;

// ---------- Verifier fakes ----------

type Behavior<T> = (jws: string) => Promise<T>;

interface VerifierBehaviors {
  transaction?: Behavior<JWSTransactionDecodedPayload>;
  notification?: Behavior<ResponseBodyV2DecodedPayload>;
  renewalInfo?: Behavior<JWSRenewalInfoDecodedPayload>;
}

const verifierStubs = new Map<Environment, VerifierBehaviors>();

export function setVerifier(
  env: Environment,
  behaviors: VerifierBehaviors,
): void {
  const existing = verifierStubs.get(env) ?? {};
  verifierStubs.set(env, { ...existing, ...behaviors });
}

export function resetVerifiers(): void {
  verifierStubs.clear();
}

export class FakeVerifier {
  constructor(public readonly env: Environment) {}

  verifyAndDecodeTransaction(jws: string) {
    const stub = verifierStubs.get(this.env)?.transaction;
    if (!stub) {
      throw new Error(
        `FakeVerifier(${this.env}): no transaction stub configured`,
      );
    }
    return stub(jws);
  }

  verifyAndDecodeNotification(jws: string) {
    const stub = verifierStubs.get(this.env)?.notification;
    if (!stub) {
      throw new Error(
        `FakeVerifier(${this.env}): no notification stub configured`,
      );
    }
    return stub(jws);
  }

  verifyAndDecodeRenewalInfo(jws: string) {
    const stub = verifierStubs.get(this.env)?.renewalInfo;
    if (!stub) {
      throw new Error(
        `FakeVerifier(${this.env}): no renewalInfo stub configured`,
      );
    }
    return stub(jws);
  }
}

export function injectFakeVerifiers(
  service: unknown,
  options: { sandboxFallback?: boolean } = {},
): { primary: FakeVerifier; sandbox: FakeVerifier | null } {
  const primary = new FakeVerifier(Environment.PRODUCTION);
  const sandbox =
    options.sandboxFallback === false
      ? null
      : new FakeVerifier(Environment.SANDBOX);
  const internal = service as {
    primaryVerifier: FakeVerifier;
    sandboxFallbackVerifier: FakeVerifier | null;
  };
  internal.primaryVerifier = primary;
  internal.sandboxFallbackVerifier = sandbox;
  return { primary, sandbox };
}

// ---------- Supabase fake ----------

type FilterOp = "eq" | "is" | "gt";

interface Filter {
  op: FilterOp;
  col: string;
  val: unknown;
}

type Row = Record<string, unknown>;

interface RecordedCall {
  table: string;
  op: "select" | "insert" | "update" | "upsert";
  payload: unknown;
  filters: readonly Filter[];
}

class FakeQuery implements PromiseLike<{ data: any; error: any }> {
  private op: "select" | "insert" | "update" | "upsert" = "select";
  private payload: unknown = null;
  private readonly filters: Filter[] = [];
  private wantSingle = false;

  constructor(
    private readonly table: string,
    private readonly store: FakeStore,
  ) {}

  select(_cols?: string) {
    this.op = "select";
    return this;
  }

  insert(rows: Row | Row[]) {
    this.op = "insert";
    this.payload = rows;
    return this;
  }

  update(patch: Row) {
    this.op = "update";
    this.payload = patch;
    return this;
  }

  upsert(rows: Row | Row[], _opts?: unknown) {
    this.op = "upsert";
    this.payload = rows;
    return this;
  }

  eq(col: string, val: unknown) {
    this.filters.push({ op: "eq", col, val });
    return this;
  }

  is(col: string, val: unknown) {
    this.filters.push({ op: "is", col, val });
    return this;
  }

  gt(col: string, val: unknown) {
    this.filters.push({ op: "gt", col, val });
    return this;
  }

  order(_col: string, _opts?: unknown) {
    return this;
  }

  limit(_n: number) {
    return this;
  }

  maybeSingle() {
    this.wantSingle = true;
    return this;
  }

  then<R = { data: any; error: any }, E = never>(
    onfulfilled?:
      | ((value: { data: any; error: any }) => R | PromiseLike<R>)
      | null,
    onrejected?: ((reason: unknown) => E | PromiseLike<E>) | null,
  ): Promise<R | E> {
    return this.execute().then(onfulfilled, onrejected);
  }

  private async execute() {
    return this.store.run(
      this.table,
      this.op,
      this.payload,
      this.filters,
      this.wantSingle,
    );
  }
}

export class FakeStore {
  private readonly rows = new Map<string, Row[]>();
  readonly calls: RecordedCall[] = [];

  seed(table: string, rows: Row[]): void {
    this.rows.set(
      table,
      rows.map((row) => ({ ...row })),
    );
  }

  getRows(table: string): readonly Row[] {
    return this.rows.get(table) ?? [];
  }

  callsFor(
    table: string,
    op?: "select" | "insert" | "update" | "upsert",
  ): RecordedCall[] {
    return this.calls.filter(
      (call) => call.table === table && (op === undefined || call.op === op),
    );
  }

  reset(): void {
    this.rows.clear();
    this.calls.length = 0;
  }

  async run(
    table: string,
    op: RecordedCall["op"],
    payload: unknown,
    filters: Filter[],
    wantSingle: boolean,
  ): Promise<{ data: any; error: any }> {
    this.calls.push({ table, op, payload, filters: [...filters] });

    if (op === "select") {
      const matched = this.applyFilters(table, filters);
      if (wantSingle) {
        return {
          data: matched.length === 0 ? null : matched[0],
          error: null,
        };
      }
      return { data: matched, error: null };
    }

    const list = this.rows.get(table) ?? [];
    if (op === "insert" || op === "upsert") {
      const incoming = Array.isArray(payload) ? payload : [payload];
      list.push(...(incoming as Row[]));
      this.rows.set(table, list);
      return { data: null, error: null };
    }
    if (op === "update") {
      const matched = this.applyFilters(table, filters);
      for (const row of matched) {
        Object.assign(row, payload as Row);
      }
      return { data: null, error: null };
    }
    return { data: null, error: null };
  }

  private applyFilters(table: string, filters: Filter[]): Row[] {
    let rows = (this.rows.get(table) ?? []).slice();
    for (const filter of filters) {
      if (filter.op === "eq") {
        rows = rows.filter((row) => row[filter.col] === filter.val);
      } else if (filter.op === "is") {
        rows = rows.filter((row) => row[filter.col] === filter.val);
      } else if (filter.op === "gt") {
        const compareTo = filter.val;
        if (typeof compareTo !== "string") {
          rows = [];
          continue;
        }
        rows = rows.filter((row) => {
          const value = row[filter.col];
          return typeof value === "string" && value > compareTo;
        });
      }
    }
    return rows;
  }
}

export class FakeSupabaseClient {
  constructor(private readonly store: FakeStore) {}

  from(table: string): FakeQuery {
    return new FakeQuery(table, this.store);
  }
}

export class FakeSupabaseService {
  readonly store = new FakeStore();
  private readonly client = new FakeSupabaseClient(this.store);

  getAdminClient(): FakeSupabaseClient {
    return this.client;
  }
}

// ---------- App Store Server API fake ----------

export function makeFakeAppStoreApi(
  impl?: (origTx: string, env: Environment) => Promise<StatusResponse>,
) {
  return {
    isConfigured: true,
    getSubscriptionStatuses: mock(
      impl ?? (async () => makeStatusResponse({ data: [] })),
    ),
  };
}

// ---------- Fixture builders ----------

export const TEST_BUNDLE_ID = "app.milesto.test";
export const TEST_PRODUCT_ID = "milesto_plus_monthly";
export const TEST_USER_UUID = "11111111-1111-4111-8111-111111111111";
export const TEST_ORIGINAL_TX = "1000000999999999";
export const TEST_LATEST_TX = "1000000999999998";

export function makeTransaction(
  overrides: Partial<JWSTransactionDecodedPayload> = {},
): JWSTransactionDecodedPayload {
  const now = Date.now();
  return {
    transactionId: TEST_LATEST_TX,
    originalTransactionId: TEST_ORIGINAL_TX,
    bundleId: TEST_BUNDLE_ID,
    productId: TEST_PRODUCT_ID,
    type: Type.AUTO_RENEWABLE_SUBSCRIPTION,
    inAppOwnershipType: InAppOwnershipType.PURCHASED,
    environment: Environment.PRODUCTION,
    purchaseDate: now,
    signedDate: now,
    expiresDate: now + 30 * MS_PER_DAY,
    appAccountToken: TEST_USER_UUID,
    ...overrides,
  };
}

export function makeRenewalInfo(
  overrides: Partial<JWSRenewalInfoDecodedPayload> = {},
): JWSRenewalInfoDecodedPayload {
  return {
    autoRenewStatus: 1,
    autoRenewProductId: TEST_PRODUCT_ID,
    productId: TEST_PRODUCT_ID,
    originalTransactionId: TEST_ORIGINAL_TX,
    environment: Environment.PRODUCTION,
    signedDate: Date.now(),
    ...overrides,
  };
}

export function makeLastTransactionsItem(
  overrides: Partial<LastTransactionsItem> = {},
): LastTransactionsItem {
  return {
    status: Status.ACTIVE,
    originalTransactionId: TEST_ORIGINAL_TX,
    signedTransactionInfo: "tx-jws",
    signedRenewalInfo: "renewal-jws",
    ...overrides,
  };
}

export function makeStatusResponse(
  overrides: Partial<StatusResponse> = {},
): StatusResponse {
  const group: SubscriptionGroupIdentifierItem = {
    subscriptionGroupIdentifier: "group-1",
    lastTransactions: [makeLastTransactionsItem()],
  };

  return {
    environment: Environment.PRODUCTION,
    bundleId: TEST_BUNDLE_ID,
    data: [group],
    ...overrides,
  };
}

export function makeNotification(
  overrides: Partial<ResponseBodyV2DecodedPayload> = {},
): ResponseBodyV2DecodedPayload {
  return {
    notificationType: "DID_RENEW",
    notificationUUID: "uuid-default",
    version: "2.0",
    signedDate: Date.now(),
    data: {
      bundleId: TEST_BUNDLE_ID,
      environment: Environment.PRODUCTION,
      signedTransactionInfo: "signed-tx-jws",
      signedRenewalInfo: "signed-renewal-jws",
    },
    ...overrides,
  };
}
