'use client';
import { useState } from 'react';

type Slot={id:string;freezer:'-20°F'|'-40°F';wall:string;shelf:string;position:number};
type Stack={id:string;flavor:string;julian:number;packageSize:'3_GALLON'|'48_OZ';quantity:number;slotId:string};

export function FreezerStackEditor({stack,slots,onMove,onSplit,onAdjust}:{stack:Stack;slots:Slot[];onMove:(id:string,destination:string)=>Promise<boolean>;onSplit:(id:string,qty:number,destination:string)=>Promise<boolean>;onAdjust:(id:string,physical:number)=>Promise<boolean>}){
 const [destination,setDestination]=useState(slots.find(s=>s.id!==stack.slotId)?.id??'');const [splitQty,setSplitQty]=useState(1);const [physical,setPhysical]=useState(stack.quantity);const [busy,setBusy]=useState(false);
 const available=slots.filter(s=>s.id!==stack.slotId);
 async function run(work:()=>Promise<boolean>){setBusy(true);await work();setBusy(false)}
 return <section className="card"><div className="card-head"><div><p className="eyebrow">STACK TOOLS</p><h2>{stack.flavor} · Julian {stack.julian}</h2><p>{stack.packageSize==='3_GALLON'?'3 gal':'48 oz'} · {stack.quantity} units</p></div></div>
 <div className="form"><label>Destination shelf<select value={destination} onChange={e=>setDestination(e.target.value)}>{available.map(s=><option key={s.id} value={s.id}>{s.wall} · {s.shelf} · Position {s.position}</option>)}</select></label>
 <div className="form-row"><button disabled={busy||!destination} onClick={()=>run(()=>onMove(stack.id,destination))}>Move whole stack</button><div><label>Split quantity<input type="number" min="1" max={Math.max(1,stack.quantity-1)} value={splitQty} onChange={e=>setSplitQty(Number(e.target.value))}/></label><button disabled={busy||!destination||splitQty<=0||splitQty>=stack.quantity} onClick={()=>run(()=>onSplit(stack.id,splitQty,destination))}>Split & Move</button></div></div>
 <div className="count-compare"><div><small>SYSTEM STACK</small><strong>{stack.quantity}</strong></div><div><small>PHYSICAL STACK</small><input type="number" min="0" value={physical} onChange={e=>setPhysical(Number(e.target.value))}/></div></div>
 <button className="primary" disabled={busy||physical===stack.quantity||physical<0} onClick={()=>run(()=>onAdjust(stack.id,physical))}>Adjust this stack to {physical}</button><p className="helper">Moving or splitting changes location only. Quantity corrections should also be reconciled against total inventory before plant use.</p></div></section>
}
