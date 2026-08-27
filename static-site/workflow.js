import { sb, requireSession } from './supabase-client.js';

const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pkg=s=>s==='3_GALLON'?'3 gal':'48 oz';
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));

let catalog=[];
let hold=[];

function showMessage(text,type='info'){
  const host=$('msg');
  if(!host)return;
  host.innerHTML=text?`<div class="notice ${type==='error'?'error':type==='warning'?'warning':''}">${esc(text)}</div>`:'';
}
function setBusy(on,label='Saving…'){
  const overlay=$('loadingOverlay');
  if(!overlay)return;
  $('loadingText').textContent=label;
  overlay.classList.toggle('hidden',!on);
}
function isAuthError(error){
  const text=String(error?.message||error||'').toLowerCase();
  return text.includes('jwt')||text.includes('unauthorized')||text.includes('401')||text.includes('session');
}
async function reliableRpc(name,args){
  await requireSession();
  let result=await sb.rpc(name,args);
  if(result.error&&isAuthError(result.error)){
    // app.js owns token refresh. Give it a moment, then reload the stored session and retry once.
    await wait(1200);
    await requireSession();
    result=await sb.rpc(name,args);
  }
  return result;
}

function uniqueFlavors(){return [...new Set(catalog.map(x=>x.flavor))].sort((a,b)=>a.localeCompare(b));}
function draftKey(flavor,size){return `${flavor}|||${size}`;}
function captureDraft(){
  const draft=new Map();
  document.querySelectorAll('.flavor-production-row').forEach(row=>{
    const flavor=row.dataset.flavor;
    ['3_GALLON','48_OZ'].forEach(size=>draft.set(draftKey(flavor,size),{
      made:row.querySelector(`[data-made="${size}"]`)?.value||'0',
      storefront:row.querySelector(`[data-store="${size}"]`)?.value||'0'
    }));
  });
  return draft;
}
function good(made,store){return Math.max(0,Number(made||0)-Number(store||0));}
function updateGood(row,size){
  const made=row.querySelector(`[data-made="${size}"]`)?.value||0;
  const store=row.querySelector(`[data-store="${size}"]`)?.value||0;
  const out=row.querySelector(`[data-good="${size}"]`);
  if(out)out.textContent=good(made,store);
  row.classList.toggle('has-production',[...row.querySelectorAll('input[type="number"]')].some(i=>Number(i.value)>0));
}
function renderFlavorMatrix(draft=new Map()){
  const host=$('flavorMatrix');
  if(!host)return;
  const query=($('flavorSearch')?.value||'').trim().toLowerCase();
  const flavors=uniqueFlavors().filter(f=>!query||f.toLowerCase().includes(query));
  if(!flavors.length){host.innerHTML='<div class="empty">No flavors match that search.</div>';return;}
  host.innerHTML=flavors.map(flavor=>{
    const d3=draft.get(draftKey(flavor,'3_GALLON'))||{made:'0',storefront:'0'};
    const d48=draft.get(draftKey(flavor,'48_OZ'))||{made:'0',storefront:'0'};
    return `<div class="flavor-production-row" data-flavor="${esc(flavor)}">
      <div class="flavor-cell"><strong>${esc(flavor)}</strong></div>
      <div class="package-group package-3">
        <span class="mobile-package-label">3 gallon</span>
        <input data-made="3_GALLON" type="number" min="0" step="1" value="${esc(d3.made)}" aria-label="${esc(flavor)} 3 gallon made">
        <input data-store="3_GALLON" type="number" min="0" step="1" value="${esc(d3.storefront)}" aria-label="${esc(flavor)} 3 gallon storefront">
        <span class="good-pill"><b data-good="3_GALLON">${good(d3.made,d3.storefront)}</b> good</span>
      </div>
      <div class="package-group package-48">
        <span class="mobile-package-label">48 oz</span>
        <input data-made="48_OZ" type="number" min="0" step="1" value="${esc(d48.made)}" aria-label="${esc(flavor)} 48 oz made">
        <input data-store="48_OZ" type="number" min="0" step="1" value="${esc(d48.storefront)}" aria-label="${esc(flavor)} 48 oz storefront">
        <span class="good-pill"><b data-good="48_OZ">${good(d48.made,d48.storefront)}</b> good</span>
      </div>
    </div>`;
  }).join('');
  host.querySelectorAll('.flavor-production-row').forEach(row=>['3_GALLON','48_OZ'].forEach(size=>{
    row.querySelectorAll(`[data-made="${size}"],[data-store="${size}"]`).forEach(input=>input.addEventListener('input',()=>updateGood(row,size)));
    updateGood(row,size);
  }));
}

function buildProductionScreen(){
  const mount=$('workflowMount');
  if(!mount||mount.dataset.dailyBuilt==='1')return;
  mount.dataset.dailyBuilt='1';
  mount.innerHTML=`
    <div class="page-intro">
      <div><p class="kicker">Simple production flow</p><h1>Production → HOLD → -20°F</h1><p>Save what was made. Good product goes to HOLD. When State Lab clears a run, PASS is one click and the run moves into the -20°F freezer.</p></div>
    </div>
    <div class="simple-flow"><span><b>1 · SAVE PRODUCTION</b>Made + Storefront</span><i>→</i><span class="hold-step"><b>2 · HOLD</b>Waiting for State Lab</span><i>→</i><span class="pass-step"><b>PASS</b>Moves to -20°F</span></div>

    <div class="daily-production">
      <section class="card production-workbook">
        <div class="card-header workbook-toolbar">
          <div><p class="kicker">Today</p><h2>Daily production worksheet</h2><p class="catalog-note">Enter quantities only for flavors/packages made today. Leave the rest at zero.</p></div>
          <div class="workbook-controls">
            <div class="julian-field"><label for="dailyJulian">Julian date</label><input id="dailyJulian" type="number" min="1" max="366" placeholder="238"></div>
            <div class="search-field"><label for="flavorSearch">Find flavor</label><input id="flavorSearch" placeholder="Search…"></div>
            <span id="catalogCount" class="catalog-count">Loading flavors…</span>
          </div>
        </div>
        <div class="add-flavor-strip"><strong>Flavor catalog</strong><span>Missing one?</span><input id="newFlavorName" placeholder="New flavor name"><button id="addFlavorBtn" class="btn btn-secondary btn-compact" type="button">+ Add flavor</button><small>Adds both 3 gal and 48 oz.</small></div>
        <div class="matrix-wrap">
          <div class="flavor-matrix-head"><span>Flavor</span><span class="package-head">3 GALLON <small>Made</small><small>Storefront</small><small>Good</small></span><span class="package-head">48 OZ <small>Made</small><small>Storefront</small><small>Good</small></span></div>
          <div id="flavorMatrix"></div>
        </div>
        <div class="workbook-footer">
          <div class="hold-rule"><b>Save:</b> Storefront stays separate. Every good unit goes directly into <strong>HOLD</strong>.</div>
          <button id="saveProductionDay" class="btn btn-primary save-day" type="button">Save today’s production → HOLD</button>
        </div>
      </section>

      <section class="card hold-card">
        <div class="card-header hold-header">
          <div><p class="kicker">Waiting for State Lab</p><h2>HOLD</h2><p class="catalog-note">Everything saved here is not saleable yet. PASS each flavor/package only when State Lab clears it.</p></div>
          <div class="hold-header-right"><span id="holdCount" class="hold-count">0 runs</span><span class="status-chip warn">ON HOLD</span></div>
        </div>
        <div class="card-body"><div id="dailyLabQueue"></div></div>
      </section>
    </div>`;

  $('saveProductionDay').onclick=saveProductionDay;
  $('addFlavorBtn').onclick=addFlavor;
  $('flavorSearch').addEventListener('input',()=>renderFlavorMatrix(captureDraft()));
}

async function loadCatalog({preserveDraft=true}={}){
  const draft=preserveDraft?captureDraft():new Map();
  const {data,error}=await sb.from('products').select('flavor,package_size,active').order('flavor');
  if(error)throw error;
  catalog=data||[];
  if($('catalogCount'))$('catalogCount').textContent=`${uniqueFlavors().length} flavors`;
  renderFlavorMatrix(draft);
}
async function loadHold(){
  const {data,error}=await sb.from('production_hold_queue').select('*').order('created_at',{ascending:false});
  if(error)throw error;
  hold=data||[];
  renderHold();
}
function renderHold(){
  const host=$('dailyLabQueue');
  if(!host)return;
  if($('holdCount'))$('holdCount').textContent=`${hold.length} run${hold.length===1?'':'s'}`;
  if(!hold.length){
    host.innerHTML='<div class="hold-empty"><div class="hold-empty-icon">✓</div><div><strong>No product on HOLD</strong><span>Save today’s production and every good flavor/package will appear here immediately.</span></div></div>';
    return;
  }
  host.innerHTML=`<div class="hold-grid">${hold.map(l=>`<article class="hold-run">
    <div class="hold-run-main">
      <div class="hold-badge">HOLD</div>
      <div><h3>${esc(l.flavor)}</h3><p>${pkg(l.package_size)} · Julian ${l.julian}</p></div>
    </div>
    <div class="hold-numbers">
      <span><small>Made</small><b>${Number(l.total_produced)}</b></span>
      <span><small>Storefront</small><b>${Number(l.storefront_quantity)}</b></span>
      <span class="good-number"><small>Good on hold</small><b>${Number(l.good_quantity)}</b></span>
    </div>
    <div class="hold-actions">
      <button class="btn btn-primary hold-pass" data-auto-pass="${l.id}" type="button">✓ PASS → -20°F</button>
      <button class="btn btn-danger btn-compact" data-auto-fail="${l.id}" type="button">FAIL</button>
    </div>
  </article>`).join('')}</div>`;
  host.querySelectorAll('[data-auto-pass]').forEach(b=>b.onclick=()=>passLot(b.dataset.autoPass));
  host.querySelectorAll('[data-auto-fail]').forEach(b=>b.onclick=()=>failLot(b.dataset.autoFail));
}

function collectProductionLines(){
  const lines=[];
  document.querySelectorAll('.flavor-production-row').forEach(row=>{
    const flavor=row.dataset.flavor;
    ['3_GALLON','48_OZ'].forEach(size=>{
      const totalProduced=Number(row.querySelector(`[data-made="${size}"]`)?.value||0);
      const storefrontQuantity=Number(row.querySelector(`[data-store="${size}"]`)?.value||0);
      if(totalProduced>0||storefrontQuantity>0)lines.push({flavor,packageSize:size,totalProduced,storefrontQuantity});
    });
  });
  return lines;
}
function optimisticHoldFromRuns(runs=[]){
  const existing=new Set(hold.map(x=>x.id));
  const additions=runs.filter(r=>Number(r.goodQuantity)>0&&!existing.has(r.runId)).map(r=>({
    id:r.runId,
    julian:Number($('dailyJulian')?.value||0),
    flavor:r.flavor,
    package_size:r.packageSize,
    total_produced:Number(r.totalProduced),
    storefront_quantity:Number(r.storefrontQuantity),
    good_quantity:Number(r.goodQuantity),
    created_at:new Date().toISOString()
  }));
  hold=[...additions,...hold];
  renderHold();
}

async function saveProductionDay(){
  const julian=Number($('dailyJulian')?.value);
  if(!Number.isInteger(julian)||julian<1||julian>366)return showMessage('Enter a valid Julian date from 1 to 366.','warning');
  const lines=collectProductionLines();
  if(!lines.length)return showMessage('Enter at least one quantity for ice cream made today.','warning');
  for(const line of lines){
    if(!Number.isInteger(line.totalProduced)||line.totalProduced<=0)return showMessage(`${line.flavor} ${pkg(line.packageSize)}: Made must be greater than zero.`,'warning');
    if(!Number.isInteger(line.storefrontQuantity)||line.storefrontQuantity<0||line.storefrontQuantity>line.totalProduced)return showMessage(`${line.flavor} ${pkg(line.packageSize)}: Storefront cannot exceed Made.`,'warning');
  }

  const button=$('saveProductionDay');
  button.disabled=true;
  setBusy(true,'Saving production into HOLD…');
  try{
    const {data,error}=await reliableRpc('save_production_day_v2',{p_julian:julian,p_lines:lines});
    if(error)throw error;

    const runs=Array.isArray(data?.runs)?data.runs:[];
    if(Number(data?.saved)!==lines.length||runs.length!==lines.length){
      throw new Error('Database did not confirm every production line. Your worksheet was not cleared.');
    }

    // The RPC returned actual run IDs from the committed database transaction.
    // Render them into HOLD immediately, then refresh the authoritative view.
    optimisticHoldFromRuns(runs);
    try{await loadHold();}catch(refreshError){
      showMessage('Production was saved to HOLD, but the HOLD list could not refresh. Do not save again; use Refresh once.','warning');
    }

    await loadCatalog({preserveDraft:false});
    window.dispatchEvent(new Event('icecream:refresh'));
    setTimeout(()=>$('refreshBtn')?.click(),50);

    const holdRuns=runs.filter(r=>Number(r.goodQuantity)>0).length;
    const storefrontOnly=runs.length-holdRuns;
    showMessage(`${runs.length} production line${runs.length===1?'':'s'} saved. ${holdRuns} run${holdRuns===1?'':'s'} ${holdRuns===1?'is':'are'} now on HOLD${storefrontOnly?`; ${storefrontOnly} had no good units to hold`:''}.`);
  }catch(error){
    showMessage(error?.message||'Production was not saved. Your entered numbers were kept.','error');
  }finally{
    button.disabled=false;
    setBusy(false);
  }
}

async function addFlavor(){
  const name=$('newFlavorName')?.value.trim();
  if(!name)return showMessage('Type the new flavor name first.','warning');
  const draft=captureDraft();
  setBusy(true,'Adding flavor…');
  try{
    const {error}=await reliableRpc('add_flavor',{p_flavor:name});
    if(error)throw error;
    $('newFlavorName').value='';
    const {data,error:loadError}=await sb.from('products').select('flavor,package_size,active').order('flavor');
    if(loadError)throw loadError;
    catalog=data||[];
    if($('catalogCount'))$('catalogCount').textContent=`${uniqueFlavors().length} flavors`;
    renderFlavorMatrix(draft);
    showMessage(`${name} added to the worksheet for both 3 gal and 48 oz.`);
  }catch(error){showMessage(error?.message||'Could not add flavor.','error')}finally{setBusy(false)}
}

async function passLot(id){
  const item=hold.find(x=>x.id===id);
  if(!item)return;
  setBusy(true,`Passing ${item.flavor} to -20°F…`);
  try{
    const {error}=await reliableRpc('release_lot_auto_place',{p_run_id:id});
    if(error)throw error;
    hold=hold.filter(x=>x.id!==id);
    renderHold();
    window.dispatchEvent(new Event('icecream:refresh'));
    setTimeout(()=>$('refreshBtn')?.click(),50);
    showMessage(`PASS: ${item.flavor} · ${pkg(item.package_size)} · Julian ${item.julian} moved from HOLD into the -20°F freezer.`);
  }catch(error){showMessage(error?.message||'Could not pass this run. It remains on HOLD.','error')}finally{setBusy(false)}
}

async function failLot(id){
  const item=hold.find(x=>x.id===id);
  if(!item)return;
  if(!confirm(`FAIL ${item.flavor} ${pkg(item.package_size)} Julian ${item.julian} and dispose the good quantity?`))return;
  setBusy(true,'Recording State Lab failure…');
  try{
    const {error}=await reliableRpc('fail_lab_lot',{p_run_id:id});
    if(error)throw error;
    hold=hold.filter(x=>x.id!==id);
    renderHold();
    window.dispatchEvent(new Event('icecream:refresh'));
    setTimeout(()=>$('refreshBtn')?.click(),50);
    showMessage(`FAIL recorded. ${item.flavor} was removed from HOLD and disposed.`);
  }catch(error){showMessage(error?.message||'Could not record failure.','error')}finally{setBusy(false)}
}

async function loadWorkflow(){
  await requireSession();
  await Promise.all([loadCatalog({preserveDraft:true}),loadHold()]);
}
async function boot(){
  buildProductionScreen();
  try{
    const {data:{session}}=await sb.auth.getSession();
    if(session)await loadWorkflow();
  }catch(error){showMessage(error?.message||'Could not load production workflow.','error')}

  document.querySelectorAll('[data-screen="production"],[data-quick="production"]').forEach(button=>button.addEventListener('click',()=>{
    setTimeout(()=>loadWorkflow().catch(error=>showMessage(error?.message||'Could not load HOLD.','error')),80);
  }));
  $('refreshBtn')?.addEventListener('click',()=>setTimeout(()=>loadWorkflow().catch(()=>{}),100));
  window.addEventListener('icecream:refresh',()=>setTimeout(()=>loadHold().catch(()=>{}),120));
}
boot();
