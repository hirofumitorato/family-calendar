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
