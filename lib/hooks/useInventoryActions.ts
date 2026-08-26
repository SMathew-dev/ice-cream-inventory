'use client';

import { useCallback, useMemo, useState } from 'react';
import { isSupabaseConfigured } from '../db/supabase';
import { SupabaseInventoryRepository } from '../db/inventory-repository';
import type { NewOrderInput, NewProductionInput } from '../db/contracts';

export type ActionState = 'idle' | 'working' | 'success' | 'error';

export function useInventoryActions(onChanged?: () => Promise<void> | void) {
  const [state, setState] = useState<ActionState>('idle');
  const [message, setMessage] = useState('');
  const repo = useMemo(() => isSupabaseConfigured() ? new SupabaseInventoryRepository() : null, []);

  const run = useCallback(async (work: () => Promise<unknown>, success: string) => {
    if (!repo) {
      setState('error');
      setMessage('Live database is not connected yet.');
      return false;
    }
    try {
      setState('working');
      setMessage('Saving…');
      await work();
      await onChanged?.();
      setState('success');
      setMessage(success);
      return true;
    } catch (error) {
      setState('error');
      setMessage(error instanceof Error ? error.message : 'Inventory action failed.');
      return false;
    }
  }, [repo, onChanged]);

  return {
    state,
    message,
    clearMessage: () => { setState('idle'); setMessage(''); },
    addProduction: (input: NewProductionInput) => run(() => repo!.addProduction(input), 'Production saved to lab hold.'),
    releaseLot: (lotId: string, result: 'PASS'|'FAIL') => run(() => repo!.releaseLot(lotId, result), result === 'PASS' ? 'Lot released to saleable inventory.' : 'Lot failed and was removed from saleable flow.'),
    reserveOrder: (input: NewOrderInput) => run(() => repo!.createAndReserveOrder(input), 'Customer order reserved.'),
    completeOrder: (orderId: string) => run(() => repo!.completeOrder(orderId), 'Order completed and inventory deducted.'),
    cancelOrder: (orderId: string) => run(() => repo!.cancelOrder(orderId), 'Order cancelled and reservation released.'),
    withdrawDairyBar: (items: Array<{productId:string;quantity:number}>) => run(() => repo!.withdrawDairyBar(items), 'Dairy Bar withdrawal recorded.'),
    reconcileCount: (productId: string, physicalCount: number, reason: string) => run(() => repo!.reconcileCount(productId, physicalCount, reason), 'Inventory count corrected.')
  };
}
