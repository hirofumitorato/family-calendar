import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { createDemoRepository } from '@/data/demo-repository';
import type { CalendarRepository, FamilyContext } from '@/data/repository';
import { createSupabaseRepository } from '@/data/supabase-repository';
import { addDays, monthGridRange, toDateKey } from '@/lib/date';
import { expandOccurrences } from '@/lib/recurrence';
import { supabase } from '@/lib/supabase';
import type {
  Calendar,
  DaySticker,
  EventOccurrence,
  WeatherDaily,
} from '@/lib/types';

type Status = 'loading' | 'signed-out' | 'no-family' | 'ready' | 'error';

type AppState = {
  repo: CalendarRepository;
  status: Status;
  error: string | null;
  ctx: FamilyContext | null;
  /** 表示するカレンダー（家族カレンダー＋自分の個人カレンダーすべて） */
  visibleCalendars: Calendar[];
  /** 予定・スタンプ・セル色の既定の保存先（家族カレンダー） */
  defaultCalendar: Calendar | null;
  reload: () => Promise<void>;
  /** 予定・スタンプが変わったときに増える。データ再取得のトリガー */
  revision: number;
  bumpRevision: () => void;
};

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const repo = useMemo(
    () => (supabase ? createSupabaseRepository(supabase) : createDemoRepository()),
    [],
  );
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);
  const [ctx, setCtx] = useState<FamilyContext | null>(null);
  const [revision, setRevision] = useState(0);
  const bumpRevision = useCallback(() => setRevision((r) => r + 1), []);

  const reload = useCallback(async () => {
    try {
      const result = await repo.getContext();
      if (typeof result === 'string') {
        setCtx(null);
        setStatus(result);
      } else {
        setCtx(result);
        setStatus('ready');
      }
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus('error');
    }
  }, [repo]);

  useEffect(() => {
    reload();
    const sub = supabase?.auth.onAuthStateChange(() => reload());
    return () => sub?.data.subscription.unsubscribe();
  }, [reload]);

  useEffect(() => {
    if (status !== 'ready') return;
    return repo.subscribe(bumpRevision);
  }, [repo, status, bumpRevision]);

  const visibleCalendars = useMemo(() => ctx?.calendars ?? [], [ctx]);

  const defaultCalendar = useMemo(() => {
    const all = ctx?.calendars ?? [];
    return all.find((c) => c.visibility === 'family') ?? all[0] ?? null;
  }, [ctx]);

  const value: AppState = {
    repo,
    status,
    error,
    ctx,
    visibleCalendars,
    defaultCalendar,
    reload,
    revision,
    bumpRevision,
  };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const v = useContext(AppContext);
  if (!v) throw new Error('useApp must be used within AppProvider');
  return v;
}

export type MonthData = {
  occurrencesByDay: Map<string, EventOccurrence[]>;
  stickersByDay: Map<string, DaySticker[]>;
  /** 日付セルの背景色 */
  colorByDay: Map<string, string>;
  weatherByDay: Map<string, WeatherDaily>;
  loading: boolean;
};

/** 月表示（6週分）に必要な予定・スタンプ・天気をまとめて取得 */
export function useMonthData(year: number, month: number): MonthData {
  const { repo, ctx, visibleCalendars, revision } = useApp();
  const [data, setData] = useState<Omit<MonthData, 'loading'>>({
    occurrencesByDay: new Map(),
    stickersByDay: new Map(),
    colorByDay: new Map(),
    weatherByDay: new Map(),
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ctx) return;
    let cancelled = false;
    const { from, to } = monthGridRange(year, month);
    const fromKey = toDateKey(from);
    const toKey = toDateKey(addDays(to, -1));
    const calendarIds = visibleCalendars.map((c) => c.id);
    const calendarById = new Map(visibleCalendars.map((c) => [c.id, c]));
    const memberById = new Map(ctx.people.map((p) => [p.id, p]));

    setLoading(true);
    Promise.all([
      repo.listEvents(calendarIds, from, to),
      repo.listStickers(calendarIds, fromKey, toKey),
      repo.listWeather(ctx.family.id, fromKey, toKey),
      repo.listDayColors(calendarIds, fromKey, toKey),
    ])
      .then(([events, stickers, weather, dayColors]) => {
        if (cancelled) return;

        const occurrencesByDay = new Map<string, EventOccurrence[]>();
        for (const event of events) {
          const calendar = calendarById.get(event.calendar_id);
          if (!calendar) continue;
          const occs = expandOccurrences(
            new Date(event.starts_at),
            new Date(event.ends_at),
            event.rrule,
            from,
            to,
            event.exdates ?? [],
          );
          for (const { start, end } of occs) {
            // 複数日にまたがる予定は各日に表示
            for (let d = new Date(start); d <= end && d < to; d = addDays(d, 1)) {
              if (d < from) continue;
              const k = toDateKey(d);
              const list = occurrencesByDay.get(k) ?? [];
              const member = event.member_id ? memberById.get(event.member_id) ?? null : null;
              list.push({
                key: `${event.id}@${start.toISOString()}`,
                event,
                calendar,
                member,
                color: member?.color ?? calendar.color,
                start,
                end,
              });
              occurrencesByDay.set(k, list);
            }
          }
        }
        for (const list of occurrencesByDay.values()) {
          list.sort(
            (a, b) =>
              Number(b.event.all_day) - Number(a.event.all_day) ||
              a.start.getTime() - b.start.getTime(),
          );
        }

        const stickersByDay = new Map<string, DaySticker[]>();
        for (const s of stickers) {
          stickersByDay.set(s.date, [...(stickersByDay.get(s.date) ?? []), s]);
        }

        const weatherByDay = new Map(weather.map((w) => [w.date, w]));
        // 家族カレンダーの色を優先（個人カレンダーの色は上書きしない）
        const colorByDay = new Map<string, string>();
        for (const c of dayColors) {
          const isFamily = calendarById.get(c.calendar_id)?.visibility === 'family';
          if (isFamily || !colorByDay.has(c.date)) colorByDay.set(c.date, c.color);
        }
        setData({ occurrencesByDay, stickersByDay, colorByDay, weatherByDay });
      })
      .catch((e) => console.warn('failed to load month data', e))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [repo, ctx, visibleCalendars, year, month, revision]);

  return { ...data, loading };
}
