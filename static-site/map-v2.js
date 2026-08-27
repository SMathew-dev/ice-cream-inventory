import { sb, requireSession } from './supabase-client.js';

const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pkg=s=>s==='3_GALLON'?'3 gal':'48 oz';
let activeFreezer='-20°F';
let rendering=false;

function installStyles(){
  if(document.getElementById('mapV2Styles'))return;
  const style=document.createElement('style');
  style.id='mapV2Styles';
  style.textContent=`
    .system-zone{border:1px solid var(--line);border-radius:14px;margin-bottom:16px;overflow:hidden;background:#fff}
    .system-zone.hold-zone{border-color:#fedf89;background:#fffcf5}.system-zone.release-zone{border-color:#abefc6;background:#f6fef9}
    .system-zone-head{display:flex;justify-content:space-between;gap:16px;align-items:center;padding:14px 16px;border-bottom:1px solid var(--line)}
    .hold-zone .system-zone-head{border-bottom-color:#fedf89}.release-zone .system-zone-head{border-bottom-color:#abefc6}
    .system-zone-head strong{font-size:14px;display:block}.system-zone-head small{display:block;color:var(--muted);font-size:10px;margin-top:3px}
    .system-zone-total{font-size:11px;font-weight:850;padding:6px 10px;border-radius:999px;background:#fff}
    .hold-zone .system-zone-total{color:#b54708}.release-zone .system-zone-total{color:#067647}
    .system-stack-grid{padding:12px;display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:9px}
    .system-stack{background:#fff;border:1px solid var(--line);border-radius:11px;padding:12px;display:grid;grid-template-columns:1fr auto;gap:4px 10px;align-items:center}
    .system-stack strong{font-size:12px}.system-stack span{font-size:10px;color:var(--muted)}.system-stack b{grid-column:2;grid-row:1/3;font-size:22px;letter-spacing:-.04em}
    .hold-zone .system-stack b{color:#b54708}.release-zone .system-stack b{color:#067647}
    .map-section-label{font-size:9px;font-weight:850;letter-spacing:.09em;text-transform:uppercase;color:var(--muted);margin:18px 2px 9px}
    @media(max-width:650px){.system-zone-head{align-items:flex-start;flex-direction:column}.system-stack-grid{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);
}

function systemZone(rows){
  const isHold=activeFreezer==='-40°F';
  const title=isHold?'HOLD — waiting for State Lab':'NEWLY RELEASED';
  const subtitle=isHold?'Saved production is physically in -40°F and is not saleable.':'Passed State Lab and is now saleable inside the -20°F freezer.';
  const total=rows.reduce((n,x)=>n+Number(x.quantity||0),0);
  const kind=isHold?'hold-zone':'release-zone';
  return `<section class="system-zone ${kind}">
    <div class="system-zone-head"><div><strong>${title}</strong><small>${subtitle}</small></div><span class="system-zone-total">${total} unit${total===1?'':'s'}</span></div>
    <div class="system-stack-grid">${rows.length?rows.map(p=>`<div class="system-stack"><strong>${esc(p.flavor)}</strong><span>${pkg(p.package_size)} · Julian ${p.julian}</span><b>${Number(p.quantity)}</b></div>`).join(''):`<div class="empty">${isHold?'Nothing is on HOLD.':'No newly released product.'}</div>`}</div>
  </section>`;
}

function wallSection(wall,rows){
  const stacks=rows.filter(p=>p.wall===wall);
  const total=stacks.reduce((n,x)=>n+Number(x.quantity||0),0);
  return `<section class="wall"><div class="wall-header"><strong>${wall} WALL</strong><span>${total} units</span></div><div class="wall-body">${stacks.length?stacks.map(p=>`<div class="stack"><div class="stack-flavor">${esc(p.flavor)}</div><div class="stack-meta">${pkg(p.package_size)} · Julian ${p.julian}<br>${p.shelf} · Position ${p.position}</div><div class="stack-qty">${p.quantity}</div></div>`).join(''):'<div class="stack-empty">No product</div>'}</div></section>`;
}

async function renderMap(){
  const host=$('freezerRoom');
  if(!host||rendering)return;
  rendering=true;
  try{
    await requireSession();
    const {data,error}=await sb.from('freezer_placement_view').select('*').order('julian');
    if(error)throw error;
    const all=(data||[]).filter(p=>p.freezer===activeFreezer&&Number(p.quantity)>0);
    const systemPosition=activeFreezer==='-40°F'?998:999;
    const systemRows=all.filter(p=>Number(p.position)===systemPosition);
    const realRows=all.filter(p=>Number(p.position)<900);
    const walls=['BACK','LEFT','RIGHT','ENTRANCE'];
    host.innerHTML=`${systemZone(systemRows)}<div class="map-section-label">Mapped shelf positions</div>${walls.map(w=>wallSection(w,realRows)).join('')}`;
  }catch(error){
    host.innerHTML=`<div class="empty">Could not load freezer map: ${esc(error?.message||'connection error')}</div>`;
  }finally{rendering=false;}
}

function syncTabState(){
  document.querySelectorAll('.freezer-tab').forEach(b=>b.classList.toggle('active',b.dataset.freezer===activeFreezer));
}
function queueRender(){setTimeout(()=>{syncTabState();renderMap();},60);}

installStyles();
document.querySelectorAll('.freezer-tab').forEach(button=>button.addEventListener('click',()=>{activeFreezer=button.dataset.freezer;queueRender();}));
document.querySelectorAll('[data-screen="freezer"],[data-quick="freezer"]').forEach(button=>button.addEventListener('click',queueRender));
$('refreshBtn')?.addEventListener('click',queueRender);
window.addEventListener('icecream:refresh',queueRender);

// If the freezer screen is already open after a cached navigation state, render once.
setTimeout(()=>{if($('freezer')?.classList.contains('active'))renderMap();},250);
