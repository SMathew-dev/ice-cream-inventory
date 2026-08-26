'use client';

import { useMemo, useState } from 'react';
import type { InventorySnapshot } from '../lib/db/contracts';

type Line={productId:string;quantity:number};

export function DairyBarCart({inventory,onSubmit}:{inventory:InventorySnapshot[];onSubmit:(items:Line[])=>Promise<boolean>}){
  const [productId,setProductId]=useState(inventory[0]?.productId??'');
  const [quantity,setQuantity]=useState(1);
  const [lines,setLines]=useState<Line[]>([]);
  const selected=inventory.find(i=>i.productId===productId);
  const total=useMemo(()=>lines.reduce((s,l)=>s+l.quantity,0),[lines]);

  function add(){
    if(!selected||quantity<1||quantity>selected.available)return;
    setLines(cur=>{
      const found=cur.find(l=>l.productId===productId);
      return found?cur.map(l=>l.productId===productId?{...l,quantity:l.quantity+quantity}:l):[...cur,{productId,quantity}];
    });
    setQuantity(1);
  }
  function remove(id:string){setLines(cur=>cur.filter(l=>l.productId!==id));}
  async function submit(){if(!lines.length)return;const ok=await onSubmit(lines);if(ok)setLines([]);}

  return <section className="card">
    <div className="card-head"><div><p className="eyebrow">QUICK WITHDRAWAL</p><h2>Dairy Bar Cart</h2></div><span className="step">{total} units</span></div>
    <div className="form">
      <div className="form-row"><label>Flavor / package<select value={productId} onChange={e=>setProductId(e.target.value)}>{inventory.map(i=><option value={i.productId} key={i.productId}>{i.flavor} · {i.packageSize==='3_GALLON'?'3 gal':'48 oz'} · {i.available} available</option>)}</select></label><label>Quantity<input type="number" min="1" max={selected?.available??0} value={quantity} onChange={e=>setQuantity(Number(e.target.value))}/></label></div>
      <button type="button" onClick={add}>Add to cart</button>
      <div className="cart-lines">{lines.length===0?<div className="empty">Cart is empty.</div>:lines.map(l=>{const p=inventory.find(i=>i.productId===l.productId);return <div className="order-row" key={l.productId}><div><strong>{p?.flavor} · {p?.packageSize==='3_GALLON'?'3 gal':'48 oz'}</strong><small>{l.quantity} to pull</small></div><button onClick={()=>remove(l.productId)}>Remove</button></div>})}</div>
      <button className="primary" disabled={!lines.length} onClick={submit}>Confirm Dairy Bar Withdrawal</button>
      <p className="helper">This is a physical pull, so the confirmed cart deducts from saleable inventory immediately.</p>
    </div>
  </section>;
}
