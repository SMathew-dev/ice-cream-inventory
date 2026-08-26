export type PackageSizeDb = '3_GALLON' | '48_OZ';
export type OrderStatusDb = 'DRAFT' | 'RESERVED' | 'READY' | 'COMPLETED' | 'CANCELLED';
export type LabStatusDb = 'PENDING' | 'PASSED' | 'FAILED';

export type ProductRow = {
  id: string;
  flavor: string;
  package_size: PackageSizeDb;
  flavor_color: string | null;
  low_stock_threshold: number;
  critical_stock_threshold: number;
  active: boolean;
};

export type InventorySnapshot = {
  productId: string;
  flavor: string;
  packageSize: PackageSizeDb;
  onHand: number;
  reserved: number;
  available: number;
  labHold: number;
  storefront: number;
};

export type NewProductionInput = {
  julian: number;
  flavor: string;
  packageSize: PackageSizeDb;
  totalProduced: number;
  storefrontQuantity: number;
};

export type NewOrderInput = {
  customerName: string;
  customerPhone?: string;
  items: Array<{ productId: string; quantity: number }>;
};

export interface InventoryRepository {
  getInventory(): Promise<InventorySnapshot[]>;
  addProduction(input: NewProductionInput): Promise<{ runId: string }>;
  releaseLot(lotId: string, result: 'PASS' | 'FAIL'): Promise<void>;
  createAndReserveOrder(input: NewOrderInput): Promise<{ orderId: string }>;
  completeOrder(orderId: string): Promise<void>;
  cancelOrder(orderId: string): Promise<void>;
  withdrawDairyBar(items: Array<{ productId: string; quantity: number }>): Promise<void>;
  reconcileCount(productId: string, physicalCount: number, reason: string): Promise<void>;
}
