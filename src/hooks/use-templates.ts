import { useCallback, useEffect, useState } from 'react';

import type { EventTemplate, NewEventTemplate } from '@/lib/types';
import { useApp } from '@/state/app-store';

/** 家族の予定テンプレートの一覧と、追加・削除 */
export function useTemplates() {
  const { repo, ctx } = useApp();
  const familyId = ctx?.family.id;
  const [templates, setTemplates] = useState<EventTemplate[]>([]);

  const reload = useCallback(async () => {
    if (!familyId) return;
    setTemplates(await repo.listTemplates(familyId));
  }, [repo, familyId]);

  useEffect(() => {
    reload().catch((e) => console.warn('failed to load templates', e));
  }, [reload]);

  const save = useCallback(
    async (tpl: Omit<NewEventTemplate, 'family_id'>) => {
      if (!familyId) return;
      await repo.createTemplate({ ...tpl, family_id: familyId });
      await reload();
    },
    [repo, familyId, reload],
  );

  const remove = useCallback(
    async (tpl: EventTemplate) => {
      await repo.deleteTemplate(tpl.id);
      await reload();
    },
    [repo, reload],
  );

  return { templates, save, remove };
}
