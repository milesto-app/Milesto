import "server-only";

import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "./server";

export async function requireAdmin() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  if (user.app_metadata?.role !== "admin") {
    redirect("/admin/login");
  }

  return user;
}
