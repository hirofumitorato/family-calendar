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

/** 繰り返しを展開した後の、画面に出す1件 */
export type EventOccurrence = {
  key: string; // event.id + 開始時刻
  event: CalendarEvent;
  calendar: Calendar;
  start: Date;
  end: Date;
};

/** 繰り返し予定の削除範囲 */
export type DeleteScope = 'this' | 'following' | 'all';
