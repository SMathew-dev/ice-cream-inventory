import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const URL='https://atttqdrndjlelrrlupkw.supabase.co';
const KEY='sb_publishable_Juq6FUFvX8ZT2BUd_C7T-g_6Tlyy0tL';
const sb=createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pkg=s=>s==='3_GALLON'?'3 gal':'48 oz';

let catalog=[];
let pending=[];
let putaway=[];
let freezerSlots=[];

function showMessage(text,type='info'){
  const host=$('msg'); if(!host)return;
  host.innerHTML=text?`<div class="notice ${type==='error'?'error':type==='warning'?'warning':''}">${esc(text)}</div>`:'';
}
function setBusy(on,label='Saving…'){
  const overlay=$('loadingOverlay'); if(!overlay)return;
  $('loadingText').textContent=label; overlay.classList.toggle('hidden',!on);
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
  const out=row.querySelector(`[data-good="${size}"]`); if(out)out.textContent=good(made,store);
  row.classList.toggle('has-production',[...row.querySelectorAll('input[type="number"]')].some(i=>Number(i.value)>0));
}
function renderFlavorMatrix(draft=new Map()){
  const host=$('flavorMatrix'); if(!host)return;
  const query=($('flavorSearch')?.value||'').trim().toLowerCase();
  const flavors=uniqueFlavors().filter(f=>!query||f.toLowerCase().includes(query));
  if(!flavors.length){host.innerHTML='<div class="empty">No flavors match that search.</div>';return;}
  host.innerHTML=flavors.map(flavor=>{
    const d3=draft.get(draftKey(flavor,'3_GALLON'))||{made:'0',storefront:'0'};
    const d48=draft.get(draftKey(flavor,'48_OZ'))||{made:'0',storefront:'0'};
    return `<div class="flavor-production-row" data-flavor="${esc(flavor)}">
      <div class="flavor-cell"><strong>${esc(flavor)}</strong></div>
      <div class="package-group package-3"><span class="mobile-package-label">3 gallon</span><input data-made="3_GALLON" type="number" min="0" step="1" value="${esc(d3.made)}"><input data-store="3_GALLON" type="number" min="0" step="1" value="${esc(d3.storefront)}"><span class="good-pill"><b data-good="3_GALLON">${good(d3.made,d3.storefront)}</b> good</span></div>
      <div class="package-group package-48"><span class="mobile-package-label">48 oz</span><input data-made="48_OZ" type="number" min="0" step="1" value="${esc(d48.made)}"><input data-store="48_OZ" type="number" min="0" step="1" value="${esc(d48.storefront)}"><span class="good-pill"><b data-good="48_OZ">${good(d48.made,d48.storefront)}</b> good</span></div>
    </div>`;
  }).join('');
  host.querySelectorAll('.flavor-production-row').forEach(row=>['3_GALLON','48_OZ'].forEach(size=>{
    row.querySelectorAll(`[data-made="${size}"],[data-store="${size}"]`).forEach(input=>input.addEventListener('input',()=>updateGood(row,size)));
    updateGood(row,size);
  }));
}

function buildProductionScreen(){
  const mount=$('workflowMount'); if(!mount||mount.dataset.dailyBuilt==='1')return;
  mount.dataset.dailyBuilt='1';
  mount.innerHTML=`
    <div class="page-intro"><div><p class="kicker">Physical production flow</p><h1>Production → Lab → Freezer</h1><p>Every movement has a real location. The app never guesses a final shelf that an employee has not actually used.</p></div></div>
    <div class="flow-rail">
      <div><b>1 · PRODUCE</b><span>Enter made + Storefront</span><em>-40°F Production Hold</em></div><i>→</i>
      <div><b>2 · STATE LAB</b><span>PASS is one click</span><em>-20°F Release Staging</em></div><i>→</i>
      <div><b>3 · PUT AWAY</b><span>Choose actual shelf</span><em>Final freezer-map position</em></div>
    </div>
    <div class="daily-production">
      <section class="card production-workbook">
        <div class="card-header workbook-toolbar">
          <div><p class="kicker">Step 1 · Production entry</p><h2>Daily flavor worksheet</h2><p class="catalog-note">All catalog flavors are listed. Enter quantities only where production happened.</p></div>
          <div class="workbook-controls"><div class="julian-field"><label for="dailyJulian">Julian date</label><input id="dailyJulian" type="number" min="1" max="366" placeholder="238"></div><div class="search-field"><label for="flavorSearch">Find flavor</label><input id="flavorSearch" placeholder="Search…"></div><span id="catalogCount" class="catalog-count">Loading flavors…</span></div>
        </div>
        <div class="add-flavor-strip"><strong>Flavor catalog</strong><span>Missing one?</span><input id="newFlavorName" placeholder="New flavor name"><button id="addFlavorBtn" class="btn btn-secondary btn-compact" type="button">+ Add flavor</button><small>Adds both 3 gal and 48 oz options.</small></div>
        <div class="matrix-wrap"><div class="flavor-matrix-head"><span>Flavor</span><span class="package-head">3 GALLON <small>Made</small><small>Storefront</small><small>Good</small></span><span class="package-head">48 OZ <small>Made</small><small>Storefront</small><small>Good</small></span></div><div id="flavorMatrix"></div></div>
        <div class="workbook-footer"><div class="hold-rule"><b>Save Today:</b> every good unit immediately appears on the freezer map in <strong>-40°F Production Hold</strong>.</div><button id="saveProductionDay" class="btn btn-primary save-day" type="button">Save today’s production</button></div>
      </section>

      <section class="card lab-auto-card">
        <div class="card-header"><div><p class="kicker">Step 2 · State Lab</p><h2>-40°F hold queue</h2><p class="catalog-note">PASS removes that exact Julian run from -40°F and puts it into -20°F Release Staging.</p></div><span class="status-chip warn">HOLD</span></div>
        <div class="card-body"><div id="dailyLabQueue"></div></div>
      </section>

      <section class="card putaway-card">
        <div class="card-header"><div><p class="kicker">Step 3 · Physical put-away</p><h2>-20°F release staging</h2><p class="catalog-note">This is the bridge to the real freezer map. Record where the tubs were actually placed.</p></div><span class="status-chip neutral">PUT AWAY</span></div>
        <div class="card-body"><div class="putaway-note">A PASS is already saleable and physically tracked in <b>-20°F Release Staging</b>. Move all or part of the stack to the actual wall / shelf / position as employees put it away.</div><div id="putawayQueue"></div></div>
      </section>
    </div>`;
  $('saveProductionDay').onclick=saveProductionDay;
  $('addFlavorBtn').onclick=addFlavor;
  $('flavorSearch').addEventListener('input',()=>renderFlavorMatrix(captureDraft()));
}

async function loadCatalog({preserveDraft=true}={}){
  const draft=preserveDraft?captureDraft():new Map();
  const {data,error}=await sb.from('products').select('flavor,package_size,active').order('flavor'); if(error)throw error;
  catalog=data||[]; if($('catalogCount'))$('catalogCount').textContent=`${uniqueFlavors().length} flavors`; renderFlavorMatrix(draft);
}
async function loadPending(){
  const {data,error}=await sb.from('pending_lab_lots').select('*').order('julian'); if(error)throw error;
  pending=data||[]; renderPending();
}
async function loadPutaway(){
  const [q,s]=await Promise.all([
    sb.from('release_putaway_queue').select('*').order('created_at'),
    sb.from('freezer_slots').select('*').eq('freezer','-20°F').eq('active',true).lt('position',900).order('wall').order('shelf').order('position')
  ]);
  if(q.error)throw q.error; if(s.error)throw s.error;
  putaway=q.data||[]; freezerSlots=s.data||[]; renderPutaway();
}
function renderPending(){
  const host=$('dailyLabQueue'); if(!host)return;
  if(!pending.length){host.innerHTML='<div class="empty">Nothing waiting for State Lab. All clear.</div>';return;}
  host.innerHTML=`<div class="lab-grid">${pending.map(l=>`<div class="lab-run"><div class="lab-run-top"><div><div class="lab-run-title">${esc(l.flavor)} · ${pkg(l.package_size)}</div><div class="lab-run-meta">Julian ${l.julian} · ${l.quantity} good units · physically in -40°F Production Hold</div></div><span class="status-chip warn">PENDING</span></div><div class="lab-run-actions"><button class="btn btn-primary btn-compact" data-auto-pass="${l.id}" type="button">✓ PASS → -20°F</button><button class="btn btn-danger btn-compact" data-auto-fail="${l.id}" type="button">FAIL</button></div></div>`).join('')}</div>`;
  host.querySelectorAll('[data-auto-pass]').forEach(b=>b.onclick=()=>passLot(b.dataset.autoPass));
  host.querySelectorAll('[data-auto-fail]').forEach(b=>b.onclick=()=>failLot(b.dataset.autoFail));
}
function slotLabel(s){return `${s.wall} wall · ${s.shelf} · Position ${s.position}`;}
function renderPutaway(){
  const host=$('putawayQueue'); if(!host)return;
  if(!putaway.length){host.innerHTML='<div class="empty">No passed product waiting to be put away.</div>';return;}
  host.innerHTML=`<div class="putaway-grid">${putaway.map(p=>`<div class="putaway-run">
    <div class="putaway-top"><div><strong>${esc(p.flavor)} · ${pkg(p.package_size)}</strong><span>Julian ${p.julian} · ${p.quantity} units in -20°F Release Staging</span></div><span class="status-chip good">PASSED</span></div>
    <div class="putaway-controls"><label>Qty<input id="putqty-${p.placement_id}" type="number" min="1" max="${p.quantity}" value="${p.quantity}"></label><label>Final position<select id="putslot-${p.placement_id}">${freezerSlots.map(s=>`<option value="${s.id}">${slotLabel(s)}</option>`).join('')}</select></label><button class="btn btn-primary btn-compact" data-putaway="${p.placement_id}" type="button">Put away</button></div>
    <small>Need multiple shelves? Put away part of the quantity, then choose the next position for the remainder.</small>
  </div>`).join('')}</div>`;
  host.querySelectorAll('[data-putaway]').forEach(b=>b.onclick=()=>putAway(b.dataset.putaway));
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
async function saveProductionDay(){
  const julian=Number($('dailyJulian')?.value);
  if(!Number.isInteger(julian)||julian<1||julian>366)return showMessage('Enter a valid Julian date from 1 to 366.','warning');
  const lines=collectProductionLines(); if(!lines.length)return showMessage('Enter at least one quantity for ice cream made today.','warning');
  for(const line of lines){
    if(!Number.isInteger(line.totalProduced)||line.totalProduced<=0)return showMessage(`${line.flavor} ${pkg(line.packageSize)}: Made must be greater than zero.`,'warning');
    if(!Number.isInteger(line.storefrontQuantity)||line.storefrontQuantity<0||line.storefrontQuantity>line.totalProduced)return showMessage(`${line.flavor} ${pkg(line.packageSize)}: Storefront cannot exceed Made.`,'warning');
  }
  setBusy(true,'Saving production to -40°F hold…');
  try{
    const {data,error}=await sb.rpc('add_production_day',{p_julian:julian,p_lines:lines}); if(error)throw error;
    await Promise.all([loadCatalog({preserveDraft:false}),loadPending(),loadPutaway()]); $('refreshBtn')?.click();
    showMessage(`${Number(data||lines.length)} production line${Number(data||lines.length)===1?'':'s'} saved. Good product is now physically tracked in -40°F Production Hold.`);
  }catch(error){showMessage(error?.message||'Could not save production.','error')}finally{setBusy(false)}
}
async function addFlavor(){
  const name=$('newFlavorName')?.value.trim(); if(!name)return showMessage('Type the new flavor name first.','warning');
  const draft=captureDraft(); setBusy(true,'Adding flavor…');
  try{
    const {error}=await sb.rpc('add_flavor',{p_flavor:name}); if(error)throw error;
    $('newFlavorName').value='';
    const {data,error:loadError}=await sb.from('products').select('flavor,package_size,active').order('flavor'); if(loadError)throw loadError;
    catalog=data||[]; $('catalogCount').textContent=`${uniqueFlavors().length} flavors`; renderFlavorMatrix(draft);
    showMessage(`${name} added to the production sheet with 3 gal and 48 oz options.`);
  }catch(error){showMessage(error?.message||'Could not add flavor.','error')}finally{setBusy(false)}
}
async function passLot(id){
  setBusy(true,'Transferring passed run to -20°F staging…');
  try{
    const {error}=await sb.rpc('release_lot_auto_place',{p_run_id:id}); if(error)throw error;
    await Promise.all([loadPending(),loadPutaway()]); $('refreshBtn')?.click();
    showMessage('PASS recorded. The run moved off the -40°F map and is now in -20°F Release Staging, ready for final put-away.');
  }catch(error){showMessage(error?.message||'Could not release lot.','error')}finally{setBusy(false)}
}
async function failLot(id){
  if(!confirm('Mark this flavor/package FAILED and dispose its good quantity?'))return;
  setBusy(true,'Removing failed run from -40°F…');
  try{
    const {error}=await sb.rpc('fail_lab_lot',{p_run_id:id}); if(error)throw error;
    await Promise.all([loadPending(),loadPutaway()]); $('refreshBtn')?.click(); showMessage('FAIL recorded. The run was removed from -40°F hold and disposed in the ledger.');
  }catch(error){showMessage(error?.message||'Could not record failure.','error')}finally{setBusy(false)}
}
async function putAway(placementId){
  const qty=Number($(`putqty-${placementId}`)?.value);
  const slotId=$(`putslot-${placementId}`)?.value;
  const item=putaway.find(x=>x.placement_id===placementId);
  if(!item||!slotId||!Number.isInteger(qty)||qty<1||qty>Number(item.quantity))return showMessage('Choose a valid put-away quantity and freezer position.','warning');
  setBusy(true,'Updating final freezer location…');
  try{
    const {error}=await sb.rpc('put_away_release_stack',{p_placement_id:placementId,p_destination_slot_id:slotId,p_quantity:qty}); if(error)throw error;
    await loadPutaway(); $('refreshBtn')?.click();
    showMessage(`${qty} ${item.flavor} unit${qty===1?'':'s'} moved from Release Staging to the selected -20°F freezer-map position.`);
  }catch(error){showMessage(error?.message||'Could not put away product.','error')}finally{setBusy(false)}
}

async function loadWorkflow(){await Promise.all([loadCatalog({preserveDraft:false}),loadPending(),loadPutaway()]);}
async function boot(){
  buildProductionScreen();
  const {data:{session}}=await sb.auth.getSession(); if(session){try{await loadWorkflow()}catch(error){showMessage(error?.message||'Could not load production workflow.','error')}}
  sb.auth.onAuthStateChange(async(_event,session)=>{if(session){try{await loadWorkflow()}catch(error){showMessage(error?.message||'Could not load production workflow.','error')}}});
  $('refreshBtn')?.addEventListener('click',()=>Promise.all([loadCatalog(),loadPending(),loadPutaway()]).catch(()=>{}));
}
boot();