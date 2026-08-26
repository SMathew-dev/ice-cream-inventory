import { getSupabaseBrowserClient } from './supabase';
import type { InventoryRepository, InventorySnapshot, NewOrderInput, NewProductionInput, OpenOrder, PendingLot, FreezerPlacement } from './contracts';

export class SupabaseInventoryRepository implements InventoryRepository {
 private db=getSupabaseBrowserClient();
 async getInventory():Promise<InventorySnapshot[]>{const {data,error}=await this.db.from('inventory_snapshot').select('*').order('flavor');if(error)throw error;return(data??[]).map((r:any)=>({productId:r.product_id,flavor:r.flavor,packageSize:r.package_size,onHand:r.on_hand,reserved:r.reserved,available:r.available,labHold:r.lab_hold,storefront:r.storefront}))}
 async getPendingLots():Promise<PendingLot[]>{const {data,error}=await this.db.from('pending_lab_lots').select('*').order('julian');if(error)throw error;return(data??[]).map((r:any)=>({id:r.id,julian:r.julian,flavor:r.flavor,packageSize:r.package_size,quantity:r.quantity,productionDate:r.production_date}))}
 async getOpenOrders():Promise<OpenOrder[]>{const {data,error}=await this.db.from('open_order_queue').select('*').order('created_at');if(error)throw error;const grouped=new Map<string,OpenOrder>();for(const r of data??[]){let o=grouped.get(r.order_id);if(!o){o={id:r.order_id,customerName:r.customer_name,customerPhone:r.customer_phone??undefined,status:r.status,createdAt:r.created_at,items:[]};grouped.set(r.order_id,o)}o.items.push({productId:r.product_id,flavor:r.flavor,packageSize:r.package_size,quantity:r.quantity-r.quantity_pulled})}return[...grouped.values()]}
 async getFreezerPlacements():Promise<FreezerPlacement[]>{const {data,error}=await this.db.from('freezer_placement_view').select('*').order('wall').order('shelf').order('position');if(error)throw error;return(data??[]).map((r:any)=>({id:r.id,freezer:r.freezer,wall:r.wall,shelf:r.shelf,positionLabel:r.position_label,julian:r.julian,flavor:r.flavor,packageSize:r.package_size,quantity:r.quantity}))}
 async addProduction(input:NewProductionInput){const{data,error}=await this.db.rpc('add_production_run',{p_julian:input.julian,p_flavor:input.flavor,p_package_size:input.packageSize,p_total_produced:input.totalProduced,p_storefront_quantity:input.storefrontQuantity});if(error)throw error;return{runId:String(data)}}
 async releaseLot(lotId:string,result:'PASS'|'FAIL'){const{error}=await this.db.rpc('release_lot',{p_lot_id:lotId,p_result:result});if(error)throw error}
 async createAndReserveOrder(input:NewOrderInput){const{data,error}=await this.db.rpc('create_and_reserve_order',{p_customer_name:input.customerName,p_customer_phone:input.customerPhone??null,p_items:input.items});if(error)throw error;return{orderId:String(data)}}
 async completeOrder(orderId:string){const{error}=await this.db.rpc('complete_order_pickup',{p_order_id:orderId});if(error)throw error}
 async cancelOrder(orderId:string){const{error}=await this.db.rpc('cancel_reserved_order',{p_order_id:orderId});if(error)throw error}
 async withdrawDairyBar(items:Array<{productId:string;quantity:number}>){const{error}=await this.db.rpc('withdraw_dairy_bar',{p_items:items});if(error)throw error}
 async reconcileCount(productId:string,physicalCount:number,reason:string){const{error}=await this.db.rpc('reconcile_saleable_count',{p_product_id:productId,p_physical_count:physicalCount,p_reason:reason});if(error)throw error}
}
