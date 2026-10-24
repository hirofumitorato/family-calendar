import type {
  Calendar,
  CalendarEvent,
  DayColor,
  DaySticker,
  EventTemplate,
  Family,
  FamilyMember,
  Genre,
  NewCalendarEvent,
  NewEventTemplate,
  Person,
  PersonInput,
  WeatherDaily,
  WeatherHourly,
} from '@/lib/types';

/** ログイン中ユーザーと、所属する家族の情報 */
export type FamilyContext = {
  userId: string;
  family: Family;
  members: FamilyMember[];
  /** 「誰の予定？」に出る人（並び順どおり） */
  people: Person[];
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
  /** まとめて追加（開運カレンダーなど） */
  createEvents(events: NewCalendarEvent[]): Promise<void>;
  /** source が一致し、from 以降に始まる予定をまとめて削除。削除件数を返す */
  deleteEventsBySource(calendarIds: string[], source: string, from: Date): Promise<number>;

  /** fromKey〜toKey（両端含む, 'YYYY-MM-DD'） */
  listStickers(calendarIds: string[], fromKey: string, toKey: string): Promise<DaySticker[]>;
  addSticker(calendarId: string, date: string, sticker: string): Promise<void>;
  removeSticker(id: string): Promise<void>;

  /** 日付セルの背景色。fromKey〜toKey（両端含む） */
  listDayColors(calendarIds: string[], fromKey: string, toKey: string): Promise<DayColor[]>;
  /** color = null で解除 */
  setDayColor(calendarId: string, date: string, color: string | null): Promise<void>;

  /** 予定テンプレート（家族で共有） */
  listTemplates(familyId: string): Promise<EventTemplate[]>;
  createTemplate(template: NewEventTemplate): Promise<EventTemplate>;
  updateTemplate(id: string, patch: Partial<NewEventTemplate>): Promise<void>;
  deleteTemplate(id: string): Promise<void>;

  /** テンプレートのジャンル。名前を変えるとテンプレートのジャンルも変わり、削除するとテンプレートは未分類になる */
  listGenres(familyId: string): Promise<Genre[]>;
  createGenre(familyId: string, name: string): Promise<Genre>;
  renameGenre(genre: Genre, name: string): Promise<void>;
  deleteGenre(genre: Genre): Promise<void>;

  /** 「誰の予定？」の人（「みんな」などのグループも含む）。削除するとその人の予定・テンプレートは未指定になる */
  createPerson(familyId: string, input: PersonInput): Promise<Person>;
  updatePerson(id: string, input: PersonInput): Promise<void>;
  deletePerson(id: string): Promise<void>;

  listWeather(familyId: string, fromKey: string, toKey: string): Promise<WeatherDaily[]>;
  /** その日の時間ごとの天気（0〜23時）。予報がない日は空 */
  listHourlyWeather(familyId: string, dateKey: string): Promise<WeatherHourly[]>;

  /** 予定・スタンプが他の端末で変更されたときに呼ばれる。戻り値で購読解除 */
  subscribe(onChange: () => void): () => void;

  signOut(): Promise<void>;
}
