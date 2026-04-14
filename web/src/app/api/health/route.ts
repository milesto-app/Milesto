import { checkHealth } from "@/lib/supabase/queries/health";

export async function GET() {
  const result = await checkHealth();
  return Response.json(result);
}
