import { useLocalSearchParams, useRouter } from 'expo-router';

import { EventForm } from '@/components/event-form';
import { useTemplates } from '@/hooks/use-templates';
import { toDateKey } from '@/lib/date';
import { useApp } from '@/state/app-store';

export default function NewEventScreen() {
  const router = useRouter();
  const { date } = useLocalSearchParams<{ date?: string }>();
  const { repo, ctx, defaultCalendar, bumpRevision } = useApp();
  const { templates, save, remove } = useTemplates();

  return (
    <EventForm
      calendars={ctx?.calendars ?? []}
      people={ctx?.people ?? []}
      defaultCalendarId={defaultCalendar?.id}
      defaultDate={date ?? toDateKey(new Date())}
      templates={templates}
      onSaveTemplate={save}
      onDeleteTemplate={remove}
      onEditTemplate={(tpl) => router.push({ pathname: '/template/[id]', params: { id: tpl.id } })}
      onCreateTemplate={(genre) =>
        router.push({ pathname: '/template/[id]', params: { id: 'new', genre: genre ?? '' } })
      }
      onSubmit={async (value) => {
        await repo.createEvent(value);
        bumpRevision();
        router.back();
      }}
    />
  );
}
