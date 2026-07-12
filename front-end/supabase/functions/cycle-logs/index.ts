import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const client = createClient(supabaseUrl, supabaseKey);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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

  if (req.method !== "POST") {
    return json({ detail: "Method not allowed" }, 405);
  }

  const body = await req.json();
  const { user_id, cycle_start_date, period_length } = body;

  if (!user_id || !cycle_start_date) {
    return json({ detail: "Missing required fields: user_id, cycle_start_date" }, 400);
  }

  const { error } = await client.from("cycle_logs").insert({
    user_id,
    cycle_start_date,
    period_length: period_length || null,
  });

  if (error) {
    console.error("Insert error:", error);
    return json({ detail: "Failed to save cycle log" }, 500);
  }

  return json({ message: "Period logged successfully. Your forecast will update with more data." });
});