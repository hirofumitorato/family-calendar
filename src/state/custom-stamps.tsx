import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import type { CustomStamp } from '@/lib/types';
import { useApp } from '@/state/app-store';

type CustomStampsState = {
  stamps: CustomStamp[];
  byId: (id: string) => CustomStamp | undefined;
  add: (name: string, imageData: string) => Promise<CustomStamp>;
  rename: (stamp: CustomStamp, name: string) => Promise<void>;
  remove: (stamp: CustomStamp) => Promise<void>;
  reload: () => Promise<void>;
};

const Ctx = createContext<CustomStampsState | null>(null);

/** 家族のオリジナルスタンプ（画像）。追加・削除はほかの端末にもリアルタイムで反映される */
export function CustomStampsProvider({ children }: { children: ReactNode }) {
  const { repo, ctx } = useApp();
  const familyId = ctx?.family.id ?? null;
  const [stamps, setStamps] = useState<CustomStamp[]>([]);

  const reload = useCallback(async () => {
    if (!familyId) {
      setStamps([]);
      return;
    }
    try {
      setStamps(await repo.listCustomStamps(familyId));
    } catch {
      // 表がまだない（Supabase に SQL を流す前）などは、オリジナルなしで動かす
      setStamps([]);
    }
  }, [repo, familyId]);

  useEffect(() => {
    reload();
    // リアルタイム更新が使えなくても、スタンプ以外の画面は止めない
    try {
      return repo.subscribe(() => {
        reload();
      });
    } catch {
      return undefined;
    }
  }, [repo, reload]);

  const value = useMemo<CustomStampsState>(() => {
    const map = new Map(stamps.map((s) => [s.id, s]));
    return {
      stamps,
      byId: (id) => map.get(id),
      add: async (name, imageData) => {
        if (!familyId) throw new Error('家族が未設定です');
        const created = await repo.createCustomStamp(familyId, name, imageData);
        await reload();
        return created;
      },
      rename: async (stamp, name) => {
        await repo.renameCustomStamp(stamp, name);
        await reload();
      },
      remove: async (stamp) => {
        await repo.deleteCustomStamp(stamp);
        await reload();
      },
      reload,
    };
  }, [stamps, repo, familyId, reload]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCustomStamps(): CustomStampsState {
  const v = useContext(Ctx);
  if (!v) {
    // プロバイダーの外（ログイン前など）は空のまま
    return {
      stamps: [],
      byId: () => undefined,
      add: async () => {
        throw new Error('利用できません');
      },
      rename: async () => {},
      remove: async () => {},
      reload: async () => {},
    };
  }
  return v;
}
