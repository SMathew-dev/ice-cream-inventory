'use client';

import { useMemo, useState } from 'react';
import type { InventorySnapshot } from '../lib/db/contracts';

export function HardCountCard({ inventory, onApply }: { inventory: InventorySnapshot[]; onApply: (productId:string, physical:number, reason:string)=>Promise<boolean> }) {
  const [productId,setProductId]=useState(inventory[0]?.productId ?? '');
  const [physical,setPhysical]=useState(0);
  const [reason,setReason]=useState('Count correction');
  const selected=useMemo(()=>inventory.find(i=>i.productId===productId),[inventory,productId]);
  const system=selected?.onHand ?? 0;
  const delta=physical-system;

  return <section className="card hard-count-card">
    <div className="card-head"><div><p className="eyebrow">AUDIT / CORRECTION</p><h2>Hard Count / Fix Number</h2></div></div>
    <div className="form">
      <label>Product<select value={productId} onChange={e=>{setProductId(e.target.value); const x=inventory.find(i=>i.productId===e.target.value); setPhysical(x?.onHand ?? 0);}}>{inventory.map(i=><option key={i.productId} value={i.productId}>{i.flavor} · {i.packageSize==='3_GALLON'?'3 gal':'48 oz'}</option>)}</select></label>
      <div className="count-compare"><div><small>SYSTEM SAYS</small><strong>{system}</strong></div><div><small>I COUNTED</small><input type="number" min="0" value={physical} onChange={e=>setPhysical(Number(e.target.value))}/></div><div><small>DIFFERENCE</small><strong>{delta>0?`+${delta}`:delta}</strong></div></div>
      <label>Reason<select value={reason} onChange={e=>setReason(e.target.value)}><option>Count correction</option><option>Data-entry mistake</option><option>Damaged</option><option>Returned</option><option>Other</option></select></label>
      <button className="primary" disabled={!selected || physical<0 || delta===0} onClick={()=>selected&&onApply(selected.productId,physical,reason)}>Fix inventory to {physical}</button>
      <p className="helper">This records an adjustment. It does not erase the original inventory history.</p>
    </div>
  </section>;
}
