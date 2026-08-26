'use client';

import { useMemo, useState } from 'react';

type Flavor = {
  name: string;
  code: string;
  color: string;
  threeGallon: number;
  fortyEightOz: number;
  reserved3g: number;
  reserved48: number;
  hold3g: number;
  hold48: number;
  lowThreshold3g: number;
  lowThreshold48: number;
};

type OrderLine = { flavor: string; size: '3 gal' | '48 oz'; qty: number };

type Order = {
  id: string;
  customer: string;
  status: 'Reserved' | 'Completed';
  lines: OrderLine[];
};

const initialFlavors: Flavor[] = [
  { name: 'Vanilla', code: 'VAN', color: '#f6d77a', threeGallon: 34, fortyEightOz: 52, reserved3g: 4, reserved48: 6, hold3g: 12, hold48: 24, lowThreshold3g: 10, lowThreshold48: 18 },
  { name: 'Chocolate', code: 'CHO', color: '#9a633f', threeGallon: 21, fortyEightOz: 36, reserved3g: 2, reserved48: 0, hold3g: 0, hold48: 12, lowThreshold3g: 10, lowThreshold48: 18 },
  { name: 'Strawberry', code: 'STR', color: '#f18aa6', threeGallon: 11, fortyEightOz: 20, reserved3g: 1, reserved48: 4, hold3g: 8, hold48: 0, lowThreshold3g: 10, lowThreshold48: 18 },
  { name: 'Cookies & Cream', code: 'CNC', color: '#b7bcc4', threeGallon: 18, fortyEightOz: 28, reserved3g: 0, reserved48: 0, hold3g: 0, hold48: 0, lowThreshold3g: 8, lowThreshold48: 14 },
  { name: 'Mint Chip', code: 'MNT', color: '#86d8b6', threeGallon: 7, fortyEightOz: 16, reserved3g: 0, reserved48: 2, hold3g: 6, hold48: 0, lowThreshold3g: 8, lowThreshold48: 14 },
  { name: 'Butter Pecan', code: 'BPC', color: '#e9b86e', threeGallon: 6, fortyEightOz: 10, reserved3g: 1, reserved48: 0, hold3g: 0, hold48: 0, lowThreshold3g: 8, lowThreshold48: 14 }
];

const wallShelves = [
  { wall: 'Back Wall', shelves: [['Vanilla', 'Chocolate', 'Strawberry'], ['Cookies & Cream', 'Vanilla'], ['Chocolate', 'Mint Chip']] },
  { wall: 'Left Wall', shelves: [['Vanilla', 'Cookies & Cream'], ['Strawberry', 'Chocolate'], ['Butter Pecan', 'Vanilla']] },
  { wall: 'Right Wall', shelves: [['Chocolate', 'Mint Chip'], ['Vanilla', 'Butter Pecan'], ['Cookies & Cream', 'Strawberry']] },
  { wall: 'Entrance Wall', shelves: [['Vanilla', 'Chocolate'], ['Strawberry', 'Cookies & Cream'], ['Mint Chip', 'Butter Pecan']] }
];

export default function Home() {
  const [flavors, setFlavors] = useState(initialFlavors);
  const [active, setActive] = useState<'dashboard' | 'map' | 'orders' | 'production'>('dashboard');
  const [customer, setCustomer] = useState('');
  const [selectedFlavor, setSelectedFlavor] = useState('Vanilla');
  const [size, setSize] = useState<'3 gal' | '48 oz'>('3 gal');
  const [qty, setQty] = useState(1);
  const [orders, setOrders] = useState<Order[]>([]);
  const [notice, setNotice] = useState('');

  const totals = useMemo(() => {
    return flavors.reduce((acc, f) => {
      acc.saleable += f.threeGallon + f.fortyEightOz;
      acc.reserved += f.reserved3g + f.reserved48;
      acc.hold += f.hold3g + f.hold48;
      return acc;
    }, { saleable: 0, reserved: 0, hold: 0 });
  }, [flavors]);

  const lowStock = flavors.filter(f => (f.threeGallon - f.reserved3g) <= f.lowThreshold3g || (f.fortyEightOz - f.reserved48) <= f.lowThreshold48);

  const reserveOrder = () => {
    const index = flavors.findIndex(f => f.name === selectedFlavor);
    const item = flavors[index];
    const available = size === '3 gal' ? item.threeGallon - item.reserved3g : item.fortyEightOz - item.reserved48;
    if (!customer.trim()) return setNotice('Enter a customer name first.');
    if (qty < 1 || qty > available) return setNotice(`Only ${available} ${size} available for ${selectedFlavor}.`);

    const next = [...flavors];
    next[index] = size === '3 gal'
      ? { ...item, reserved3g: item.reserved3g + qty }
      : { ...item, reserved48: item.reserved48 + qty };
    setFlavors(next);
    const order: Order = { id: `ORD-${String(orders.length + 1).padStart(3, '0')}`, customer: customer.trim(), status: 'Reserved', lines: [{ flavor: selectedFlavor, size, qty }] };
    setOrders([order, ...orders]);
    setCustomer('');
    setQty(1);
    setNotice(`${order.id} reserved. Inventory will deduct when the order is completed.`);
  };

  const completeOrder = (id: string) => {
    const order = orders.find(o => o.id === id);
    if (!order || order.status === 'Completed') return;
    const line = order.lines[0];
    setFlavors(current => current.map(f => {
      if (f.name !== line.flavor) return f;
      if (line.size === '3 gal') return { ...f, threeGallon: f.threeGallon - line.qty, reserved3g: f.reserved3g - line.qty };
      return { ...f, fortyEightOz: f.fortyEightOz - line.qty, reserved48: f.reserved48 - line.qty };
    }));
    setOrders(current => current.map(o => o.id === id ? { ...o, status: 'Completed' } : o));
    setNotice(`${id} completed. Physical inventory was deducted automatically.`);
  };

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand">ICE CREAM<br /><span>INVENTORY</span></div>
        <nav>
          <button className={active === 'dashboard' ? 'active' : ''} onClick={() => setActive('dashboard')}>Dashboard</button>
          <button className={active === 'map' ? 'active' : ''} onClick={() => setActive('map')}>Freezer Map</button>
          <button className={active === 'orders' ? 'active' : ''} onClick={() => setActive('orders')}>Customer Orders</button>
          <button className={active === 'production' ? 'active' : ''} onClick={() => setActive('production')}>Production / Lab</button>
        </nav>
        <div className="sidebar-note">Simple rule:<strong> record the movement, not the math.</strong></div>
      </aside>

      <section className="content">
        <header className="topbar">
          <div><p className="eyebrow">SDSU DAIRY PLANT</p><h1>{active === 'map' ? 'Freezer Map' : active === 'orders' ? 'Customer Orders' : active === 'production' ? 'Production & Lab Hold' : 'Inventory Control'}</h1></div>
          <div className="temp-pills"><span>-20°F SALEABLE</span><span>-40°F LAB HOLD</span></div>
        </header>

        {notice && <div className="notice" onClick={() => setNotice('')}>{notice}<span>×</span></div>}

        {active === 'dashboard' && <>
          <div className="metrics">
            <Metric label="Saleable on hand" value={totals.saleable} sub="-20°F freezer" />
            <Metric label="Reserved" value={totals.reserved} sub="customer + Dairy Bar" />
            <Metric label="Lab hold" value={totals.hold} sub="-40°F freezer" />
            <Metric label="Low-stock flavors" value={lowStock.length} sub="needs attention" warn={lowStock.length > 0} />
          </div>
          <div className="grid2">
            <section className="card">
              <div className="card-head"><div><p className="eyebrow">FAST WORKFLOW</p><h2>New customer order</h2></div><span className="step">~15 sec</span></div>
              <OrderForm customer={customer} setCustomer={setCustomer} selectedFlavor={selectedFlavor} setSelectedFlavor={setSelectedFlavor} size={size} setSize={setSize} qty={qty} setQty={setQty} flavors={flavors} reserveOrder={reserveOrder} />
            </section>
            <section className="card">
              <div className="card-head"><div><p className="eyebrow">ATTENTION</p><h2>Low stock</h2></div></div>
              <div className="alert-list">{lowStock.map(f => <div className="alert-row" key={f.name}><span className="flavor-dot" style={{ background: f.color }} /><div><strong>{f.name}</strong><small>{f.threeGallon - f.reserved3g} × 3 gal available · {f.fortyEightOz - f.reserved48} × 48 oz available</small></div><b>LOW</b></div>)}</div>
            </section>
          </div>
          <section className="card inventory-card"><div className="card-head"><div><p className="eyebrow">LIVE INVENTORY</p><h2>Available stock</h2></div></div><InventoryTable flavors={flavors} /></section>
        </>}

        {active === 'orders' && <div className="grid2">
          <section className="card"><div className="card-head"><div><p className="eyebrow">PHONE ORDER</p><h2>Reserve inventory</h2></div></div><OrderForm customer={customer} setCustomer={setCustomer} selectedFlavor={selectedFlavor} setSelectedFlavor={setSelectedFlavor} size={size} setSize={setSize} qty={qty} setQty={setQty} flavors={flavors} reserveOrder={reserveOrder} /></section>
          <section className="card"><div className="card-head"><div><p className="eyebrow">PICK QUEUE</p><h2>Orders to pull</h2></div></div>{orders.length === 0 ? <div className="empty">No orders yet.</div> : orders.map(o => <div className="order-row" key={o.id}><div><strong>{o.id} · {o.customer}</strong><small>{o.lines[0].qty} × {o.lines[0].flavor} · {o.lines[0].size}</small></div>{o.status === 'Reserved' ? <button className="complete" onClick={() => completeOrder(o.id)}>Complete / Pulled</button> : <span className="done">Completed</span>}</div>)}</section>
        </div>}

        {active === 'map' && <section className="room-wrap">
          <div className="room-title"><p className="eyebrow">-20°F · 3 GALLON</p><h2>Four-wall freezer map</h2><p>Each wall has three shelf levels. Multiple flavors can share the same shelf, and tubs may be stacked upward.</p></div>
          <div className="room">
            {wallShelves.map(w => <Wall key={w.wall} wall={w.wall} shelves={w.shelves} flavors={flavors} />)}
            <div className="walkway"><span>WALKWAY</span></div>
            <div className="door">ENTRANCE DOOR</div>
          </div>
        </section>}

        {active === 'production' && <div className="grid2">
          <section className="card"><div className="card-head"><div><p className="eyebrow">PROCESSING DAY</p><h2>Add production to -40°F</h2></div></div><div className="process-flow"><div><b>1</b><span>Enter produced flavor + quantity</span></div><div><b>2</b><span>System adds lot to -40°F LAB HOLD</span></div><div><b>3</b><span>Lab PASS → transfer to -20°F automatically</span></div><div><b>4</b><span>Lab FAIL → disposal transaction, no saleable stock</span></div></div></section>
          <section className="card"><div className="card-head"><div><p className="eyebrow">CURRENT HOLD</p><h2>Waiting for lab release</h2></div></div>{flavors.filter(f => f.hold3g + f.hold48 > 0).map(f => <div className="hold-row" key={f.name}><span className="flavor-dot" style={{background:f.color}}/><div><strong>{f.name}</strong><small>{f.hold3g} × 3 gal · {f.hold48} × 48 oz</small></div><span className="pending">PENDING</span></div>)}</section>
        </div>}
      </section>
    </main>
  );
}

function Metric({ label, value, sub, warn = false }: { label: string; value: number; sub: string; warn?: boolean }) {
  return <div className={`metric ${warn ? 'metric-warn' : ''}`}><span>{label}</span><strong>{value}</strong><small>{sub}</small></div>;
}

function OrderForm(props: any) {
  const { customer, setCustomer, selectedFlavor, setSelectedFlavor, size, setSize, qty, setQty, flavors, reserveOrder } = props;
  const f = flavors.find((x: Flavor) => x.name === selectedFlavor);
  const available = size === '3 gal' ? f.threeGallon - f.reserved3g : f.fortyEightOz - f.reserved48;
  return <div className="form">
    <label>Customer<input placeholder="Customer name" value={customer} onChange={e => setCustomer(e.target.value)} /></label>
    <div className="form-row"><label>Flavor<select value={selectedFlavor} onChange={e => setSelectedFlavor(e.target.value)}>{flavors.map((x: Flavor) => <option key={x.name}>{x.name}</option>)}</select></label><label>Package<select value={size} onChange={e => setSize(e.target.value)}><option>3 gal</option><option>48 oz</option></select></label></div>
    <div className="qty-row"><div><span>Available now</span><strong>{available}</strong></div><label>Quantity<input type="number" min="1" max={available} value={qty} onChange={e => setQty(Number(e.target.value))}/></label></div>
    <button className="primary" onClick={reserveOrder}>Reserve Order</button>
    <p className="helper">Reservation reduces <b>available</b> stock now. Physical on-hand is deducted only when the order is pulled/completed.</p>
  </div>;
}

function InventoryTable({ flavors }: { flavors: Flavor[] }) {
  return <div className="table"><div className="tr th"><span>Flavor</span><span>3 gal</span><span>48 oz</span><span>Reserved</span><span>Status</span></div>{flavors.map(f => {
    const a3 = f.threeGallon - f.reserved3g; const a48 = f.fortyEightOz - f.reserved48; const low = a3 <= f.lowThreshold3g || a48 <= f.lowThreshold48;
    return <div className="tr" key={f.name}><span className="flavor-cell"><i style={{background:f.color}} />{f.name}</span><span><b>{a3}</b><small> / {f.threeGallon} on hand</small></span><span><b>{a48}</b><small> / {f.fortyEightOz} on hand</small></span><span>{f.reserved3g + f.reserved48}</span><span className={low ? 'status low' : 'status healthy'}>{low ? 'Low' : 'Healthy'}</span></div>})}</div>;
}

function Wall({ wall, shelves, flavors }: { wall: string; shelves: string[][]; flavors: Flavor[] }) {
  return <div className={`wall wall-${wall.split(' ')[0].toLowerCase()}`}><h3>{wall}</h3>{shelves.map((shelf, idx) => <div className="shelf" key={idx}><span className="shelf-label">{idx === 0 ? 'TOP' : idx === 1 ? 'MIDDLE' : 'BOTTOM'}</span><div className="stacks">{shelf.map(name => { const f = flavors.find(x => x.name === name)!; return <div className="stack" key={name} style={{'--flavor': f.color} as React.CSSProperties}><b>{f.code}</b><span>{Math.max(1, Math.round((f.threeGallon - f.reserved3g) / 2))}</span></div>})}</div></div>)}</div>;
}
