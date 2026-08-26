import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const URL='https://atttqdrndjlelrrlupkw.supabase.co';
const KEY='sb_publishable_Juq6FUFvX8ZT2BUd_C7T-g_6Tlyy0tL';
const sb=createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pkg=s=>s==='3_GALLON'?'3 gal':'48 oz';
let catalog=[];
let pending=[];
let lineSeq=0;

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
function uniqueFlavors(){return [...new Set(catalog.map(x=>x.flavor))].sort((a,b)=>a.localeCompare(b));}
function flavorOptions(selected=''){
  return `<option value="">Choose flavor</option>${uniqueFlavors().map(f=>`<option ${f===selected?'selected':''}>${esc(f)}</option>`).join('')}`;
}
function calculateRow(row){
  const total=Number(row.querySelector('[data-total]').value||0);
  const storefront=Number(row.querySelector('[data-storefront]').value||0);
  const good=Math.max(0,total-storefront);
  row.querySelector('[data-good]').textContent=good;
}
function addLine(values={}){
  const host=$('productionLines');
  if(!host)return;
  lineSeq+=1;
  const row=document.createElement('div');
  row.className='production-line';
  row.dataset.line=String(lineSeq);
  row.innerHTML=`
    <select data-flavor aria-label="Flavor">${flavorOptions(values.flavor||'')}</select>
    <select data-package aria-label="Package"><option value="3_GALLON" ${values.packageSize==='48_OZ'?'':'selected'}>3 gallon</option><option value="48_OZ" ${values.packageSize==='48_OZ'?'selected':''}>48 oz</option></select>
    <input data-total type="number" min="0" step="1" value="${Number(values.totalProduced||0)}" aria-label="Made today">
    <input data-storefront type="number" min="0" step="1" value="${Number(values.storefrontQuantity||0)}" aria-label="Storefront">
    <div class="good-preview"><span data-good>0</span> good → -40°F</div>
    <button class="remove-line" type="button" title="Remove row">×</button>`;
  host.appendChild(row);
  row.querySelectorAll('input').forEach(input=>input.addEventListener('input',()=>calculateRow(row)));
  row.querySelector('.remove-line').onclick=()=>{row.remove();if(!host.children.length)addLine();};
  calculateRow(row);
}
function resetSheet(){
  const host=$('productionLines');
  if(!host)return;
  host.innerHTML='';
  addLine();addLine();addLine();
}
function buildProductionScreen(){
  const section=$('production');
  if(!section||section.dataset.dailyBuilt==='1')return;
  section.dataset.dailyBuilt='1';
  section.innerHTML=`
    <div class="page-intro"><div><p class="kicker">Processing workflow</p><h1>Today’s production & State Lab</h1><p>Enter every flavor made today on one sheet. Storefront units are separated immediately. All good product automatically enters -40°F hold.</p></div></div>
    <div class="daily-production">
      <section class="card daily-card">
        <div class="card-header daily-head"><div><p class="kicker">Step 1</p><h2>Production by flavor</h2><p class="catalog-note">SDSU flavor catalog is preloaded. Add a new flavor anytime if the plant makes something new.</p></div>
          <div class="daily-head-actions">
            <div class="julian-field"><label for="dailyJulian">Julian date</label><input id="dailyJulian" type="number" min="1" max="366" placeholder="238"></div>
            <span id="catalogCount" class="catalog-count">Catalog</span>
            <div class="new-flavor-panel"><input id="newFlavorName" placeholder="New flavor name"><button id="addFlavorBtn" class="btn btn-secondary btn-compact" type="button">+ Add flavor</button></div>
          </div>
        </div>
        <div class="production-sheet">
          <div class="production-sheet-head"><span>Flavor</span><span>Package</span><span>Made today</span><span>Storefront</span><span>Good product</span><span></span></div>
          <div id="productionLines"></div>
          <div class="sheet-actions"><button id="addDailyLine" class="btn btn-secondary" type="button">+ Add another flavor</button><button id="saveProductionDay" class="btn btn-primary" type="button">Save today’s production</button></div>
        </div>
      </section>
      <div class="production-flow"><span><b>1 · MADE</b>Enter the total for each flavor/package.</span><span>→</span><span><b>2 · STOREFRONT</b>Imperfect units are isolated and never saleable.</span><span>→</span><span><b>3 · GOOD PRODUCT</b>Automatically placed on -40°F State Lab hold.</span></div>
      <section class="card lab-auto-card"><div class="card-header"><div><p class="kicker">Step 2</p><h2>State Lab hold — flavor by flavor</h2><p class="catalog-note">When State Lab clears a flavor, click PASS. The system transfers that run to -20°F automatically.</p></div><span class="status-chip warn">-40°F HOLD</span></div><div class="card-body"><div class="lab-auto-note">PASS is one click. Released product goes to the dedicated <b>-20°F Release Staging</b> location so inventory and the freezer map stay synchronized.</div><div id="dailyLabQueue"></div></div></section>
    </div>`;
  $('addDailyLine').onclick=()=>addLine();
  $('saveProductionDay').onclick=saveProductionDay;
  $('addFlavorBtn').onclick=addFlavor;
  resetSheet();
}
async function loadCatalog(){
  const {data,error}=await sb.from('products').select('flavor,package_size,active').order('flavor');
  if(error)throw error;
  catalog=data||[];
  const count=$('catalogCount');if(count)count.textContent=`${uniqueFlavors().length} flavors loaded`;
  document.querySelectorAll('[data-flavor]').forEach(select=>{
    const current=select.value;
    select.innerHTML=flavorOptions(current);
  });
}
async function loadPending(){
  const {data,error}=await sb.from('pending_lab_lots').select('*').order('julian');
  if(error)throw error;
  pending=data||[];
  renderPending();
}
function renderPending(){
  const host=$('dailyLabQueue');if(!host)return;
  if(!pending.length){host.innerHTML='<div class="empty">Nothing is waiting for State Lab. All clear.</div>';return;}
  host.innerHTML=pending.map(l=>`<div class="lab-run"><div class="lab-run-top"><div><div class="lab-run-title">${esc(l.flavor)} · ${pkg(l.package_size)}</div><div class="lab-run-meta">Julian ${l.julian} · ${l.quantity} good units on -40°F hold</div></div><span class="status-chip warn">PENDING</span></div><div class="lab-run-actions"><button class="btn btn-primary btn-compact" data-auto-pass="${l.id}" type="button">✓ PASS → -20°F</button><button class="btn btn-danger btn-compact" data-auto-fail="${l.id}" type="button">FAIL / Dispose</button></div></div>`).join('');
  host.querySelectorAll('[data-auto-pass]').forEach(b=>b.onclick=()=>passLot(b.dataset.autoPass));
  host.querySelectorAll('[data-auto-fail]').forEach(b=>b.onclick=()=>failLot(b.dataset.autoFail));
}
async function saveProductionDay(){
  const julian=Number($('dailyJulian')?.value);
  if(!Number.isInteger(julian)||julian<1||julian>366)return showMessage('Enter a valid Julian date from 1 to 366.','warning');
  const lines=[...document.querySelectorAll('.production-line')].map(row=>({
    flavor:row.querySelector('[data-flavor]').value,
    packageSize:row.querySelector('[data-package]').value,
    totalProduced:Number(row.querySelector('[data-total]').value||0),
    storefrontQuantity:Number(row.querySelector('[data-storefront]').value||0)
  })).filter(x=>x.flavor||x.totalProduced||x.storefrontQuantity);
  if(!lines.length)return showMessage('Enter at least one flavor produced today.','warning');
  for(const line of lines){
    if(!line.flavor)return showMessage('Choose a flavor for every production row.','warning');
    if(!Number.isInteger(line.totalProduced)||line.totalProduced<=0)return showMessage(`Enter a valid produced quantity for ${line.flavor}.`,'warning');
    if(!Number.isInteger(line.storefrontQuantity)||line.storefrontQuantity<0||line.storefrontQuantity>line.totalProduced)return showMessage(`Check the Storefront quantity for ${line.flavor}.`,'warning');
  }
  setBusy(true,'Saving today’s production…');
  try{
    const {data,error}=await sb.rpc('add_production_day',{p_julian:julian,p_lines:lines});
    if(error)throw error;
    resetSheet();
    await Promise.all([loadCatalog(),loadPending()]);
    $('refreshBtn')?.click();
    showMessage(`${data||lines.length} flavor line${Number(data||lines.length)===1?'':'s'} saved. Good product is now on -40°F State Lab hold.`);
  }catch(error){showMessage(error?.message||'Could not save production.','error')}finally{setBusy(false)}
}
async function addFlavor(){
  const name=$('newFlavorName')?.value.trim();
  if(!name)return showMessage('Type the new flavor name first.','warning');
  setBusy(true,'Adding flavor…');
  try{
    const {error}=await sb.rpc('add_flavor',{p_flavor:name});
    if(error)throw error;
    $('newFlavorName').value='';
    await loadCatalog();
    showMessage(`${name} added to the flavor catalog in both 3 gallon and 48 oz package options.`);
  }catch(error){showMessage(error?.message||'Could not add flavor.','error')}finally{setBusy(false)}
}
async function passLot(id){
  setBusy(true,'Releasing flavor to -20°F…');
  try{
    const {error}=await sb.rpc('release_lot_auto_place',{p_run_id:id});
    if(error)throw error;
    await loadPending();
    $('refreshBtn')?.click();
    showMessage('PASS recorded. That flavor is now saleable in -20°F Release Staging.');
  }catch(error){showMessage(error?.message||'Could not release lot.','error')}finally{setBusy(false)}
}
async function failLot(id){
  if(!confirm('Mark this flavor FAILED and dispose its good quantity?'))return;
  setBusy(true,'Recording lab failure…');
  try{
    const {error}=await sb.rpc('fail_lab_lot',{p_run_id:id});
    if(error)throw error;
    await loadPending();
    $('refreshBtn')?.click();
    showMessage('FAIL recorded. Product was removed from the saleable flow.');
  }catch(error){showMessage(error?.message||'Could not record failure.','error')}finally{setBusy(false)}
}
async function boot(){
  buildProductionScreen();
  const {data:{session}}=await sb.auth.getSession();
  if(session){try{await Promise.all([loadCatalog(),loadPending()])}catch(error){showMessage(error?.message||'Could not load production workflow.','error')}}
  sb.auth.onAuthStateChange(async(_event,session)=>{if(session){try{await Promise.all([loadCatalog(),loadPending()])}catch(error){showMessage(error?.message||'Could not load production workflow.','error')}}});
  $('refreshBtn')?.addEventListener('click',()=>{loadCatalog().then(loadPending).catch(()=>{})});
}
boot();