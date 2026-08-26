'use client';
import { useState } from 'react';
import type { OpenOrder } from '../lib/db/contracts';

export function OrderPickupQueue({orders,onComplete,onCancel}:{orders:OpenOrder[];onComplete:(id:string)=>Promise<boolean>;onCancel:(id:string)=>Promise<boolean>}){
 const [busy,setBusy]=useState<string|null>(null);
 async function run(id:string,fn:(id:string)=>Promise<boolean>){setBusy(id);await fn(id);setBusy(null)}
 return <section className="card"><div className="card-head"><div><p className="eyebrow">RESERVED / READY</p><h2>Orders to Pull</h2></div><span className="step">{orders.length} open</span></div>
 <div className="queue">{orders.length===0?<div className="empty">No customer orders waiting.</div>:orders.map(o=><div className="queue-row" key={o.id}><div><strong>{o.customerName}</strong><small>{o.items.map(i=>`${i.quantity} ${i.flavor} ${i.packageSize==='3_GALLON'?'3 gal':'48 oz'}`).join(' · ')}</small></div><div className="queue-actions"><button disabled={busy===o.id} onClick={()=>run(o.id,onCancel)}>Cancel</button><button className="primary" disabled={busy===o.id} onClick={()=>run(o.id,onComplete)}>{busy===o.id?'Saving…':'Pulled / Complete'}</button></div></div>)}</div>
 <p className="helper">Reserved orders reduce available stock immediately. Physical on-hand deducts only after Pulled / Complete.</p></section>
}
