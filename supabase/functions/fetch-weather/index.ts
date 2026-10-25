// Supabase Edge Function: fetch-weather
//
// 地点（緯度経度）が設定されている全家族について、Open-Meteo から日別・時間別の天気予報を取得し
// weather_daily / weather_hourly テーブルへ upsert する。pg_cron から1日数回呼び出す想定（README 参照）。
//
// Open-Meteo の無料APIは非商用利用向け。商用化する場合は有料プラン（API キー）に切り替え、
// OPEN_METEO_API_KEY を設定すると customer-api.open-meteo.com を使う。

import { createClient } from 'npm:@supabase/supabase-js@2';

type DailyForecast = {
  time: string[];
  weather_code: number[];
  temperature_2m_max: (number | null)[];
  temperature_2m_min: (number | null)[];
  precipitation_probability_max: (number | null)[];
};

type HourlyForecast = {
  time: string[]; // 'YYYY-MM-DDTHH:mm'（timezone=Asia/Tokyo の現地時刻）
  weather_code: number[];
  temperature_2m: (number | null)[];
  precipitation_probability: (number | null)[];
};

const FORECAST_DAYS = Number(Deno.env.get('WEATHER_FORECAST_DAYS') ?? '14');
const API_KEY = Deno.env.get('OPEN_METEO_API_KEY');

function buildUrl(lat: number, lon: number): string {
  const base = API_KEY
    ? 'https://customer-api.open-meteo.com/v1/forecast'
    : 'https://api.open-meteo.com/v1/forecast';
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    hourly: 'weather_code,temperature_2m,precipitation_probability',
    timezone: 'Asia/Tokyo',
    forecast_days: String(FORECAST_DAYS),
  });
  if (API_KEY) params.set('apikey', API_KEY);
  return `${base}?${params}`;
}

/**
 * cron 以外から叩かれないよう、service_role での呼び出しだけ許可する。
 * - 環境変数の鍵と完全一致（旧形式・新形式どちらの鍵でも）
 * - または、関数の「Verify JWT」がオンの前提で（署名は Supabase の入口で検証済み）、
 *   JWT の role が service_role
 * プロジェクトによって環境変数の鍵が新形式（sb_secret_...）になっていて、
 * ダッシュボードの Legacy service_role キー（eyJ...）と一致しないことがあるため。
 */
function isServiceRole(req: Request): boolean {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return false;
  const keys = [Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'), Deno.env.get('SUPABASE_SECRET_KEY')].filter(Boolean);
  if (keys.includes(token)) return true;
  const part = token.split('.')[1];
  if (!part) return false;
  try {
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4)));
    return payload.role === 'service_role';
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (!isServiceRole(req)) {
    return new Response('unauthorized: service_role キーで呼び出してください', { status: 401 });
  }
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey);

  const { data: families, error } = await supabase
    .from('families')
    .select('id, latitude, longitude')
    .not('latitude', 'is', null)
    .not('longitude', 'is', null);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  // 同じ地点（小数2桁≒1km）の家族はまとめて1回だけ取得
  const byPoint = new Map<string, { lat: number; lon: number; familyIds: string[] }>();
  for (const f of families ?? []) {
    const lat = Math.round(f.latitude * 100) / 100;
    const lon = Math.round(f.longitude * 100) / 100;
    const key = `${lat},${lon}`;
    const entry = byPoint.get(key) ?? { lat, lon, familyIds: [] };
    entry.familyIds.push(f.id);
    byPoint.set(key, entry);
  }

  const results: { point: string; rows?: number; error?: string }[] = [];
  for (const [key, { lat, lon, familyIds }] of byPoint) {
    try {
      const res = await fetch(buildUrl(lat, lon));
      if (!res.ok) throw new Error(`open-meteo ${res.status}`);
      const { daily, hourly } = (await res.json()) as { daily: DailyForecast; hourly: HourlyForecast };

      const fetchedAt = new Date().toISOString();
      const rows = familyIds.flatMap((familyId) =>
        daily.time.map((date, i) => ({
          family_id: familyId,
          date,
          weather_code: daily.weather_code[i],
          temp_max: daily.temperature_2m_max[i],
          temp_min: daily.temperature_2m_min[i],
          precip_prob: daily.precipitation_probability_max[i],
          fetched_at: fetchedAt,
        })),
      );

      const { error: upsertError } = await supabase
        .from('weather_daily')
        .upsert(rows, { onConflict: 'family_id,date' });
      if (upsertError) throw upsertError;

      const hourlyRows = familyIds.flatMap((familyId) =>
        hourly.time.map((time, i) => ({
          family_id: familyId,
          date: time.slice(0, 10),
          hour: Number(time.slice(11, 13)),
          weather_code: hourly.weather_code[i],
          temp: hourly.temperature_2m[i],
          precip_prob: hourly.precipitation_probability[i],
          fetched_at: fetchedAt,
        })),
      );
      const { error: hourlyError } = await supabase
        .from('weather_hourly')
        .upsert(hourlyRows, { onConflict: 'family_id,date,hour' });
      if (hourlyError) throw hourlyError;
      results.push({ point: key, rows: rows.length + hourlyRows.length });
    } catch (e) {
      results.push({ point: key, error: e instanceof Error ? e.message : String(e) });
    }
  }

  return Response.json({ points: results.length, results });
});
