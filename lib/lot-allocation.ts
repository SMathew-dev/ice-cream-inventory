export type EligibleLot = {
  id: string;
  julian: number;
  flavor: string;
  packageSize: '3_GALLON' | '48_OZ';
  available: number;
  locationLabel?: string;
};

export type Allocation = {
  lotId: string;
  julian: number;
  quantity: number;
  locationLabel?: string;
};

/** Allocate saleable product oldest-Julian-first without mutating source lots. */
export function allocateFifo(lots: EligibleLot[], requested: number): Allocation[] {
  if (!Number.isInteger(requested) || requested <= 0) throw new Error('Requested quantity must be a positive whole number.');
  const eligible = [...lots].filter(l => l.available > 0).sort((a,b) => a.julian - b.julian);
  const total = eligible.reduce((s,l) => s + l.available, 0);
  if (requested > total) throw new Error(`Only ${total} units are available.`);
  let remaining = requested;
  const allocations: Allocation[] = [];
  for (const lot of eligible) {
    if (!remaining) break;
    const quantity = Math.min(lot.available, remaining);
    allocations.push({ lotId: lot.id, julian: lot.julian, quantity, locationLabel: lot.locationLabel });
    remaining -= quantity;
  }
  return allocations;
}

export function formatPickPlan(allocations: Allocation[]) {
  return allocations.map((a, i) => ({
    step: i + 1,
    label: `Julian ${a.julian} · ${a.quantity} unit${a.quantity === 1 ? '' : 's'}${a.locationLabel ? ` · ${a.locationLabel}` : ''}`
  }));
}
