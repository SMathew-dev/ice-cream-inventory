export type PackageSize = '3 gal' | '48 oz';
export type InventoryBucket = 'LAB_HOLD' | 'SALEABLE' | 'STOREFRONT' | 'DISPOSED';
export type AdjustmentReason = 'COUNT_CORRECTION' | 'DATA_ENTRY_ERROR' | 'DAMAGED' | 'STOREFRONT' | 'RETURNED' | 'OTHER';

export type ProductIdentity = {
  julian: number;
  flavor: string;
  size: PackageSize;
};

export type ProductionInput = ProductIdentity & {
  totalProduced: number;
  storefrontQty: number;
};

export type ProductionSplit = ProductionInput & {
  goodQty: number;
};

export function normalizeJulian(value: number | string): number {
  const julian = Number(value);
  if (!Number.isInteger(julian) || julian < 1 || julian > 366) {
    throw new Error('Julian date must be a whole number from 1 to 366.');
  }
  return julian;
}

export function productLabel(identity: ProductIdentity): string {
  return `${String(normalizeJulian(identity.julian)).padStart(3, '0')} · ${identity.flavor.trim()} · ${identity.size}`;
}

export function splitProduction(input: ProductionInput): ProductionSplit {
  const totalProduced = Number(input.totalProduced);
  const storefrontQty = Number(input.storefrontQty);

  if (!Number.isInteger(totalProduced) || totalProduced <= 0) {
    throw new Error('Total produced must be a positive whole number.');
  }
  if (!Number.isInteger(storefrontQty) || storefrontQty < 0) {
    throw new Error('Storefront quantity must be zero or a positive whole number.');
  }
  if (storefrontQty > totalProduced) {
    throw new Error('Storefront quantity cannot exceed total produced.');
  }

  return {
    ...input,
    julian: normalizeJulian(input.julian),
    totalProduced,
    storefrontQty,
    goodQty: totalProduced - storefrontQty,
  };
}

export function availableInventory(onHand: number, reserved: number): number {
  const available = onHand - reserved;
  if (available < 0) throw new Error('Inventory invariant violated: reserved exceeds on-hand.');
  return available;
}

export function validateReservation(onHand: number, reserved: number, requested: number): void {
  if (!Number.isInteger(requested) || requested <= 0) throw new Error('Quantity must be at least 1.');
  const available = availableInventory(onHand, reserved);
  if (requested > available) throw new Error(`Only ${available} available.`);
}

export type QuantityCorrection = {
  previousQty: number;
  correctedQty: number;
  reason: AdjustmentReason;
};

export function correctionDelta(input: QuantityCorrection): number {
  if (!Number.isInteger(input.previousQty) || input.previousQty < 0) throw new Error('Previous quantity is invalid.');
  if (!Number.isInteger(input.correctedQty) || input.correctedQty < 0) throw new Error('Corrected quantity is invalid.');
  return input.correctedQty - input.previousQty;
}

export function applyCorrection(currentQty: number, input: QuantityCorrection): number {
  const delta = correctionDelta(input);
  const next = currentQty + delta;
  if (next < 0) throw new Error('Correction would make inventory negative.');
  return next;
}

// A UI "Delete" should call a void/reversal transaction, never physically erase an inventory event.
export type VoidRecord = {
  id: string;
  voidedAt: string;
  reason: string;
};

export function createVoidRecord(id: string, reason: string, now = new Date()): VoidRecord {
  const cleanReason = reason.trim();
  if (!cleanReason) throw new Error('A reason is required when deleting/voiding an inventory record.');
  return { id, voidedAt: now.toISOString(), reason: cleanReason };
}
