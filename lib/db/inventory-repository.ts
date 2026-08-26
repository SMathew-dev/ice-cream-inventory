import { getSupabaseBrowserClient } from './supabase';
import type { InventoryRepository, InventorySnapshot, NewOrderInput, NewProductionInput } from './contracts';

export class SupabaseInventoryRepository implements InventoryRepository {
  private db = getSupabaseBrowserClient();

  async getInventory(): Promise<InventorySnapshot[]> {
    const { data, error } = await this.db.from('inventory_snapshot').select('*').order('flavor');
    if (error) throw error;
    return (data ?? []).map((r:any) => ({ productId:r.product_id, flavor:r.flavor, packageSize:r.package_size, onHand:r.on_hand, reserved:r.reserved, available:r.available, labHold:r.lab_hold, storefront:r.storefront }));
  }

  async addProduction(input: NewProductionInput) {
    const { data, error } = await this.db.rpc('add_production_run', {
      p_julian: input.julian, p_flavor: input.flavor, p_package_size: input.packageSize,
      p_total_produced: input.totalProduced, p_storefront_quantity: input.storefrontQuantity
    });
    if (error) throw error;
    return { runId: String(data) };
  }

  async releaseLot(lotId: string, result: 'PASS'|'FAIL') {
    const { error } = await this.db.rpc('release_lot', { p_lot_id: lotId, p_result: result });
    if (error) throw error;
  }

  async createAndReserveOrder(input: NewOrderInput) {
    const { data, error } = await this.db.rpc('create_and_reserve_order', { p_customer_name: input.customerName, p_customer_phone: input.customerPhone ?? null, p_items: input.items });
    if (error) throw error;
    return { orderId: String(data) };
  }

  async completeOrder(orderId: string) {
    const { error } = await this.db.rpc('complete_order_pickup', { p_order_id: orderId });
    if (error) throw error;
  }

  async cancelOrder(orderId: string) {
    const { error } = await this.db.rpc('cancel_reserved_order', { p_order_id: orderId });
    if (error) throw error;
  }

  async withdrawDairyBar(items: Array<{productId:string;quantity:number}>) {
    const { error } = await this.db.rpc('withdraw_dairy_bar', { p_items: items });
    if (error) throw error;
  }

  async reconcileCount(productId: string, physicalCount: number, reason: string) {
    const { error } = await this.db.rpc('reconcile_saleable_count', { p_product_id: productId, p_physical_count: physicalCount, p_reason: reason });
    if (error) throw error;
  }
}
