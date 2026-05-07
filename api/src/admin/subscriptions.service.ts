import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotImplementedException,
} from "@nestjs/common";
import type { User } from "@supabase/supabase-js";

import { config } from "../config/app.config.js";
import { SupabaseService } from "../supabase/supabase.service.js";
import { SUBSCRIPTION_STATUS } from "../usage/subscription-state.js";
import type {
  AdminSubscriptionChurn,
  AdminSubscriptionEvent,
  AdminSubscriptionEventList,
  AdminSubscriptionList,
  AdminSubscriptionMrrArr,
  AdminSubscriptionProductBreakdown,
  AdminSubscriptionSummary,
} from "./subscriptions.types.js";

const MS_PER_DAY = 86_400_000;
const MONTHS_PER_YEAR = 12;
const ANNUAL_PRODUCT_SUFFIX = "annual";
const CHURN_STATUSES = [
  SUBSCRIPTION_STATUS.EXPIRED,
  SUBSCRIPTION_STATUS.REVOKED,
] as const;
const PERCENTAGE_DECIMAL_PLACES = 4;
const EMAIL_LOOKUP_POOL_SIZE = 1000;

interface ProfileSubscriptionRow {
  id: string;
  subscription_status: string;
  subscription_product_id: string | null;
  subscription_environment: string | null;
  subscription_auto_renew_status: boolean | null;
  subscription_expires_at: string | null;
  subscription_verified_at: string | null;
  subscription_apple_signed_at: string | null;
  subscription_original_transaction_id: string | null;
  first_name: string | null;
  last_name: string | null;
}

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  public async listSubscriptions(
    page: number,
    perPage: number,
    status: string | undefined,
  ): Promise<AdminSubscriptionList> {
    const supabase = this.supabaseService.getAdminClient();
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    let query = supabase
      .from("profiles")
      .select(
        "id, first_name, last_name, subscription_status, subscription_product_id, subscription_environment, subscription_auto_renew_status, subscription_expires_at, subscription_verified_at, subscription_apple_signed_at, subscription_original_transaction_id",
        { count: "exact" },
      )
      .order("subscription_verified_at", {
        ascending: false,
        nullsFirst: false,
      })
      .range(from, to);

    if (status !== undefined && status !== "") {
      query = query.eq("subscription_status", status);
    }

    const { data, error, count } = await query;

    if (error !== null) {
      this.logger.error(`Failed to list subscriptions: ${error.message}`);
      throw new InternalServerErrorException("Failed to list subscriptions");
    }

    const rows = data as ProfileSubscriptionRow[];
    const emails = await this.lookupEmails(rows.map((row) => row.id));
    const subscriptions = rows.map((row) =>
      buildSummary(row, emails.get(row.id) ?? ""),
    );
    const total = count ?? 0;

    return {
      subscriptions,
      page,
      perPage,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / perPage),
    };
  }

  public async getDistribution(): Promise<Record<string, number>> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("subscription_status");

    if (error !== null) {
      this.logger.error(
        `Failed to load subscription distribution: ${error.message}`,
      );
      throw new InternalServerErrorException(
        "Failed to load subscription distribution",
      );
    }

    const counts: Record<string, number> = {};
    for (const row of data) {
      const status = row.subscription_status || SUBSCRIPTION_STATUS.UNKNOWN;
      counts[status] = (counts[status] ?? 0) + 1;
    }
    return counts;
  }

  public async getMrrArr(): Promise<AdminSubscriptionMrrArr> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("subscription_product_id")
      .eq("subscription_status", SUBSCRIPTION_STATUS.ACTIVE);

    if (error !== null) {
      this.logger.error(`Failed to compute MRR/ARR: ${error.message}`);
      throw new InternalServerErrorException("Failed to compute MRR/ARR");
    }

    const counts = new Map<string, number>();
    for (const row of data) {
      const productId = row.subscription_product_id;
      if (productId === null) {
        continue;
      }
      counts.set(productId, (counts.get(productId) ?? 0) + 1);
    }

    const byProduct: Record<string, AdminSubscriptionProductBreakdown> = {};
    let mrrTotal = 0;
    let arrTotal = 0;

    for (const [productId, count] of counts) {
      const price = config.subscriptionPricing[productId];
      if (price === undefined) {
        byProduct[productId] = { count, mrr: 0, arr: 0 };
        continue;
      }
      const breakdown = computeProductBreakdown(productId, count, price);
      byProduct[productId] = breakdown;
      mrrTotal += breakdown.mrr;
      arrTotal += breakdown.arr;
    }

    return {
      mrr: roundCurrency(mrrTotal),
      arr: roundCurrency(arrTotal),
      byProduct,
    };
  }

  public async getChurn(days: number): Promise<AdminSubscriptionChurn> {
    const supabase = this.supabaseService.getAdminClient();
    const cutoffIso = new Date(Date.now() - days * MS_PER_DAY).toISOString();

    const [churnedRes, retainedRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .in("subscription_status", CHURN_STATUSES)
        .gte("subscription_expires_at", cutoffIso),
      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("subscription_status", SUBSCRIPTION_STATUS.ACTIVE),
    ]);

    if (churnedRes.error !== null) {
      this.logger.error(
        `Failed to count churned subscriptions: ${churnedRes.error.message}`,
      );
      throw new InternalServerErrorException("Failed to compute churn");
    }
    if (retainedRes.error !== null) {
      this.logger.error(
        `Failed to count retained subscriptions: ${retainedRes.error.message}`,
      );
      throw new InternalServerErrorException("Failed to compute churn");
    }

    const churned = churnedRes.count ?? 0;
    const retained = retainedRes.count ?? 0;
    const denominator = churned + retained;
    const churnRate =
      denominator === 0
        ? 0
        : roundFraction(churned / denominator, PERCENTAGE_DECIMAL_PLACES);

    return { windowDays: days, churned, retained, churnRate };
  }

  public async getRecentEvents(
    limit: number,
  ): Promise<AdminSubscriptionEventList> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from("processed_notifications")
      .select("notification_uuid, notification_type, subtype, received_at")
      .order("received_at", { ascending: false })
      .limit(limit);

    if (error !== null) {
      this.logger.error(
        `Failed to load recent subscription events: ${error.message}`,
      );
      throw new InternalServerErrorException("Failed to load recent events");
    }

    const events: AdminSubscriptionEvent[] = data.map((row) => ({
      notificationUuid: row.notification_uuid,
      notificationType: row.notification_type,
      subtype: row.subtype,
      receivedAt: row.received_at,
    }));

    return { events };
  }

  public async refreshSubscription(userId: string): Promise<never> {
    this.logger.warn(
      `Subscription refresh requested for ${userId} but App Store Server API integration is pending`,
    );
    return Promise.reject(
      new NotImplementedException("App Store Server API integration pending"),
    );
  }

  private async lookupEmails(userIds: string[]): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    if (userIds.length === 0) {
      return map;
    }

    const supabase = this.supabaseService.getAdminClient();
    const idSet = new Set(userIds);
    const { data, error } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: EMAIL_LOOKUP_POOL_SIZE,
    });

    if (error !== null) {
      this.logger.error(`Failed to lookup user emails: ${error.message}`);
      return map;
    }

    for (const user of data.users) {
      if (idSet.has(user.id)) {
        map.set(user.id, emailFromUser(user));
      }
    }
    return map;
  }
}

function emailFromUser(user: User): string {
  return user.email ?? "";
}

function buildSummary(
  row: ProfileSubscriptionRow,
  email: string,
): AdminSubscriptionSummary {
  return {
    userId: row.id,
    email,
    firstName: row.first_name,
    lastName: row.last_name,
    status: row.subscription_status,
    productId: row.subscription_product_id,
    environment: row.subscription_environment,
    autoRenewStatus: row.subscription_auto_renew_status,
    expiresAt: row.subscription_expires_at,
    verifiedAt: row.subscription_verified_at,
    appleSignedAt: row.subscription_apple_signed_at,
    originalTransactionId: row.subscription_original_transaction_id,
  };
}

function computeProductBreakdown(
  productId: string,
  count: number,
  price: number,
): AdminSubscriptionProductBreakdown {
  const isAnnual = productId.endsWith(ANNUAL_PRODUCT_SUFFIX);
  const perUserMrr = isAnnual ? price / MONTHS_PER_YEAR : price;
  const perUserArr = isAnnual ? price : price * MONTHS_PER_YEAR;
  return {
    count,
    mrr: roundCurrency(perUserMrr * count),
    arr: roundCurrency(perUserArr * count),
  };
}

const CURRENCY_DECIMAL_PLACES = 2;
const ROUND_FRACTION_BASE = 10;

function roundCurrency(value: number): number {
  return roundFraction(value, CURRENCY_DECIMAL_PLACES);
}

function roundFraction(value: number, decimals: number): number {
  const factor = ROUND_FRACTION_BASE ** decimals;
  return Math.round(value * factor) / factor;
}
