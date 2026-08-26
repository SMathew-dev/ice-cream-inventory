'use client';

import { useMemo, useState } from 'react';
import { ConnectionBadge } from './ConnectionBadge';
import { CustomerOrderPanel } from './CustomerOrderPanel';
import { DairyBarCart } from './DairyBarCart';
import { HardCountCard } from './HardCountCard';
import { ProductionPanel } from './ProductionPanel';
import { useInventoryActions } from '../lib/hooks/useInventoryActions';
import { useInventoryData } from '../lib/hooks/useInventoryData';

type Screen='dashboard'|'orders'|'production'|'dairy'|'count'|'storefront';

export function OperatorApp(){
  const {inventory,mode,loading,error,refresh}=useInventoryData();
  const actions=useInventoryActions(refresh);
  const [screen,setScreen]=useState<Screen>('dashboard');

  const totals=useMemo(()=>inventory.reduce((a,x)=>({
    onHand:a.onHand+x.onHand,reserved:a.reserved+x.reserved,available:a.available+x.available,hold:a.hold+x.labHold,storefront:a.storefront+x.storefront
  }),{onHand:0,reserved:0,available:0,hold:0,storefront:0}),[inventory]);

  const low=inventory.filter(x=>x.available<=Math.max(3,Math.ceil(x.onHand*.25)));

  const title={dashboard:'Inventory Control',orders:'Customer Orders',production:'Production & Lab Hold',dairy:'Dairy Bar',count:'Hard Count / Fix Number',storefront:'Storefront Inventory'}[screen];

  return <main className="shell">
    <aside className="sidebar">
      <div className="brand">ICE CREAM<br/><span>INVENTORY</span></div>
      <nav>
        {([['dashboard','Dashboard'],['orders','Customer Orders'],['production','Production / Lab'],['dairy','Dairy Bar'],['count','Hard Count'],['storefront','Storefront']] as const).map(([key,label])=><button key={key} className={screen===key?'active':''} onClick={()=>setScreen(key)}>{label}</button>)}
      </nav>
      <div className="sidebar-note">Product identity:<strong> Julian · flavor · package</strong></div>
    </aside>

    <section className="content">
      <header className="topbar"><div><p className="eyebrow">DAIRY PLANT</p><h1>{title}</h1></div><div className="temp-pills"><ConnectionBadge mode={mode}/><span>-20°F SALEABLE</span><span>-40°F LAB HOLD</span></div></header>
      {loading&&<div className="notice">Loading inventory…</div>}
      {error&&<div className="notice">Database connection problem: {error}</div>}
      {actions.message&&<div className="notice" onClick={actions.clearMessage}>{actions.message}<span>×</span></div>}

      {screen==='dashboard'&&<>
        <div className="metrics">
          <Metric label="Available" value={totals.available} sub="can be ordered"/>
          <Metric label="Reserved" value={totals.reserved} sub="waiting to pull"/>
          <Metric label="Lab hold" value={totals.hold} sub="-40°F pending"/>
          <Metric label="Storefront" value={totals.storefront} sub="not for sale"/>
        </div>
        <section className="card inventory-card"><div className="card-head"><div><p className="eyebrow">LIVE INVENTORY</p><h2>Saleable stock</h2></div><button onClick={()=>void refresh()}>Refresh</button></div><InventoryTable inventory={inventory}/></section>
        <section className="card"><div className="card-head"><div><p className="eyebrow">ATTENTION</p><h2>Running low</h2></div></div>{low.length===0?<div className="empty">No low-stock items.</div>:<div className="alert-list">{low.map(x=><div className="alert-row" key={x.productId}><div><strong>{x.flavor} · {x.packageSize==='3_GALLON'?'3 gal':'48 oz'}</strong><small>{x.available} available · {x.labHold} in lab hold</small></div><b>LOW</b></div>)}</div>}</section>
      </>}

      {screen==='orders'&&<CustomerOrderPanel inventory={inventory} onChanged={refresh}/>} 
      {screen==='production'&&<ProductionPanel inventory={inventory} onChanged={refresh}/>} 
      {screen==='dairy'&&<DairyBarCart inventory={inventory} onSubmit={actions.withdrawDairyBar}/>} 
      {screen==='count'&&<HardCountCard inventory={inventory} onApply={actions.reconcileCount}/>} 
      {screen==='storefront'&&<section className="card inventory-card"><div className="card-head"><div><p className="eyebrow">NOT FOR SALE</p><h2>Storefront / imperfect product</h2></div></div><div className="table"><div className="tr th"><span>Flavor</span><span>Package</span><span>Storefront</span><span>Saleable</span><span>Status</span></div>{inventory.map(x=><div className="tr" key={x.productId}><span>{x.flavor}</span><span>{x.packageSize==='3_GALLON'?'3 gal':'48 oz'}</span><span><b>{x.storefront}</b></span><span>{x.available}</span><span className="status">STORE</span></div>)}</div></section>}
    </section>
  </main>;
}

function Metric({label,value,sub}:{label:string;value:number;sub:string}){return <div className="metric"><span>{label}</span><strong>{value}</strong><small>{sub}</small></div>}

function InventoryTable({inventory}:{inventory:ReturnType<typeof useInventoryData>['inventory']}){
  return <div className="table"><div className="tr th"><span>Flavor</span><span>Package</span><span>Available</span><span>Reserved</span><span>Lab hold</span></div>{inventory.map(x=><div className="tr" key={x.productId}><span><b>{x.flavor}</b></span><span>{x.packageSize==='3_GALLON'?'3 gal':'48 oz'}</span><span><b>{x.available}</b><small> / {x.onHand} on hand</small></span><span>{x.reserved}</span><span>{x.labHold}</span></div>)}</div>
}
