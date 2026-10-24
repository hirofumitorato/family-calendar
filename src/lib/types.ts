// DB（supabase/migrations）と1対1で対応する型

export type Visibility = 'personal' | 'family';

export type Family = {
  id: string;
  name: string;
  invite_code: string;
  latitude: number | null;
  longitude: number | null;
  location_name: string | null;
};

export type FamilyMember = {
  family_id: string;
  user_id: string;
  display_name: string;
  color: string;
  role: 'owner' | 'member';
};

export type Calendar = {
  id: string;
  family_id: string;
  owner_id: string | null;
  name: string;
  color: string;
  visibility: Visibility;
};

export type CalendarEvent = {
  id: string;
  calendar_id: string;
  title: string;
  memo: string | null;
  location: string | null;
  starts_at: string; // ISO8601
  ends_at: string;
  all_day: boolean;
  rrule: string | null;
  /** 繰り返しのうち削除した回の日付（'YYYY-MM-DD'） */
  exdates: string[];
  icon: string | null;
  remind_minutes_before: number[];
  /** 誰の予定か（family_people.id。複数可。「みんな」も1項目）。空 = 未指定 */
  member_ids: string[];
  /** 自動で作った予定の出どころ（'kaiun' = 開運カレンダー）。手で作った予定は null/未指定 */
  source?: string | null;
  /** 予定の色。null/未指定なら「誰の予定か」の色 */
  color?: string | null;
};

export type NewCalendarEvent = Omit<CalendarEvent, 'id'>;

export type DaySticker = {
  id: string;
  calendar_id: string;
  date: string; // YYYY-MM-DD
  sticker: string;
};

export type DayColor = {
  calendar_id: string;
  date: string; // YYYY-MM-DD
  color: string;
};

export type WeatherDaily = {
  date: string; // YYYY-MM-DD
  weather_code: number;
  temp_max: number | null;
  temp_min: number | null;
  precip_prob: number | null;
};

export type WeatherHourly = {
  date: string; // YYYY-MM-DD
  hour: number; // 0〜23
  weather_code: number;
  temp: number | null;
  precip_prob: number | null;
};

/** 繰り返しを展開した後の、画面に出す1件 */
export type EventOccurrence = {
  key: string; // event.id + 開始時刻
  event: CalendarEvent;
  calendar: Calendar;
  /** 誰の予定か（選んだ順。未指定なら空） */
  members: Person[];
  /** 表示色：予定の色 → 誰の予定かの色 → カレンダーの色 の順 */
  color: string;
  start: Date;
  end: Date;
};

/** 繰り返し予定の削除範囲 */
export type DeleteScope = 'this' | 'following' | 'all';

/** 予定テンプレート：繰り返し発生する「誰の・どんな予定か」 */
export type EventTemplate = {
  id: string;
  family_id: string;
  /** ジャンル（例：習い事、家事）。null = 未分類 */
  category: string | null;
  title: string;
  icon: string | null;
  member_ids: string[];
  calendar_id: string | null;
  all_day: boolean;
  start_time: string | null; // 'HH:mm'
  end_time: string | null;
  rrule: string | null;
  remind_minutes_before: number[];
  location: string | null;
  memo: string | null;
  color?: string | null;
};

export type NewEventTemplate = Omit<EventTemplate, 'id'>;

/** 「誰の予定？」に出る家族の人（アカウントがなくてもよい） */
export type Person = {
  id: string;
  family_id: string;
  name: string;
  color: string;
  /** アプリのアカウントがある人なら auth.users.id */
  user_id: string | null;
  sort_order: number;
};

export type PersonInput = { name: string; color: string };

/** テンプレートのジャンル */
export type Genre = {
  id: string;
  family_id: string;
  name: string;
  sort_order: number;
};
