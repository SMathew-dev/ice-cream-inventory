export type FreezerName = '-20°F' | '-40°F';
export type WallName = 'BACK' | 'LEFT' | 'RIGHT' | 'ENTRANCE';
export type ShelfName = 'TOP' | 'MIDDLE' | 'BOTTOM';

export type ShelfSlot = {
  id: string;
  freezer: FreezerName;
  wall: WallName;
  shelf: ShelfName;
  position: number;
  label: string;
};

export type Placement = {
  id: string;
  slotId: string;
  julian: number;
  flavor: string;
  packageSize: '3_GALLON' | '48_OZ';
  quantity: number;
};

export const wallOrder: WallName[] = ['BACK', 'RIGHT', 'ENTRANCE', 'LEFT'];
export const shelfOrder: ShelfName[] = ['TOP', 'MIDDLE', 'BOTTOM'];

export function buildThreeShelfWall(freezer: FreezerName, wall: WallName, positionsPerShelf = 4): ShelfSlot[] {
  return shelfOrder.flatMap(shelf => Array.from({ length: positionsPerShelf }, (_, i) => ({
    id: `${freezer}-${wall}-${shelf}-${i + 1}`,
    freezer,
    wall,
    shelf,
    position: i + 1,
    label: `${wall} ${shelf} ${i + 1}`
  })));
}

export function placementsForSlot(placements: Placement[], slotId: string) {
  return placements.filter(p => p.slotId === slotId);
}

export function findFlavorLocations(placements: Placement[], flavor: string, packageSize?: Placement['packageSize']) {
  return placements
    .filter(p => p.flavor === flavor && (!packageSize || p.packageSize === packageSize) && p.quantity > 0)
    .sort((a, b) => a.julian - b.julian);
}

export function movePlacement(placements: Placement[], placementId: string, destinationSlotId: string): Placement[] {
  if (!destinationSlotId) throw new Error('Choose a destination shelf.');
  return placements.map(p => p.id === placementId ? { ...p, slotId: destinationSlotId } : p);
}

export function shelfQuantity(placements: Placement[], slotId: string) {
  return placementsForSlot(placements, slotId).reduce((sum, p) => sum + p.quantity, 0);
}
