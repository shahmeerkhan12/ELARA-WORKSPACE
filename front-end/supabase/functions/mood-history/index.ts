import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const client = createClient(supabaseUrl, supabaseKey);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "GET") {
    return json({ detail: "Method not allowed" }, 405);
  }

  const url = new URL(req.url);
  const userId = url.pathname.split("/").pop();

  if (!userId) {
    return json({ detail: "Missing user_id" }, 400);
  }

  const { data, error } = await client
    .from("check_ins")
    .select("entry_date, entry_text, mood_emoji, mood_score, phase, agent_response")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Query error:", error);
    return json({ detail: "Failed to load mood history" }, 500);
  }

  return json({ entries: data || [] });
});