'use client';
import { useState } from 'react';
import type { PendingLot } from '../lib/db/contracts';

export function LabReleaseQueue({lots,onRelease}:{lots:PendingLot[];onRelease:(lotId:string,result:'PASS'|'FAIL')=>Promise<boolean>}){
 const [busy,setBusy]=useState<string|null>(null);
 async function act(id:string,result:'PASS'|'FAIL'){setBusy(id);await onRelease(id,result);setBusy(null)}
 return <section className="card"><div className="card-head"><div><p className="eyebrow">-40°F LAB HOLD</p><h2>Waiting for State Lab</h2></div><span className="step">{lots.length} lots</span></div>
 <div className="queue">{lots.length===0?<div className="empty">Nothing is waiting for lab release.</div>:lots.map(l=><div className="queue-row" key={l.id}><div><strong>Julian {l.julian} · {l.flavor} · {l.packageSize==='3_GALLON'?'3 gal':'48 oz'}</strong><small>{l.quantity} good units in -40°F</small></div><div className="queue-actions"><button disabled={busy===l.id} onClick={()=>act(l.id,'FAIL')}>Fail / Dispose</button><button className="primary" disabled={busy===l.id} onClick={()=>act(l.id,'PASS')}>{busy===l.id?'Saving…':'PASS → Move to -20°F'}</button></div></div>)}</div>
 <p className="helper">PASS transfers the released quantity into saleable -20°F inventory. FAIL removes the held lot and records disposal.</p></section>
}
