import type { PackageSize } from './inventory';

export type InventoryBucket = 'LAB_HOLD' | 'SALEABLE' | 'STOREFRONT' | 'DISPOSED';
export type QuickAction = 'PRODUCTION' | 'CUSTOMER_ORDER' | 'DAIRY_BAR' | 'COUNT' | 'MOVE';

export type OrderLine = {
  flavor: string;
  packageSize: PackageSize;
  quantity: number;
};

export type CountReconciliation = {
  systemCount: number;
  physicalCount: number;
  delta: number;
};

export function reconcileCount(systemCount: number, physicalCount: number): CountReconciliation {
  if (!Number.isInteger(systemCount) || systemCount < 0) throw new Error('System count must be a non-negative whole number.');
  if (!Number.isInteger(physicalCount) || physicalCount < 0) throw new Error('Physical count must be a non-negative whole number.');
  return { systemCount, physicalCount, delta: physicalCount - systemCount };
}

export function validateOrderLines(lines: OrderLine[]) {
  if (!lines.length) throw new Error('Add at least one item to the order.');
  for (const line of lines) {
    if (!line.flavor.trim()) throw new Error('Flavor is required.');
    if (!Number.isInteger(line.quantity) || line.quantity <= 0) throw new Error('Order quantities must be positive whole numbers.');
  }
  return true;
}

export function chooseOldestEligibleLot<T extends { julian: number; status: string; remaining: number }>(lots: T[]) {
  return [...lots]
    .filter(l => l.status === 'PASSED' && l.remaining > 0)
    .sort((a, b) => a.julian - b.julian)[0] ?? null;
}

export function returnDisposition(target: 'SALEABLE' | 'STOREFRONT' | 'WASTE'): InventoryBucket {
  if (target === 'WASTE') return 'DISPOSED';
  return target;
}
