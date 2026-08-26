import type { PackageSize } from './inventory';

export type CartLine = {
  id: string;
  flavor: string;
  packageSize: PackageSize;
  quantity: number;
};

export type StockLookup = (flavor: string, packageSize: PackageSize) => number;

export function addOrMergeLine(lines: CartLine[], incoming: Omit<CartLine, 'id'>): CartLine[] {
  if (!incoming.flavor.trim()) throw new Error('Flavor is required.');
  if (!Number.isInteger(incoming.quantity) || incoming.quantity <= 0) throw new Error('Quantity must be a positive whole number.');
  const existing = lines.find(l => l.flavor === incoming.flavor && l.packageSize === incoming.packageSize);
  if (!existing) return [...lines, { ...incoming, id: `${incoming.flavor}-${incoming.packageSize}` }];
  return lines.map(l => l.id === existing.id ? { ...l, quantity: l.quantity + incoming.quantity } : l);
}

export function changeLineQuantity(lines: CartLine[], id: string, quantity: number): CartLine[] {
  if (!Number.isInteger(quantity) || quantity < 0) throw new Error('Quantity must be a non-negative whole number.');
  if (quantity === 0) return lines.filter(l => l.id !== id);
  return lines.map(l => l.id === id ? { ...l, quantity } : l);
}

export function validateCartAvailability(lines: CartLine[], getAvailable: StockLookup) {
  if (!lines.length) throw new Error('Add at least one product.');
  const shortages = lines.flatMap(line => {
    const available = getAvailable(line.flavor, line.packageSize);
    return line.quantity > available ? [{ ...line, available, shortBy: line.quantity - available }] : [];
  });
  return { ok: shortages.length === 0, shortages };
}

export function cartUnitCount(lines: CartLine[]) {
  return lines.reduce((sum, line) => sum + line.quantity, 0);
}
