import type { SupabaseClient } from '@supabase/supabase-js';

import type { CalendarRepository } from '@/data/repository';
import type {
  Calendar,
  CalendarEvent,
  DayColor,
  DaySticker,
  EventTemplate,
  Family,
  FamilyMember,
  Genre,
  Person,
  WeatherDaily,
  WeatherHourly,
} from '@/lib/types';

function check<T>(res: { data: unknown; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

export function createSupabaseRepository(sb: SupabaseClient): CalendarRepository {
  return {
    mode: 'supabase',

    async getContext() {
      const { data: auth } = await sb.auth.getUser();
      const user = auth.user;
      if (!user) return 'signed-out';

      // MVPでは1ユーザー1家族を前提にする
      const membership = check<{ family_id: string }[]>(
        await sb.from('family_members').select('family_id').eq('user_id', user.id).limit(1),
      );
      if (!membership?.length) return 'no-family';
      const familyId = membership[0].family_id as string;

      const [family, members, calendars, people] = await Promise.all([
        sb.from('families').select('*').eq('id', familyId).single().then((r) => check<Family>(r)),
        sb.from('family_members').select('*').eq('family_id', familyId).then((r) => check<FamilyMember[]>(r)),
        sb.from('calendars').select('*').eq('family_id', familyId).order('created_at').then((r) => check<Calendar[]>(r)),
        sb
          .from('family_people')
          .select('*')
          .eq('family_id', familyId)
          .order('sort_order')
          .order('created_at')
          .then((r) => check<Person[]>(r)),
      ]);
      return { userId: user.id, family, members, calendars, people };
    },

    async createFamily(familyName, displayName) {
      check(await sb.rpc('create_family', { family_name: familyName, display_name: displayName }));
    },
    async joinFamily(inviteCode, displayName) {
      check(await sb.rpc('join_family', { code: inviteCode, display_name: displayName }));
    },
    async updateFamilyLocation(familyId, loc) {
      check(
        await sb
          .from('families')
          .update({ latitude: loc.latitude, longitude: loc.longitude, location_name: loc.name })
          .eq('id', familyId),
      );
    },

    async listEvents(calendarIds, from, to) {
      if (!calendarIds.length) return [];
      // 単発予定は範囲で絞り、繰り返し予定は開始が範囲終了より前のものをすべて取得
      return check(
        await sb
          .from('events')
          .select('*')
          .in('calendar_id', calendarIds)
          .lt('starts_at', to.toISOString())
          .or(`ends_at.gte.${from.toISOString()},rrule.not.is.null`),
      ) as CalendarEvent[];
    },
    async getEvent(id) {
      return check(await sb.from('events').select('*').eq('id', id).maybeSingle()) as CalendarEvent | null;
    },
    async createEvent(event) {
      const { data: auth } = await sb.auth.getUser();
      return check(
        await sb
          .from('events')
          .insert({ ...event, created_by: auth.user?.id })
          .select('*')
          .single(),
      ) as CalendarEvent;
    },
    async updateEvent(id, patch) {
      check(await sb.from('events').update(patch).eq('id', id));
    },
    async deleteEvent(id) {
      check(await sb.from('events').delete().eq('id', id));
    },
    async createEvents(inputs) {
      if (!inputs.length) return;
      const { data: auth } = await sb.auth.getUser();
      // 一度に大量に送らないよう 200 件ずつ
      for (let i = 0; i < inputs.length; i += 200) {
        const chunk = inputs.slice(i, i + 200).map((e) => ({ ...e, created_by: auth.user?.id }));
        check(await sb.from('events').insert(chunk));
      }
    },
    async deleteEventsBySource(calendarIds, source, from) {
      if (!calendarIds.length) return 0;
      const deleted = check<{ id: string }[]>(
        await sb
          .from('events')
          .delete()
          .in('calendar_id', calendarIds)
          .eq('source', source)
          .gte('starts_at', from.toISOString())
          .select('id'),
      );
      return deleted.length;
    },

    async listStickers(calendarIds, fromKey, toKey) {
      if (!calendarIds.length) return [];
      return check(
        await sb
          .from('day_stickers')
          .select('id, calendar_id, date, sticker')
          .in('calendar_id', calendarIds)
          .gte('date', fromKey)
          .lte('date', toKey),
      ) as DaySticker[];
    },
    async addSticker(calendarId, date, sticker) {
      const { data: auth } = await sb.auth.getUser();
      check(
        await sb
          .from('day_stickers')
          .upsert(
            { calendar_id: calendarId, date, sticker, created_by: auth.user?.id },
            { onConflict: 'calendar_id,date,sticker', ignoreDuplicates: true },
          ),
      );
    },
    async removeSticker(id) {
      check(await sb.from('day_stickers').delete().eq('id', id));
    },

    async listDayColors(calendarIds, fromKey, toKey) {
      if (!calendarIds.length) return [];
      return check<DayColor[]>(
        await sb
          .from('day_colors')
          .select('calendar_id, date, color')
          .in('calendar_id', calendarIds)
          .gte('date', fromKey)
          .lte('date', toKey),
      );
    },
    async setDayColor(calendarId, date, color) {
      if (!color) {
        check(await sb.from('day_colors').delete().eq('calendar_id', calendarId).eq('date', date));
        return;
      }
      const { data: auth } = await sb.auth.getUser();
      check(
        await sb
          .from('day_colors')
          .upsert(
            { calendar_id: calendarId, date, color, updated_by: auth.user?.id, updated_at: new Date().toISOString() },
            { onConflict: 'calendar_id,date' },
          ),
      );
    },

    async listTemplates(familyId) {
      return check<EventTemplate[]>(
        await sb.from('event_templates').select('*').eq('family_id', familyId).order('created_at'),
      );
    },
    async createTemplate(template) {
      const { data: auth } = await sb.auth.getUser();
      return check<EventTemplate>(
        await sb
          .from('event_templates')
          .insert({ ...template, created_by: auth.user?.id })
          .select('*')
          .single(),
      );
    },
    async updateTemplate(id, patch) {
      check(await sb.from('event_templates').update(patch).eq('id', id));
    },
    async deleteTemplate(id) {
      check(await sb.from('event_templates').delete().eq('id', id));
    },

    async listGenres(familyId) {
      return check<Genre[]>(
        await sb.from('template_genres').select('*').eq('family_id', familyId).order('sort_order').order('created_at'),
      );
    },
    async createGenre(familyId, name) {
      const { data: last } = await sb
        .from('template_genres')
        .select('sort_order')
        .eq('family_id', familyId)
        .order('sort_order', { ascending: false })
        .limit(1);
      return check<Genre>(
        await sb
          .from('template_genres')
          .insert({ family_id: familyId, name, sort_order: (last?.[0]?.sort_order ?? -1) + 1 })
          .select('*')
          .single(),
      );
    },
    async renameGenre(genre, name) {
      check(await sb.from('template_genres').update({ name }).eq('id', genre.id));
      check(
        await sb
          .from('event_templates')
          .update({ category: name })
          .eq('family_id', genre.family_id)
          .eq('category', genre.name),
      );
    },
    async deleteGenre(genre) {
      check(await sb.from('template_genres').delete().eq('id', genre.id));
      check(
        await sb
          .from('event_templates')
          .update({ category: null })
          .eq('family_id', genre.family_id)
          .eq('category', genre.name),
      );
    },

    async createPerson(familyId, input) {
      const { data: last } = await sb
        .from('family_people')
        .select('sort_order')
        .eq('family_id', familyId)
        .order('sort_order', { ascending: false })
        .limit(1);
      const sort_order = (last?.[0]?.sort_order ?? -1) + 1;
      return check<Person>(
        await sb
          .from('family_people')
          .insert({ family_id: familyId, name: input.name, color: input.color, sort_order })
          .select('*')
          .single(),
      );
    },
    async updatePerson(id, input) {
      check(await sb.from('family_people').update({ name: input.name, color: input.color }).eq('id', id));
    },
    async deletePerson(id) {
      check(await sb.from('family_people').delete().eq('id', id));
    },

    async listWeather(familyId, fromKey, toKey) {
      return check(
        await sb
          .from('weather_daily')
          .select('date, weather_code, temp_max, temp_min, precip_prob')
          .eq('family_id', familyId)
          .gte('date', fromKey)
          .lte('date', toKey),
      ) as WeatherDaily[];
    },

    async listHourlyWeather(familyId, dateKey) {
      return check(
        await sb
          .from('weather_hourly')
          .select('date, hour, weather_code, temp, precip_prob')
          .eq('family_id', familyId)
          .eq('date', dateKey)
          .order('hour'),
      ) as WeatherHourly[];
    },

    subscribe(onChange) {
      // RLS が効くので、自分が見られる行の変更だけが届く
      // 天気は1回の取得で14日分まとめて届くので、1秒待ってから1回だけ更新する
      let weatherTimer: ReturnType<typeof setTimeout> | null = null;
      const onWeather = () => {
        if (weatherTimer) clearTimeout(weatherTimer);
        weatherTimer = setTimeout(onChange, 1000);
      };
      const channel = sb
        .channel('calendar-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, onChange)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'day_stickers' }, onChange)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'day_colors' }, onChange)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'weather_daily' }, onWeather)
        .subscribe();
      return () => {
        if (weatherTimer) clearTimeout(weatherTimer);
        sb.removeChannel(channel);
      };
    },

    async signOut() {
      await sb.auth.signOut();
    },
  };
}
