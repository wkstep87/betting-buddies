import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ORIGIN = "https://v3.football.api-sports.io";
const TTL_SEC = 300;

function cacheKey(url: string) { return `bb-cache:${url}`; }

async function fromCache(k: string) {
  try {
    const v = await Deno.openKv().get<{ t: number; body: any }>([k]);
    if (!v?.value) return null;
    if (Date.now() - v.value.t > TTL_SEC * 1000) return null;
    return v.value.body;
  } catch { return null; }
}
async function toCache(k: string, body: any) {
  try { await Deno.openKv().set([k], { t: Date.now(), body }); } catch {}
}

function teamQueryParam(team: string) {
  return encodeURIComponent(team);
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const type = url.searchParams.get("type") || "";
  const team = url.searchParams.get("team") || "";
  const season = url.searchParams.get("season") || "2025";

  const key = Deno.env.get("API_SPORTS_KEY");
  if (!key) return new Response("Missing API_SPORTS_KEY", { status: 500 });

  let target = "";
  if (type === "injuries") {
    target = `${ORIGIN}/injuries?league=1&season=${season}&team=${teamQueryParam(team)}`;
  } else if (type === "teamstats") {
    target = `${ORIGIN}/teams/statistics?league=1&season=${season}&team=${teamQueryParam(team)}`;
  } else {
    return new Response("Unsupported type", { status: 400 });
  }

  const k = cacheKey(target);
  const cached = await fromCache(k);
  if (cached) return new Response(JSON.stringify(cached), { headers: { "content-type": "application/json" } });

  const resp = await fetch(target, { headers: { "x-apisports-key": key, "accept": "application/json" } });
  const json = await resp.json();
  await toCache(k, json);
  return new Response(JSON.stringify(json), { headers: { "content-type": "application/json" } });
});
