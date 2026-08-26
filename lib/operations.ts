import type { PackageSize } from './inventory';

export type InventoryBucket = 'LAB_HOLD' | 'SALEABLE' | 'STOREFRONT' | 'DISPOSED';
export type QuickAction = 'PRODUCTION' | 'CUSTOMER_ORDER' | 'DAIRY_BAR' | 'COUNT' | 'MOVE';
export type AdjustmentReason = 'COUNT_CORRECTION' | 'DAMAGED' | 'DATA_ENTRY_MISTAKE' | 'RETURNED' | 'STORE_FRONT' | 'OTHER';

export type OrderLine = {
  flavor: string;
  packageSize: PackageSize;
  quantity: number;
};

export type Stock = {
  saleable: number;
  reserved: number;
  labHold: number;
  storefront: number;
};

export type CountReconciliation = {
  systemCount: number;
  physicalCount: number;
  delta: number;
};

export function available(stock: Stock) {
  return stock.saleable - stock.reserved;
}

export function validateStock(stock: Stock) {
  for (const [name, value] of Object.entries(stock)) {
    if (!Number.isInteger(value) || value < 0) throw new Error(`${name} must be a non-negative whole number.`);
  }
  if (stock.reserved > stock.saleable) throw new Error('Reserved inventory cannot exceed saleable on-hand inventory.');
  return stock;
}

export function reserve(stock: Stock, quantity: number) {
  requirePositive(quantity);
  if (quantity > available(stock)) throw new Error('Not enough available stock to reserve.');
  return validateStock({ ...stock, reserved: stock.reserved + quantity });
}

export function cancelReservation(stock: Stock, quantity: number) {
  requirePositive(quantity);
  if (quantity > stock.reserved) throw new Error('Cannot release more than is reserved.');
  return validateStock({ ...stock, reserved: stock.reserved - quantity });
}

export function completeCustomerPickup(stock: Stock, quantity: number) {
  requirePositive(quantity);
  if (quantity > stock.reserved || quantity > stock.saleable) throw new Error('Pickup exceeds reserved or on-hand stock.');
  return validateStock({ ...stock, reserved: stock.reserved - quantity, saleable: stock.saleable - quantity });
}

export function dairyBarWithdrawal(stock: Stock, quantity: number) {
  requirePositive(quantity);
  if (quantity > available(stock)) throw new Error('Dairy Bar withdrawal exceeds available stock.');
  return validateStock({ ...stock, saleable: stock.saleable - quantity });
}

export function waste(stock: Stock, quantity: number) {
  requirePositive(quantity);
  if (quantity > available(stock)) throw new Error('Waste quantity exceeds available stock.');
  return validateStock({ ...stock, saleable: stock.saleable - quantity });
}

export function returnToSaleable(stock: Stock, quantity: number) {
  requirePositive(quantity);
  return validateStock({ ...stock, saleable: stock.saleable + quantity });
}

export function moveToStorefront(stock: Stock, quantity: number) {
  requirePositive(quantity);
  if (quantity > available(stock)) throw new Error('Storefront move exceeds available saleable stock.');
  return validateStock({ ...stock, saleable: stock.saleable - quantity, storefront: stock.storefront + quantity });
}

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

function requirePositive(quantity: number) {
  if (!Number.isInteger(quantity) || quantity <= 0) throw new Error('Quantity must be a positive whole number.');
}
