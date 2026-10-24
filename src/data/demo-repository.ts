import type { CalendarRepository, FamilyContext } from '@/data/repository';
import { addDays, startOfDay, toDateKey } from '@/lib/date';
import { demoHourlyFromDaily } from '@/lib/weather';
import type {
  CalendarEvent,
  DayColor,
  DaySticker,
  EventTemplate,
  Genre,
  NewCalendarEvent,
  Person,
  WeatherDaily,
  WeatherHourly,
} from '@/lib/types';

// Supabase 未設定でも画面を確認できるよう、端末メモリ上で動くデモ実装。
// アプリを再起動するとデータは初期状態に戻る。

const ME = 'demo-me';
const FAMILY_ID = 'demo-family';
const FAMILY_CAL = 'demo-cal-family';
const MY_CAL = 'demo-cal-me';
const PARTNER = 'demo-2';
const KID = 'demo-3';
const ALL = 'demo-all';

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
    member_ids: [ALL],
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
    ev('e3', FAMILY_CAL, '家族で温泉', at(today, 9, 10), at(today, 10, 17), {
      icon: '♨️',
      member_ids: [ME, PARTNER, KID],
    }),
    ev('e4', MY_CAL, '歯医者', at(today, 1, 15), at(today, 1, 16), {
      member_ids: [ME],
      icon: '🦷',
      remind_minutes_before: [60],
    }),
    ev('e5', MY_CAL, '打ち合わせ', at(today, 2, 13), at(today, 2, 14), { icon: '💼', member_ids: [ME] }),
    ev('e7', FAMILY_CAL, 'ピアノ', at(today, 1, 17), at(today, 1, 18), {
      icon: '🎹',
      member_ids: [KID],
      rrule: 'FREQ=WEEKLY;BYDAY=' + ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'][addDays(today, 1).getDay()],
    }),
    ev('e8', FAMILY_CAL, 'ヨガ', at(today, 4, 10), at(today, 4, 11), { icon: '🧘', member_ids: [PARTNER] }),
    ev('e6', MY_CAL, 'ジム', at(today, -1, 19), at(today, -1, 20), {
      member_ids: [ME],
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
  const tpl = (
    id: string,
    category: string | null,
    title: string,
    icon: string,
    member_ids: string[],
    start_time: string | null,
    end_time: string | null,
    rrule: string | null,
    extra: Partial<EventTemplate> = {},
  ): EventTemplate => ({
    id,
    family_id: FAMILY_ID,
    category,
    title,
    icon,
    member_ids,
    calendar_id: FAMILY_CAL,
    all_day: start_time === null,
    start_time,
    end_time,
    rrule,
    remind_minutes_before: [],
    location: null,
    memo: null,
    ...extra,
  });
  let templates: EventTemplate[] = [
    tpl('t1', '家事', '燃えるゴミ', '🗑️', [ALL], '08:00', '08:30', 'FREQ=WEEKLY;BYDAY=MO,TH'),
    tpl('t2', '家事', '資源ゴミ', '♻️', [ALL], '08:00', '08:30', 'FREQ=WEEKLY;BYDAY=WE'),
    tpl('t3', '習い事', 'スイミング', '🏊', [KID], '16:00', '17:00', 'FREQ=WEEKLY;BYDAY=WE', {
      remind_minutes_before: [60],
      location: '市民プール',
    }),
    tpl('t4', '習い事', 'ピアノ', '🎹', [KID], '17:00', '18:00', 'FREQ=WEEKLY;BYDAY=TU'),
    tpl('t5', '病院', '歯医者', '🦷', [ME], '15:00', '16:00', null, { remind_minutes_before: [60] }),
    tpl('t6', '仕事', '在宅勤務', '💻', [PARTNER], null, null, 'FREQ=WEEKLY;BYDAY=FR'),
  ];
  let genres: Genre[] = ['家事', '習い事', '病院', '仕事'].map((name, i) => ({
    id: `g${i + 1}`,
    family_id: FAMILY_ID,
    name,
    sort_order: i,
  }));
  let people: Person[] = [
    { id: ALL, family_id: FAMILY_ID, name: 'みんな', color: '#9E9E9E', user_id: null, sort_order: -1 },
    { id: ME, family_id: FAMILY_ID, name: 'わたし', color: '#3B82F6', user_id: ME, sort_order: 0 },
    { id: PARTNER, family_id: FAMILY_ID, name: 'パートナー', color: '#EC4899', user_id: PARTNER, sort_order: 1 },
    { id: KID, family_id: FAMILY_ID, name: 'こども', color: '#10B981', user_id: null, sort_order: 2 },
  ];
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
      { family_id: FAMILY_ID, user_id: PARTNER, display_name: 'パートナー', color: '#EC4899', role: 'member' },
      { family_id: FAMILY_ID, user_id: KID, display_name: 'こども', color: '#10B981', role: 'member' },
    ],
    people: [],
    calendars: [
      { id: FAMILY_CAL, family_id: FAMILY_ID, owner_id: null, name: '家族', color: '#F97316', visibility: 'family' },
      { id: MY_CAL, family_id: FAMILY_ID, owner_id: ME, name: 'わたし', color: '#3B82F6', visibility: 'personal' },
    ],
  };

  return {
    mode: 'demo',

    async getContext() {
      // 毎回新しいオブジェクトを返す（画面側で変更を検知できるように）
      return { ...context, people: [...people].sort((a, b) => a.sort_order - b.sort_order) };
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
    async createEvents(inputs) {
      events = [...events, ...inputs.map((e) => ({ ...e, id: `e${seq++}` }))];
      notify();
    },
    async deleteEventsBySource(calendarIds, source, from) {
      const before = events.length;
      events = events.filter(
        (e) => !(calendarIds.includes(e.calendar_id) && e.source === source && new Date(e.starts_at) >= from),
      );
      notify();
      return before - events.length;
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

    async listTemplates() {
      return templates;
    },
    async createTemplate(input) {
      const created = { ...input, id: `t${seq++}` };
      templates = [...templates, created];
      return created;
    },
    async updateTemplate(id, patch) {
      templates = templates.map((t) => (t.id === id ? { ...t, ...patch } : t));
    },
    async deleteTemplate(id) {
      templates = templates.filter((t) => t.id !== id);
    },

    async listGenres() {
      return [...genres].sort((a, b) => a.sort_order - b.sort_order);
    },
    async createGenre(familyId, name) {
      const created: Genre = {
        id: `g${seq++}`,
        family_id: familyId,
        name,
        sort_order: Math.max(-1, ...genres.map((g) => g.sort_order)) + 1,
      };
      genres = [...genres, created];
      return created;
    },
    async renameGenre(genre, name) {
      genres = genres.map((g) => (g.id === genre.id ? { ...g, name } : g));
      templates = templates.map((t) => (t.category === genre.name ? { ...t, category: name } : t));
    },
    async deleteGenre(genre) {
      genres = genres.filter((g) => g.id !== genre.id);
      templates = templates.map((t) => (t.category === genre.name ? { ...t, category: null } : t));
    },

    async createPerson(familyId, input) {
      const created: Person = {
        id: `p${seq++}`,
        family_id: familyId,
        name: input.name,
        color: input.color,
        user_id: null,
        sort_order: Math.max(-1, ...people.map((p) => p.sort_order)) + 1,
      };
      people = [...people, created];
      return created;
    },
    async updatePerson(id, input) {
      people = people.map((p) => (p.id === id ? { ...p, ...input } : p));
      notify();
    },
    async deletePerson(id) {
      people = people.filter((p) => p.id !== id);
      // DB の on delete set null と同じ動き
      events = events.map((e) => ({ ...e, member_ids: e.member_ids.filter((x) => x !== id) }));
      templates = templates.map((t) => ({ ...t, member_ids: t.member_ids.filter((x) => x !== id) }));
      notify();
    },

    async listWeather(_familyId, fromKey, toKey) {
      return demoDailyWeather().filter((w) => w.date >= fromKey && w.date <= toKey);
    },

    async listHourlyWeather(_familyId, dateKey) {
      const daily = demoDailyWeather().find((w) => w.date === dateKey);
      return daily ? (demoHourlyFromDaily(daily) as WeatherHourly[]) : [];
    },

    subscribe(onChange) {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },

    async signOut() {},
  };
}

/** デモ：今日から14日分、それらしい天気を生成 */
function demoDailyWeather(): WeatherDaily[] {
  const codes = [0, 1, 2, 3, 61, 3, 1, 0, 80, 2, 63, 3, 1, 0];
  const today = startOfDay(new Date());
  return codes.map((code, i) => ({
    date: toDateKey(addDays(today, i)),
    weather_code: code,
    temp_max: 22 - (i % 4),
    temp_min: 14 - (i % 3),
    precip_prob: code >= 61 ? 70 : 10,
  }));
}
