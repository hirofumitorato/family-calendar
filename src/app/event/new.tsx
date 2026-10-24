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
      members={ctx?.members ?? []}
      defaultCalendarId={defaultCalendar?.id}
      defaultDate={date ?? toDateKey(new Date())}
      templates={templates}
      onSaveTemplate={save}
      onDeleteTemplate={remove}
      onSubmit={async (value) => {
        await repo.createEvent(value);
        bumpRevision();
        router.back();
      }}
    />
  );
}
