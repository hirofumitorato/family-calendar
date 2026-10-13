import type { CalendarRepository, FamilyContext } from '@/data/repository';
import { addDays, startOfDay, toDateKey } from '@/lib/date';
import type { CalendarEvent, DayColor, DaySticker, NewCalendarEvent, WeatherDaily } from '@/lib/types';

// Supabase 未設定でも画面を確認できるよう、端末メモリ上で動くデモ実装。
// アプリを再起動するとデータは初期状態に戻る。

const ME = 'demo-me';
const FAMILY_ID = 'demo-family';
const FAMILY_CAL = 'demo-cal-family';
const MY_CAL = 'demo-cal-me';

function at(base: Date, dayOffset: number, h: number, m = 0): Date {
  const d = addDays(startOfDay(base), dayOffset);
  d.setHours(h, m, 0, 0);
  return d;
}

function seedEvents(): CalendarEvent[] {
  const today = new Date();
  const ev = (
    id: string,
    calendar_id: string,
    title: string,
    start: Date,
    end: Date,
    extra: Partial<CalendarEvent> = {},
  ): CalendarEvent => ({
    id,
    calendar_id,
    title,
    memo: null,
    location: null,
    starts_at: start.toISOString(),
    ends_at: end.toISOString(),
    all_day: false,
    rrule: null,
    exdates: [],
    icon: null,
    remind_minutes_before: [],
    ...extra,
  });

  return [
    ev('e1', FAMILY_CAL, 'おばあちゃんの誕生日', at(today, 3, 0), at(today, 3, 23, 59), {
      all_day: true,
      icon: '🎂',
      rrule: 'FREQ=YEARLY',
    }),
    ev('e2', FAMILY_CAL, '燃えるゴミ', at(today, 0, 8), at(today, 0, 8, 30), {
      icon: '🗑️',
      rrule: 'FREQ=WEEKLY;BYDAY=MO,TH',
    }),
    ev('e3', FAMILY_CAL, '家族で温泉', at(today, 9, 10), at(today, 10, 17), { icon: '♨️' }),
    ev('e4', MY_CAL, '歯医者', at(today, 1, 15), at(today, 1, 16), {
      icon: '🦷',
      remind_minutes_before: [60],
    }),
    ev('e5', MY_CAL, '打ち合わせ', at(today, 2, 13), at(today, 2, 14), { icon: '💼' }),
    ev('e6', MY_CAL, 'ジム', at(today, -1, 19), at(today, -1, 20), {
      icon: '🏃',
      rrule: 'FREQ=WEEKLY;BYDAY=WE,SA',
    }),
  ];
}

export function createDemoRepository(): CalendarRepository {
  let events = seedEvents();
  let stickers: DaySticker[] = [
    { id: 's1', calendar_id: MY_CAL, date: toDateKey(new Date()), sticker: '😊' },
    { id: 's2', calendar_id: FAMILY_CAL, date: toDateKey(addDays(new Date(), 5)), sticker: '⭐' },
  ];
  let dayColors: DayColor[] = [];
  let seq = 100;
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((l) => l());

  const context: FamilyContext = {
    userId: ME,
    family: {
      id: FAMILY_ID,
      name: 'デモ家族',
      invite_code: 'DEMO1234',
      latitude: 35.68,
      longitude: 139.77,
      location_name: '東京',
    },
    members: [
      { family_id: FAMILY_ID, user_id: ME, display_name: 'わたし', color: '#3B82F6', role: 'owner' },
      { family_id: FAMILY_ID, user_id: 'demo-2', display_name: 'パートナー', color: '#EC4899', role: 'member' },
    ],
    calendars: [
      { id: FAMILY_CAL, family_id: FAMILY_ID, owner_id: null, name: '家族', color: '#F97316', visibility: 'family' },
      { id: MY_CAL, family_id: FAMILY_ID, owner_id: ME, name: 'わたし', color: '#3B82F6', visibility: 'personal' },
    ],
  };

  return {
    mode: 'demo',

    async getContext() {
      return context;
    },
    async createFamily() {},
    async joinFamily() {},
    async updateFamilyLocation(_id, loc) {
      context.family = { ...context.family, latitude: loc.latitude, longitude: loc.longitude, location_name: loc.name };
    },

    async listEvents(calendarIds, from, to) {
      return events.filter(
        (e) =>
          calendarIds.includes(e.calendar_id) &&
          (e.rrule !== null || (new Date(e.starts_at) < to && new Date(e.ends_at) >= from)),
      );
    },
    async getEvent(id) {
      return events.find((e) => e.id === id) ?? null;
    },
    async createEvent(input: NewCalendarEvent) {
      const created = { ...input, id: `e${seq++}` };
      events = [...events, created];
      notify();
      return created;
    },
    async updateEvent(id, patch) {
      events = events.map((e) => (e.id === id ? { ...e, ...patch } : e));
      notify();
    },
    async deleteEvent(id) {
      events = events.filter((e) => e.id !== id);
      notify();
    },

    async listStickers(calendarIds, fromKey, toKey) {
      return stickers.filter(
        (s) => calendarIds.includes(s.calendar_id) && s.date >= fromKey && s.date <= toKey,
      );
    },
    async addSticker(calendarId, date, sticker) {
      if (stickers.some((s) => s.calendar_id === calendarId && s.date === date && s.sticker === sticker)) return;
      stickers = [...stickers, { id: `s${seq++}`, calendar_id: calendarId, date, sticker }];
      notify();
    },
    async removeSticker(id) {
      stickers = stickers.filter((s) => s.id !== id);
      notify();
    },

    async listDayColors(calendarIds, fromKey, toKey) {
      return dayColors.filter(
        (c) => calendarIds.includes(c.calendar_id) && c.date >= fromKey && c.date <= toKey,
      );
    },
    async setDayColor(calendarId, date, color) {
      dayColors = dayColors.filter((c) => !(c.calendar_id === calendarId && c.date === date));
      if (color) dayColors = [...dayColors, { calendar_id: calendarId, date, color }];
      notify();
    },

    async listWeather(_familyId, fromKey, toKey) {
      // 今日から14日分、それらしい天気を生成
      const codes = [0, 1, 2, 3, 61, 3, 1, 0, 80, 2, 63, 3, 1, 0];
      const today = startOfDay(new Date());
      const rows: WeatherDaily[] = codes.map((code, i) => ({
        date: toDateKey(addDays(today, i)),
        weather_code: code,
        temp_max: 22 - (i % 4),
        temp_min: 14 - (i % 3),
        precip_prob: code >= 61 ? 70 : 10,
      }));
      return rows.filter((w) => w.date >= fromKey && w.date <= toKey);
    },

    subscribe(onChange) {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },

    async signOut() {},
  };
}
