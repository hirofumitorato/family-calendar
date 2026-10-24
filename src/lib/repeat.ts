// 予定フォームの「繰り返し」と RRULE 文字列の相互変換

export type RepeatFreq = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export type RepeatSpec = {
  freq: RepeatFreq | null;
  /** 毎週の曜日（0 = 日曜）。空なら開始日の曜日 */
  byDay: number[];
};

const DAY_CODES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
const FREQS: RepeatFreq[] = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'];

function parts(rrule: string): Map<string, string> {
  return new Map(
    rrule
      .replace(/^RRULE:/, '')
      .split(';')
      .filter(Boolean)
      .map((p) => p.split('=') as [string, string]),
  );
}

export function parseRepeat(rrule: string | null | undefined): RepeatSpec {
  if (!rrule) return { freq: null, byDay: [] };
  const p = parts(rrule);
  const freq = p.get('FREQ') as RepeatFreq | undefined;
  if (!freq || !FREQS.includes(freq)) return { freq: null, byDay: [] };
  const byDay = (p.get('BYDAY') ?? '')
    .split(',')
    .map((c) => DAY_CODES.indexOf(c.slice(-2)))
    .filter((i) => i >= 0)
    .sort((a, b) => a - b);
  return { freq, byDay: freq === 'WEEKLY' ? byDay : [] };
}

/**
 * RepeatSpec → RRULE。
 * keepFrom（編集前の RRULE）の UNTIL / COUNT / INTERVAL は、頻度が同じなら引き継ぐ
 * （「以降の予定を削除」で付いた UNTIL を編集で消さないため）。
 */
export function buildRepeat(spec: RepeatSpec, keepFrom?: string | null): string | null {
  if (!spec.freq) return null;
  const out = [`FREQ=${spec.freq}`];
  if (spec.freq === 'WEEKLY' && spec.byDay.length) {
    const days = [...new Set(spec.byDay)].sort((a, b) => a - b).map((d) => DAY_CODES[d]);
    out.push(`BYDAY=${days.join(',')}`);
  }
  if (keepFrom) {
    const old = parts(keepFrom);
    if (old.get('FREQ') === spec.freq) {
      for (const k of ['INTERVAL', 'COUNT', 'UNTIL']) {
        const v = old.get(k);
        if (v) out.push(`${k}=${v}`);
      }
    }
  }
  return out.join(';');
}

const WEEKDAY_SHORT = ['日', '月', '火', '水', '木', '金', '土'];

/** 例: '毎週 月・木' '毎月' */
export function describeRepeat(rrule: string | null | undefined): string {
  const { freq, byDay } = parseRepeat(rrule);
  if (!freq) return '';
  if (freq === 'WEEKLY') {
    return byDay.length ? `毎週 ${byDay.map((d) => WEEKDAY_SHORT[d]).join('・')}` : '毎週';
  }
  return { DAILY: '毎日', MONTHLY: '毎月', YEARLY: '毎年' }[freq];
}
