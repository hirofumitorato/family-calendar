import type {
  Calendar,
  CalendarEvent,
  DaySticker,
  Family,
  FamilyMember,
  NewCalendarEvent,
  WeatherDaily,
} from '@/lib/types';

/** ログイン中ユーザーと、所属する家族の情報 */
export type FamilyContext = {
  userId: string;
  family: Family;
  members: FamilyMember[];
  /** RLSにより「家族カレンダー＋自分の個人カレンダー」だけが返る */
  calendars: Calendar[];
};

/**
 * データアクセスの窓口。画面はこのインターフェースだけに依存する。
 * 実装は demo（端末内サンプル）と supabase の2つ。
 */
export interface CalendarRepository {
  readonly mode: 'demo' | 'supabase';

  /** 未ログインなら 'signed-out'、家族未所属なら 'no-family' */
  getContext(): Promise<FamilyContext | 'signed-out' | 'no-family'>;

  createFamily(familyName: string, displayName: string): Promise<void>;
  joinFamily(inviteCode: string, displayName: string): Promise<void>;
  updateFamilyLocation(
    familyId: string,
    location: { latitude: number; longitude: number; name: string },
  ): Promise<void>;

  /** [from, to) と重なる予定。繰り返し予定は rrule 付きで返し、展開は呼び出し側で行う */
  listEvents(calendarIds: string[], from: Date, to: Date): Promise<CalendarEvent[]>;
  getEvent(id: string): Promise<CalendarEvent | null>;
  createEvent(event: NewCalendarEvent): Promise<CalendarEvent>;
  updateEvent(id: string, patch: Partial<NewCalendarEvent>): Promise<void>;
  deleteEvent(id: string): Promise<void>;

  /** fromKey〜toKey（両端含む, 'YYYY-MM-DD'） */
  listStickers(calendarIds: string[], fromKey: string, toKey: string): Promise<DaySticker[]>;
  addSticker(calendarId: string, date: string, sticker: string): Promise<void>;
  removeSticker(id: string): Promise<void>;

  listWeather(familyId: string, fromKey: string, toKey: string): Promise<WeatherDaily[]>;

  /** 予定・スタンプが他の端末で変更されたときに呼ばれる。戻り値で購読解除 */
  subscribe(onChange: () => void): () => void;

  signOut(): Promise<void>;
}
