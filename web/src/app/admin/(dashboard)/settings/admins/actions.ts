"use server";

import { updateTag } from "next/cache";

import {
  META_CACHE_TAGS,
  demoteAdmin,
  promoteAdmin,
} from "@/lib/admin-api/resources/meta";
import {
  normalizeError,
  type ActionResult,
} from "@/lib/admin-api/errors";
import type { AdminRoleUpdate } from "@/lib/admin-api/types";

export async function promoteAdminAction(
  userId: string,
): Promise<ActionResult<AdminRoleUpdate>> {
  try {
    const data = await promoteAdmin(userId);
    updateTag(META_CACHE_TAGS.admins);
    return { ok: true, data };
  } catch (error) {
    return normalizeError(error);
  }
}

export async function demoteAdminAction(
  userId: string,
): Promise<ActionResult<null>> {
  try {
    await demoteAdmin(userId);
    updateTag(META_CACHE_TAGS.admins);
    return { ok: true, data: null };
  } catch (error) {
    return normalizeError(error);
  }
}
