'use client';
import { useMemo, useState } from 'react';
import type { FreezerPlacement } from '../lib/db/contracts';

const wallOrder=['BACK','RIGHT','ENTRANCE','LEFT'] as const;
const shelfOrder=['TOP','MIDDLE','BOTTOM'] as const;

export function FreezerMapPanel({placements}:{placements:FreezerPlacement[]}){
 const [freezer,setFreezer]=useState<'-20°F'|'-40°F'>('-20°F');
 const [search,setSearch]=useState('');
 const visible=useMemo(()=>placements.filter(p=>p.freezer===freezer&&(!search.trim()||p.flavor.toLowerCase().includes(search.toLowerCase()))),[placements,freezer,search]);
 return <section className="card"><div className="card-head"><div><p className="eyebrow">PHYSICAL LOCATION</p><h2>Freezer Map</h2></div><div className="map-controls"><button className={freezer==='-20°F'?'active':''} onClick={()=>setFreezer('-20°F')}>-20°F</button><button className={freezer==='-40°F'?'active':''} onClick={()=>setFreezer('-40°F')}>-40°F</button></div></div>
 <div className="form"><label>Find flavor<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Vanilla, Chocolate…"/></label></div>
 <div className="freezer-room-grid">{wallOrder.map(w=><div className={`freezer-wall wall-${w.toLowerCase()}`} key={w}><h3>{w==='ENTRANCE'?'Entrance Wall':`${w[0]+w.slice(1).toLowerCase()} Wall`}</h3>{shelfOrder.map(s=>{const stacks=visible.filter(p=>p.wall===w&&p.shelf===s);return <div className="shelf-row" key={s}><span className="shelf-name">{s}</span><div className="shelf-stacks">{stacks.length===0?<span className="empty-slot">Empty</span>:stacks.map(p=><div className="stack-card" key={p.id}><b>{p.flavor}</b><small>Julian {p.julian} · {p.packageSize==='3_GALLON'?'3 gal':'48 oz'}</small><strong>{p.quantity}</strong><small>{p.positionLabel}</small></div>)}</div></div>})}{w==='ENTRANCE'&&<div className="door-gap">DOOR</div>}</div>)}</div>
 <p className="helper">Shelves are permanent locations. Flavors and quantities are dynamic and may share the same shelf.</p></section>
}
