'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { isSupabaseConfigured } from './supabase';
import { SupabaseInventoryRepository } from './inventory-repository';
import type { InventorySnapshot } from './contracts';

export type ConnectionState = 'DEMO' | 'CONNECTING' | 'LIVE' | 'ERROR';

export function useInventorySnapshot() {
  const configured = isSupabaseConfigured();
  const repo = useMemo(() => configured ? new SupabaseInventoryRepository() : null, [configured]);
  const [rows, setRows] = useState<InventorySnapshot[]>([]);
  const [connection, setConnection] = useState<ConnectionState>(configured ? 'CONNECTING' : 'DEMO');
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!repo) {
      setConnection('DEMO');
      return;
    }
    try {
      setConnection('CONNECTING');
      setError(null);
      const next = await repo.getInventory();
      setRows(next);
      setConnection('LIVE');
    } catch (e) {
      setConnection('ERROR');
      setError(e instanceof Error ? e.message : 'Inventory connection failed.');
    }
  }, [repo]);

  useEffect(() => { void refresh(); }, [refresh]);

  return { rows, connection, error, refresh, repository: repo };
}
