"use server";

import { updateTag } from "next/cache";

import {
  USERS_CACHE_TAGS,
  deleteUser,
  grantPro,
  revokePro,
  updateUser,
  type UpdateUserBody,
} from "@/lib/admin-api/resources/users";
import { refreshSubscription } from "@/lib/admin-api/resources/subscriptions";
import {
  normalizeError,
  type ActionResult,
} from "@/lib/admin-api/errors";
import type {
  AdminUserDetail,
  AdminUserSubscription,
} from "@/lib/admin-api/types";

function revalidateUser(id: string) {
  updateTag(USERS_CACHE_TAGS.list);
  updateTag(USERS_CACHE_TAGS.detail(id));
}

export async function updateUserAction(
  id: string,
  body: UpdateUserBody,
): Promise<ActionResult<AdminUserDetail>> {
  try {
    const data = await updateUser(id, body);
    revalidateUser(id);
    return { ok: true, data };
  } catch (error) {
    return normalizeError(error);
  }
}

export async function grantProAction(
  id: string,
  expiresAt: string,
): Promise<ActionResult<AdminUserSubscription>> {
  try {
    const data = await grantPro(id, expiresAt);
    revalidateUser(id);
    return { ok: true, data };
  } catch (error) {
    return normalizeError(error);
  }
}

export async function revokeProAction(
  id: string,
): Promise<ActionResult<AdminUserSubscription>> {
  try {
    const data = await revokePro(id);
    revalidateUser(id);
    return { ok: true, data };
  } catch (error) {
    return normalizeError(error);
  }
}

export async function deleteUserAction(
  id: string,
): Promise<ActionResult<null>> {
  try {
    await deleteUser(id);
    revalidateUser(id);
    return { ok: true, data: null };
  } catch (error) {
    return normalizeError(error);
  }
}

export async function refreshSubscriptionAction(
  id: string,
): Promise<ActionResult<unknown>> {
  try {
    const data = await refreshSubscription(id);
    revalidateUser(id);
    return { ok: true, data };
  } catch (error) {
    return normalizeError(error);
  }
}
