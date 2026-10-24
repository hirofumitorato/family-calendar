import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';

import { EventForm } from '@/components/event-form';
import { useTemplates } from '@/hooks/use-templates';
import { useApp } from '@/state/app-store';
import { confirm } from '@/utils/dialog';

/** 予定テンプレートの新規作成（id = 'new'）・編集 */
export default function TemplateScreen() {
  const router = useRouter();
  const { id, genre } = useLocalSearchParams<{ id: string; genre?: string }>();
  const { ctx, defaultCalendar } = useApp();
  const { templates, loaded, save, update, remove } = useTemplates();
  const isNew = id === 'new';
  const template = isNew ? undefined : templates.find((x) => x.id === id);

  if (!isNew && !loaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }
  if (!isNew && !template) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text>テンプレートが見つかりませんでした</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: isNew ? '新しいテンプレート' : 'テンプレートを編集' }} />
      <EventForm
        mode="template"
        // key: 読み込み後のテンプレートで初期値を入れ直す
        key={template?.id ?? 'new'}
        calendars={ctx?.calendars ?? []}
        people={ctx?.people ?? []}
        defaultCalendarId={defaultCalendar?.id}
        templates={templates}
        initialTemplate={template}
        defaultGenre={genre || null}
        onSubmitTemplate={async (value) => {
          if (template) await update(template.id, value);
          else await save(value);
          router.back();
        }}
        onDelete={
          template
            ? async () => {
                const ok = await confirm(`テンプレート「${template.title}」を削除しますか？`, {
                  okText: '削除',
                  destructive: true,
                });
                if (!ok) return;
                await remove(template);
                router.back();
              }
            : undefined
        }
      />
    </>
  );
}
