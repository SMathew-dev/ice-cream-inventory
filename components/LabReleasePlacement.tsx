'use client';
import {useMemo,useState} from 'react';
import type {PendingLot,FreezerSlot} from '../lib/db/contracts';

export function LabReleasePlacement({lots,slots,onPass,onFail}:{lots:PendingLot[];slots:FreezerSlot[];onPass:(lotId:string,slotId:string)=>Promise<boolean>;onFail:(lotId:string)=>Promise<boolean>}){
 const [selected,setSelected]=useState<PendingLot|null>(null); const [slot,setSlot]=useState(''); const [busy,setBusy]=useState(false);
 const saleableSlots=useMemo(()=>slots.filter(s=>s.freezer==='-20°F'&&s.active),[slots]);
 async function pass(){if(!selected||!slot)return;setBusy(true);const ok=await onPass(selected.id,slot);setBusy(false);if(ok){setSelected(null);setSlot('')}}
 async function fail(l:PendingLot){setBusy(true);await onFail(l.id);setBusy(false)}
 return <section className="card"><div className="card-head"><div><p className="eyebrow">-40°F → STATE LAB → -20°F</p><h2>Lab Release</h2></div><span className="step">{lots.length} waiting</span></div>
 <div className="queue">{lots.length===0?<div className="empty">Nothing is waiting for lab release.</div>:lots.map(l=><div className="queue-row" key={l.id}><div><strong>Julian {l.julian} · {l.flavor} · {l.packageSize==='3_GALLON'?'3 gal':'48 oz'}</strong><small>{l.quantity} good units waiting in -40°F</small></div><div className="queue-actions"><button disabled={busy} onClick={()=>fail(l)}>FAIL / Dispose</button><button className="primary" disabled={busy} onClick={()=>{setSelected(l);setSlot('')}}>PASS</button></div></div>)}</div>
 {selected&&<div className="release-place"><h3>Where are you putting these {selected.quantity} units?</h3><p><strong>{selected.flavor}</strong> · Julian {selected.julian} · {selected.packageSize==='3_GALLON'?'3 gal':'48 oz'}</p><select value={slot} onChange={e=>setSlot(e.target.value)}><option value="">Choose -20°F wall / shelf / position</option>{saleableSlots.map(s=><option key={s.id} value={s.id}>{s.wall} · {s.shelf} · Position {s.position}</option>)}</select><div className="queue-actions"><button onClick={()=>setSelected(null)}>Back</button><button className="primary" disabled={!slot||busy} onClick={pass}>{busy?'Saving…':`PASS + Place ${selected.quantity}`}</button></div><small>One confirmation releases the lot and records its physical -20°F location.</small></div>}
 </section>
}
