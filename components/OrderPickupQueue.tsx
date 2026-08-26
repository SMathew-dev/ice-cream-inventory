'use client';
import { useMemo, useState } from 'react';
import type { OpenOrder, PickPlanStep } from '../lib/db/contracts';
import { SupabaseInventoryRepository } from '../lib/db/inventory-repository';
import { PickPlan } from './PickPlan';

export function OrderPickupQueue({orders,onComplete,onCancel}:{orders:OpenOrder[];onComplete:(id:string)=>Promise<boolean>;onCancel:(id:string)=>Promise<boolean>}){
 const repo=useMemo(()=>new SupabaseInventoryRepository(),[]);
 const [busy,setBusy]=useState<string|null>(null);
 const [selected,setSelected]=useState<string|null>(null);
 const [plan,setPlan]=useState<PickPlanStep[]>([]);
 const [planTitle,setPlanTitle]=useState('');
 const [error,setError]=useState('');
 async function run(id:string,fn:(id:string)=>Promise<boolean>){setBusy(id);const ok=await fn(id);setBusy(null);if(ok&&selected===id){setSelected(null);setPlan([])}}
 async function showPlan(order:OpenOrder){
   try{
     setBusy(order.id);setError('');
     const groups=await Promise.all(order.items.map(async item=>({item,steps:await repo.getPickPlan(item.productId,item.quantity)})));
     const steps=groups.flatMap(g=>g.steps);
     setPlan(steps);setSelected(order.id);setPlanTitle(`${order.customerName} · ${order.items.map(i=>`${i.quantity} ${i.flavor}`).join(' + ')}`);
   }catch(e){setError(e instanceof Error?e.message:'Could not build pull plan.')}finally{setBusy(null)}
 }
 return <>
 <section className="card"><div className="card-head"><div><p className="eyebrow">RESERVED / READY</p><h2>Orders to Pull</h2></div><span className="step">{orders.length} open</span></div>
 {error&&<div className="notice">{error}</div>}
 <div className="queue">{orders.length===0?<div className="empty">No customer orders waiting.</div>:orders.map(o=><div className="queue-row" key={o.id}><div><strong>{o.customerName}</strong><small>{o.items.map(i=>`${i.quantity} ${i.flavor} ${i.packageSize==='3_GALLON'?'3 gal':'48 oz'}`).join(' · ')}</small></div><div className="queue-actions"><button disabled={busy===o.id} onClick={()=>void showPlan(o)}>Where to Pull</button><button disabled={busy===o.id} onClick={()=>void run(o.id,onCancel)}>Cancel</button><button className="primary" disabled={busy===o.id} onClick={()=>void run(o.id,onComplete)}>{busy===o.id?'Saving…':'Pulled / Complete'}</button></div></div>)}</div>
 <p className="helper">Reserved orders reduce available stock immediately. Use Where to Pull for the oldest Julian and exact freezer position. Physical on-hand deducts only after Pulled / Complete.</p></section>
 {selected&&<PickPlan title={planTitle} steps={plan}/>} 
 </>
}
