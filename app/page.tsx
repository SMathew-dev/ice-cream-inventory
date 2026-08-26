'use client';

import { useMemo, useState } from 'react';

type Size = '3 gal' | '48 oz';
type Flavor = {
  name: string; code: string; color: string;
  threeGallon: number; fortyEightOz: number;
  reserved3g: number; reserved48: number;
  hold3g: number; hold48: number;
  storefront3g: number; storefront48: number;
  lowThreshold3g: number; lowThreshold48: number;
};
type Order = { id: string; customer: string; flavor: string; size: Size; qty: number; status: 'Reserved' | 'Completed' };
type ProductionRun = { id: string; julian: string; flavor: string; size: Size; goodQty: number; storefrontQty: number; status: 'Pending' | 'Passed' | 'Failed' };

const initialFlavors: Flavor[] = [
  { name:'Vanilla', code:'VAN', color:'#f6d77a', threeGallon:34, fortyEightOz:52, reserved3g:4, reserved48:6, hold3g:12, hold48:24, storefront3g:3, storefront48:5, lowThreshold3g:10, lowThreshold48:18 },
  { name:'Chocolate', code:'CHO', color:'#9a633f', threeGallon:21, fortyEightOz:36, reserved3g:2, reserved48:0, hold3g:0, hold48:12, storefront3g:1, storefront48:2, lowThreshold3g:10, lowThreshold48:18 },
  { name:'Strawberry', code:'STR', color:'#f18aa6', threeGallon:11, fortyEightOz:20, reserved3g:1, reserved48:4, hold3g:8, hold48:0, storefront3g:2, storefront48:1, lowThreshold3g:10, lowThreshold48:18 },
  { name:'Cookies & Cream', code:'CNC', color:'#b7bcc4', threeGallon:18, fortyEightOz:28, reserved3g:0, reserved48:0, hold3g:0, hold48:0, storefront3g:0, storefront48:2, lowThreshold3g:8, lowThreshold48:14 },
  { name:'Mint Chip', code:'MNT', color:'#86d8b6', threeGallon:7, fortyEightOz:16, reserved3g:0, reserved48:2, hold3g:6, hold48:0, storefront3g:1, storefront48:0, lowThreshold3g:8, lowThreshold48:14 },
  { name:'Butter Pecan', code:'BPC', color:'#e9b86e', threeGallon:6, fortyEightOz:10, reserved3g:1, reserved48:0, hold3g:0, hold48:0, storefront3g:0, storefront48:1, lowThreshold3g:8, lowThreshold48:14 }
];

const wallShelves = [
  { wall:'Back Wall', shelves:[['Vanilla','Chocolate','Strawberry'],['Cookies & Cream','Vanilla'],['Chocolate','Mint Chip']] },
  { wall:'Left Wall', shelves:[['Vanilla','Cookies & Cream'],['Strawberry','Chocolate'],['Butter Pecan','Vanilla']] },
  { wall:'Right Wall', shelves:[['Chocolate','Mint Chip'],['Vanilla','Butter Pecan'],['Cookies & Cream','Strawberry']] },
  { wall:'Entrance Wall', shelves:[['Vanilla','Chocolate'],['Strawberry','Cookies & Cream'],['Mint Chip','Butter Pecan']] }
];

export default function Home() {
  const [flavors,setFlavors] = useState(initialFlavors);
  const [active,setActive] = useState<'dashboard'|'map'|'orders'|'production'|'storefront'>('dashboard');
  const [customer,setCustomer] = useState('');
  const [selectedFlavor,setSelectedFlavor] = useState('Vanilla');
  const [size,setSize] = useState<Size>('3 gal');
  const [qty,setQty] = useState(1);
  const [orders,setOrders] = useState<Order[]>([]);
  const [runs,setRuns] = useState<ProductionRun[]>([]);
  const [julian,setJulian] = useState('');
  const [prodFlavor,setProdFlavor] = useState('Vanilla');
  const [prodSize,setProdSize] = useState<Size>('3 gal');
  const [prodQty,setProdQty] = useState(1);
  const [storefrontQty,setStorefrontQty] = useState(0);
  const [notice,setNotice] = useState('');

  const totals = useMemo(() => flavors.reduce((a,f)=>({
    saleable:a.saleable+f.threeGallon+f.fortyEightOz,
    reserved:a.reserved+f.reserved3g+f.reserved48,
    hold:a.hold+f.hold3g+f.hold48,
    storefront:a.storefront+f.storefront3g+f.storefront48
  }),{saleable:0,reserved:0,hold:0,storefront:0}),[flavors]);

  const lowStock = flavors.filter(f => f.threeGallon-f.reserved3g<=f.lowThreshold3g || f.fortyEightOz-f.reserved48<=f.lowThreshold48);

  function reserveOrder(){
    const i=flavors.findIndex(f=>f.name===selectedFlavor); const f=flavors[i];
    const available=size==='3 gal'?f.threeGallon-f.reserved3g:f.fortyEightOz-f.reserved48;
    if(!customer.trim()) return setNotice('Enter a customer name first.');
    if(qty<1||qty>available) return setNotice(`Only ${available} ${size} available for ${selectedFlavor}.`);
    const next=[...flavors]; next[i]=size==='3 gal'?{...f,reserved3g:f.reserved3g+qty}:{...f,reserved48:f.reserved48+qty}; setFlavors(next);
    const id=`ORD-${String(orders.length+1).padStart(3,'0')}`; setOrders([{id,customer:customer.trim(),flavor:selectedFlavor,size,qty,status:'Reserved'},...orders]);
    setCustomer(''); setQty(1); setNotice(`${id} reserved. Stock deducts when pulled.`);
  }

  function completeOrder(id:string){
    const o=orders.find(x=>x.id===id); if(!o||o.status==='Completed') return;
    setFlavors(cur=>cur.map(f=>f.name!==o.flavor?f:o.size==='3 gal'?{...f,threeGallon:f.threeGallon-o.qty,reserved3g:f.reserved3g-o.qty}:{...f,fortyEightOz:f.fortyEightOz-o.qty,reserved48:f.reserved48-o.qty}));
    setOrders(cur=>cur.map(x=>x.id===id?{...x,status:'Completed'}:x)); setNotice(`${id} completed. Inventory deducted automatically.`);
  }

  function addProduction(){
    if(!julian.trim()) return setNotice('Enter the Julian date.');
    if(prodQty<1||storefrontQty<0||storefrontQty>prodQty) return setNotice('Check produced and storefront quantities.');
    const goodQty=prodQty-storefrontQty; const id=`RUN-${julian}-${String(runs.length+1).padStart(2,'0')}`;
    setRuns([{id,julian:julian.trim(),flavor:prodFlavor,size:prodSize,goodQty,storefrontQty,status:'Pending'},...runs]);
    setFlavors(cur=>cur.map(f=>f.name!==prodFlavor?f:prodSize==='3 gal'?{...f,hold3g:f.hold3g+goodQty,storefront3g:f.storefront3g+storefrontQty}:{...f,hold48:f.hold48+goodQty,storefront48:f.storefront48+storefrontQty}));
    setProdQty(1); setStorefrontQty(0); setNotice(`${id} added: ${goodQty} good to -40°F hold, ${storefrontQty} storefront.`);
  }

  function releaseRun(id:string,pass:boolean){
    const r=runs.find(x=>x.id===id); if(!r||r.status!=='Pending') return;
    setFlavors(cur=>cur.map(f=>f.name!==r.flavor?f:r.size==='3 gal'?{...f,hold3g:f.hold3g-r.goodQty,threeGallon:f.threeGallon+(pass?r.goodQty:0)}:{...f,hold48:f.hold48-r.goodQty,fortyEightOz:f.fortyEightOz+(pass?r.goodQty:0)}));
    setRuns(cur=>cur.map(x=>x.id===id?{...x,status:pass?'Passed':'Failed'}:x)); setNotice(pass?`${id} passed. Good product moved to -20°F.`:`${id} failed. Good-production hold removed as disposal.`);
  }

  return <main className="shell">
    <aside className="sidebar"><div className="brand">ICE CREAM<br/><span>INVENTORY</span></div><nav>
      {([['dashboard','Dashboard'],['map','Freezer Map'],['orders','Customer Orders'],['production','Production / Lab'],['storefront','Storefront']] as const).map(([k,l])=><button key={k} className={active===k?'active':''} onClick={()=>setActive(k)}>{l}</button>)}
    </nav><div className="sidebar-note">Product identity:<strong> Julian date · flavor · package</strong></div></aside>
    <section className="content"><header className="topbar"><div><p className="eyebrow">SDSU DAIRY PLANT</p><h1>{active==='storefront'?'Storefront Inventory':active==='production'?'Production & Lab Hold':active==='orders'?'Customer Orders':active==='map'?'Freezer Map':'Inventory Control'}</h1></div><div className="temp-pills"><span>-20°F SALEABLE</span><span>-40°F LAB HOLD</span></div></header>
    {notice&&<div className="notice" onClick={()=>setNotice('')}>{notice}<span>×</span></div>}

    {active==='dashboard'&&<><div className="metrics"><Metric label="Saleable" value={totals.saleable} sub="-20°F"/><Metric label="Reserved" value={totals.reserved} sub="orders"/><Metric label="Lab hold" value={totals.hold} sub="-40°F"/><Metric label="Storefront" value={totals.storefront} sub="not for sale"/></div><section className="card inventory-card"><div className="card-head"><div><p className="eyebrow">LIVE INVENTORY</p><h2>Available stock</h2></div></div><InventoryTable flavors={flavors}/></section><section className="card"><div className="card-head"><div><p className="eyebrow">WARNINGS</p><h2>Low stock</h2></div></div><div className="alert-list">{lowStock.map(f=><div className="alert-row" key={f.name}><span className="flavor-dot" style={{background:f.color}}/><div><strong>{f.name}</strong><small>{f.threeGallon-f.reserved3g} × 3 gal · {f.fortyEightOz-f.reserved48} × 48 oz available</small></div><b>LOW</b></div>)}</div></section></>}

    {active==='orders'&&<div className="grid2"><section className="card"><div className="card-head"><div><p className="eyebrow">PHONE ORDER</p><h2>Reserve inventory</h2></div></div><div className="form"><label>Customer<input value={customer} onChange={e=>setCustomer(e.target.value)} placeholder="Customer name"/></label><div className="form-row"><label>Flavor<select value={selectedFlavor} onChange={e=>setSelectedFlavor(e.target.value)}>{flavors.map(f=><option key={f.name}>{f.name}</option>)}</select></label><label>Package<select value={size} onChange={e=>setSize(e.target.value as Size)}><option>3 gal</option><option>48 oz</option></select></label></div><label>Quantity<input type="number" min="1" value={qty} onChange={e=>setQty(Number(e.target.value))}/></label><button className="primary" onClick={reserveOrder}>Reserve Order</button></div></section><section className="card"><div className="card-head"><div><p className="eyebrow">PICK QUEUE</p><h2>Orders to pull</h2></div></div>{orders.length===0?<div className="empty">No orders yet.</div>:orders.map(o=><div className="order-row" key={o.id}><div><strong>{o.id} · {o.customer}</strong><small>{o.qty} × {o.flavor} · {o.size}</small></div>{o.status==='Reserved'?<button className="complete" onClick={()=>completeOrder(o.id)}>Complete / Pulled</button>:<span className="done">Completed</span>}</div>)}</section></div>}

    {active==='production'&&<div className="grid2"><section className="card"><div className="card-head"><div><p className="eyebrow">PROCESSING DAY</p><h2>Add production</h2></div></div><div className="form"><label>Julian date<input value={julian} onChange={e=>setJulian(e.target.value)} placeholder="e.g. 238"/></label><div className="form-row"><label>Flavor<select value={prodFlavor} onChange={e=>setProdFlavor(e.target.value)}>{flavors.map(f=><option key={f.name}>{f.name}</option>)}</select></label><label>Package<select value={prodSize} onChange={e=>setProdSize(e.target.value as Size)}><option>3 gal</option><option>48 oz</option></select></label></div><div className="form-row"><label>Total produced<input type="number" min="1" value={prodQty} onChange={e=>setProdQty(Number(e.target.value))}/></label><label>Storefront / imperfect<input type="number" min="0" value={storefrontQty} onChange={e=>setStorefrontQty(Number(e.target.value))}/></label></div><button className="primary" onClick={addProduction}>Add Production</button><p className="helper">Good units go to -40°F lab hold. Storefront units are tracked separately and are never saleable.</p></div></section><section className="card"><div className="card-head"><div><p className="eyebrow">LAB QUEUE</p><h2>Waiting for release</h2></div></div>{runs.length===0?<div className="empty">No runs entered yet.</div>:runs.map(r=><div className="order-row" key={r.id}><div><strong>{r.julian} · {r.flavor} · {r.size}</strong><small>{r.goodQty} good · {r.storefrontQty} storefront</small></div>{r.status==='Pending'?<div><button className="complete" onClick={()=>releaseRun(r.id,true)}>PASS</button> <button onClick={()=>releaseRun(r.id,false)}>FAIL</button></div>:<span className="done">{r.status}</span>}</div>)}</section></div>}

    {active==='storefront'&&<section className="card inventory-card"><div className="card-head"><div><p className="eyebrow">NOT FOR SALE</p><h2>Storefront / imperfect product</h2><p>Cosmetically imperfect tubs kept for storefront use, samples, display, or internal use.</p></div></div><div className="table"><div className="tr th"><span>Flavor</span><span>3 gal</span><span>48 oz</span><span>Total</span><span>Status</span></div>{flavors.map(f=><div className="tr" key={f.name}><span className="flavor-cell"><i style={{background:f.color}}/>{f.name}</span><span><b>{f.storefront3g}</b></span><span><b>{f.storefront48}</b></span><span>{f.storefront3g+f.storefront48}</span><span className="status">STORE</span></div>)}</div></section>}

    {active==='map'&&<section className="room-wrap"><div className="room-title"><p className="eyebrow">-20°F · 3 GALLON</p><h2>Four-wall freezer map</h2><p>Each wall has three shelf levels; multiple flavors may share one shelf.</p></div><div className="room">{wallShelves.map(w=><Wall key={w.wall} wall={w.wall} shelves={w.shelves} flavors={flavors}/>)}<div className="walkway"><span>WALKWAY</span></div><div className="door">ENTRANCE DOOR</div></div></section>}
    </section>
  </main>;
}

function Metric({label,value,sub}:{label:string;value:number;sub:string}){return <div className="metric"><span>{label}</span><strong>{value}</strong><small>{sub}</small></div>}
function InventoryTable({flavors}:{flavors:Flavor[]}){return <div className="table"><div className="tr th"><span>Flavor</span><span>3 gal</span><span>48 oz</span><span>Reserved</span><span>Status</span></div>{flavors.map(f=>{const a3=f.threeGallon-f.reserved3g,a48=f.fortyEightOz-f.reserved48,low=a3<=f.lowThreshold3g||a48<=f.lowThreshold48;return <div className="tr" key={f.name}><span className="flavor-cell"><i style={{background:f.color}}/>{f.name}</span><span><b>{a3}</b><small> / {f.threeGallon} on hand</small></span><span><b>{a48}</b><small> / {f.fortyEightOz} on hand</small></span><span>{f.reserved3g+f.reserved48}</span><span className={low?'status low':'status'}>{low?'LOW':'GOOD'}</span></div>})}</div>}
function Wall({wall,shelves,flavors}:{wall:string;shelves:string[][];flavors:Flavor[]}){return <div className={`wall ${wall.toLowerCase().split(' ')[0]}`}><h3>{wall}</h3>{shelves.map((s,i)=><div className="shelf" key={i}><em>{['TOP','MIDDLE','LOWER'][i]}</em><div>{s.map(name=>{const f=flavors.find(x=>x.name===name)!;return <span className="tub" key={name} style={{borderTopColor:f.color}}><b>{f.code}</b><small>{f.threeGallon-f.reserved3g}</small></span>})}</div></div>)}</div>}
