'use client';

export type PickStep={placementId:string;julian:number;quantity:number;wall:string;shelf:string;position:number;positionLabel:string};

export function PickPlan({title,steps}:{title:string;steps:PickStep[]}){
 return <section className="card"><div className="card-head"><div><p className="eyebrow">PULL THESE FIRST</p><h2>{title}</h2></div></div>
 <div className="pick-plan">{steps.length===0?<div className="empty">No pick plan needed.</div>:steps.map((s,i)=><div className="pick-step" key={`${s.placementId}-${i}`}><span className="pick-number">{i+1}</span><div><strong>Julian {s.julian} · Pull {s.quantity}</strong><small>{s.wall} Wall · {s.shelf} Shelf · Position {s.position}</small></div></div>)}</div>
 <p className="helper">Oldest released Julian is recommended first. Completing the withdrawal reduces these exact freezer stacks automatically.</p></section>
}
