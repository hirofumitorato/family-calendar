// WMO weather code（Open-Meteo の weather_code）→ カレンダー表示用アイコン
// https://open-meteo.com/en/docs の "WMO Weather interpretation codes" に準拠

export type WeatherIcon = { emoji: string; label: string };

export function weatherCodeToIcon(code: number): WeatherIcon {
  if (code === 0) return { emoji: '☀️', label: '快晴' };
  if (code === 1) return { emoji: '🌤️', label: '晴れ' };
  if (code === 2) return { emoji: '⛅', label: '晴れ時々曇り' };
  if (code === 3) return { emoji: '☁️', label: '曇り' };
  if (code === 45 || code === 48) return { emoji: '🌫️', label: '霧' };
  if (code >= 51 && code <= 57) return { emoji: '🌦️', label: '霧雨' };
  if (code >= 61 && code <= 67) return { emoji: '☔', label: '雨' };
  if (code >= 71 && code <= 77) return { emoji: '❄️', label: '雪' };
  if (code >= 80 && code <= 82) return { emoji: '🌧️', label: 'にわか雨' };
  if (code === 85 || code === 86) return { emoji: '🌨️', label: 'にわか雪' };
  if (code >= 95 && code <= 99) return { emoji: '⛈️', label: '雷雨' };
  return { emoji: '❔', label: '不明' };
}

/** 時間ごとの表示用。晴れ・快晴の夜（18時〜5時）は月にする */
export function hourlyIcon(code: number, hour: number): WeatherIcon {
  const icon = weatherCodeToIcon(code);
  const night = hour < 6 || hour >= 18;
  if (night && code === 0) return { emoji: '🌙', label: icon.label };
  if (night && code === 1) return { emoji: '🌙', label: icon.label };
  return icon;
}

/**
 * デモ用：日別の天気（最高・最低・降水確率）から、それらしい時間ごとの値を作る。
 * 最低気温は5時ごろ、最高気温は14時ごろ。
 */
export function demoHourlyFromDaily(daily: {
  date: string;
  weather_code: number;
  temp_max: number | null;
  temp_min: number | null;
  precip_prob: number | null;
}): { date: string; hour: number; weather_code: number; temp: number | null; precip_prob: number | null }[] {
  const max = daily.temp_max ?? 20;
  const min = daily.temp_min ?? max - 8;
  const rainy = daily.weather_code >= 51;
  return Array.from({ length: 24 }, (_, hour) => {
    // 5時=0、14時=1 になる山型（夜は下がっていく）
    const phase = hour < 5 ? (hour + 24 - 14) / 15 : hour <= 14 ? (14 - hour) / 9 : (hour - 14) / 15;
    const ratio = (Math.cos(Math.min(1, phase) * Math.PI) + 1) / 2;
    const temp = Math.round((min + (max - min) * ratio) * 10) / 10;
    const base = daily.precip_prob ?? 0;
    // 雨の日は昼過ぎ〜夕方に強め、それ以外は低め
    const wave = rainy ? Math.max(0, 1 - Math.abs(hour - 16) / 10) : 0.3 + ((hour * 7) % 5) / 10;
    const precip = Math.min(100, Math.round((base * wave) / 10) * 10);
    const code = rainy && precip < 30 ? 3 : daily.weather_code;
    return { date: daily.date, hour, weather_code: code, temp, precip_prob: precip };
  });
}
