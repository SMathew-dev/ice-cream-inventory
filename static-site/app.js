import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL='https://atttqdrndjlelrrlupkw.supabase.co';
const SUPABASE_KEY='sb_publishable_Juq6FUFvX8ZT2BUd_C7T-g_6Tlyy0tL';
const sb=createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});

const $=id=>document.getElementById(id);
const $$=selector=>Array.from(document.querySelectorAll(selector));
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pkg=s=>s==='3_GALLON'?'3 gal':'48 oz';

let inventory=[];
let lots=[];
let orders=[];
let slots=[];
let placements=[];
let integrity=[];
let orderCart=[];
let activeFreezer='-20°F';
let currentSession=null;
let loading=false;

const titles={
  dashboard:['Operations','Live stock, queues and freezer integrity'],
  orders:['Customer Orders','Reserve now, deduct only after physical pickup'],
  production:['Production & State Lab','Record processing and release tested product'],
  dairy:['Dairy Bar','Fast physical withdrawals from saleable stock'],
  freezer:['Freezer Map','Find product by wall, shelf, position and Julian lot'],
  count:['Physical Count','Reconcile a stack without deleting history'],
  storefront:['Storefront','Cosmetically imperfect product kept outside saleable stock']
};

function setLoading(value,label='Working…'){
  loading=value;
  $('loadingText').textContent=label;
  $('loadingOverlay').classList.toggle('hidden',!value);
}

function message(text,type='info'){
  const node=$('msg');
  if(!text){node.innerHTML='';return;}
  node.innerHTML=`<div class="notice ${type==='error'?'error':type==='warning'?'warning':''}">${esc(text)}</div>`;
}

function isAuthTimingError(error){
  const text=String(error?.message||error||'').toLowerCase();
  return text.includes('jwt issued at future')||text.includes('invalid jwt')||text.includes('jwt expired')||text.includes('unauthorized')||text.includes('401');
}

async function queryLiveData(){
  return Promise.all([
    sb.from('inventory_snapshot').select('*').order('flavor'),
    sb.from('pending_lab_lots').select('*').order('julian'),
    sb.from('open_order_queue').select('*').order('created_at'),
    sb.from('freezer_slots').select('*').eq('active',true).order('freezer').order('wall').order('shelf').order('position'),
    sb.from('freezer_placement_view').select('*').order('freezer').order('wall').order('shelf').order('position'),
    sb.from('inventory_location_integrity').select('*').order('flavor')
  ]);
}

async function refreshAll({retryAuth=true,quiet=false}={}){
  if(loading&&!quiet)return;
  if(!quiet)setLoading(true,'Syncing live plant data…');
  try{
    let q=await queryLiveData();
    let failed=q.find(x=>x.error);
    if(failed&&retryAuth&&isAuthTimingError(failed.error)){
      await wait(900);
      await sb.auth.refreshSession();
      await wait(350);
      q=await queryLiveData();
      failed=q.find(x=>x.error);
    }
    if(failed)throw failed.error;

    inventory=(q[0].data||[]).map(r=>({
      productId:r.product_id,
      flavor:r.flavor,
      packageSize:r.package_size,
      onHand:Number(r.on_hand||0),
      reserved:Number(r.reserved||0),
      available:Number(r.available||0),
      labHold:Number(r.lab_hold||0),
      storefront:Number(r.storefront||0)
    }));
    lots=q[1].data||[];
    orders=q[2].data||[];
    slots=q[3].data||[];
    placements=q[4].data||[];
    integrity=q[5].data||[];
    renderEverything();
    message('');
  }catch(error){
    if(isAuthTimingError(error)){
      message('Your login session could not be validated. Sign out and sign in again; the app will not show fake zero inventory while authentication is unhealthy.','error');
      markDataUnavailable();
    }else{
      message(error?.message||'Could not load live inventory.','error');
      markDataUnavailable();
    }
  }finally{
    if(!quiet)setLoading(false);
  }
}

function markDataUnavailable(){
  ['mAvailable','mReserved','mHold','mStore'].forEach(id=>$(id).textContent='—');
  $('inventoryTable').innerHTML='<div class="empty">Live inventory unavailable. Fix the connection before making plant decisions.</div>';
  $('attentionList').innerHTML='<div class="empty">Queues unavailable.</div>';
  $('integritySummary').innerHTML='<div class="integrity-panel bad"><div class="integrity-orb">!</div><div><strong>Integrity check unavailable</strong><p>The app has not confirmed ledger ↔ freezer agreement.</p></div></div>';
}

function switchAuth(session){
  currentSession=session;
  const signedIn=Boolean(session);
  $('auth').classList.toggle('hidden',signedIn);
  $('app').classList.toggle('hidden',!signedIn);
  if(signedIn){
    const email=session.user?.email||'Operator';
    $('operatorEmail').textContent=email;
    $('operatorInitial').textContent=email.slice(0,1).toUpperCase();
    refreshAll();
  }
}

function sum(key){return inventory.reduce((n,x)=>n+Number(x[key]||0),0)}
function inventoryStatus(x){
  if(x.available<=0)return ['OUT','bad'];
  if(x.available<=3)return ['LOW','warn'];
  return ['OK','good'];
}
function percentAvailable(x){
  if(!x.onHand)return 0;
  return Math.max(4,Math.min(100,Math.round((x.available/x.onHand)*100)));
}

function renderEverything(){
  $('mAvailable').textContent=sum('available');
  $('mReserved').textContent=sum('reserved');
  $('mHold').textContent=sum('labHold');
  $('mStore').textContent=sum('storefront');
  renderInventory();
  renderAttention();
  renderIntegrity();
  renderLab();
  renderOrders();
  renderFreezer();
  renderStorefront();
  renderCart();
  renderOptions();
}

function renderInventory(){
  if(!inventory.length){
    $('inventoryTable').innerHTML='<div class="empty">No active products yet. Add the real flavor list before plant use.</div>';
    return;
  }
  $('inventoryTable').innerHTML=`<div class="table-wrap"><table class="data-table">
    <thead><tr><th>Product</th><th>Available</th><th>On hand</th><th>Reserved</th><th>-40°F hold</th><th>Status</th></tr></thead>
    <tbody>${inventory.map(x=>{
      const [status,kind]=inventoryStatus(x);
      return `<tr>
        <td><span class="product-name">${esc(x.flavor)}</span><span class="product-sub">${pkg(x.packageSize)}</span></td>
        <td><span class="qty-strong">${x.available}</span><div class="stock-bar"><div class="stock-fill" style="width:${percentAvailable(x)}%"></div></div></td>
        <td>${x.onHand}</td><td>${x.reserved}</td><td>${x.labHold}</td>
        <td><span class="status-chip ${kind}">${status}</span></td>
      </tr>`;
    }).join('')}</tbody></table></div>`;
}

function renderAttention(){
  const orderGroups=groupedOrders();
  $('attentionList').innerHTML=`<div class="attention-list">
    <button class="attention-row" data-jump="production" style="width:100%;border:0;background:transparent;text-align:left">
      <div class="attention-icon lab">−40</div><div class="attention-copy"><strong>State Lab queue</strong><span>Runs waiting in -40°F</span></div><div class="attention-count">${lots.length}</div>
    </button>
    <button class="attention-row" data-jump="orders" style="width:100%;border:0;background:transparent;text-align:left">
      <div class="attention-icon order">ORD</div><div class="attention-copy"><strong>Orders to pull</strong><span>Reserved customer stock</span></div><div class="attention-count">${orderGroups.length}</div>
    </button>
  </div>`;
  $$('[data-jump]').forEach(b=>b.onclick=()=>goToScreen(b.dataset.jump));
}

function renderIntegrity(){
  const bad=integrity.filter(x=>x.integrity_status!=='MATCH');
  const totalDifference=integrity.reduce((n,x)=>n+Math.abs(Number(x.difference||0)),0);
  if(!integrity.length){
    $('integritySummary').innerHTML='<div class="integrity-panel"><div class="integrity-orb">✓</div><div><strong>No saleable products to reconcile</strong><p>Integrity checks will appear once released product is physically placed.</p></div></div>';
    return;
  }
  $('integritySummary').innerHTML=bad.length
    ? `<div class="integrity-panel bad"><div class="integrity-orb">!</div><div><strong>${bad.length} product${bad.length===1?'':'s'} need review</strong><p>${totalDifference} total unit difference between saleable ledger and -20°F placements. Withdrawals are protected until corrected.</p></div></div>`
    : `<div class="integrity-panel"><div class="integrity-orb">✓</div><div><strong>Inventory and freezer locations match</strong><p>All ${integrity.length} active product record${integrity.length===1?'':'s'} reconcile to physical -20°F placements.</p></div></div>`;
}

function productOptions(){
  return inventory.map(x=>`<option value="${x.productId}">${esc(x.flavor)} · ${pkg(x.packageSize)} · ${x.available} available</option>`).join('');
}

function renderOptions(){
  const options=productOptions();
  ['orderProduct','dairyProduct'].forEach(id=>$(id).innerHTML=options);
  const flavors=[...new Set(inventory.map(x=>x.flavor))];
  $('prodFlavor').innerHTML=flavors.map(f=>`<option>${esc(f)}</option>`).join('');
  const saleable=placements.filter(p=>p.freezer==='-20°F'&&Number(p.quantity)>0);
  $('countPlacement').innerHTML=saleable.length?saleable.map(p=>`<option value="${p.id}">${esc(p.flavor)} · ${pkg(p.package_size)} · J${p.julian} · ${p.wall}/${p.shelf}/P${p.position} · ${p.quantity}</option>`).join(''):'<option value="">No saleable stacks</option>';
  const selected=saleable.find(p=>p.id===$('countPlacement').value)||saleable[0];
  if(selected&&$('countQty').value==='')$('countQty').value=selected.quantity;
}

function renderLab(){
  const saleSlots=slots.filter(s=>s.freezer==='-20°F');
  if(!lots.length){
    $('labQueue').innerHTML='<div class="empty">Nothing waiting for State Lab release.</div>';
    return;
  }
  $('labQueue').innerHTML=`<div class="queue">${lots.map(l=>`<div class="queue-item">
    <div class="queue-item-top"><div><div class="queue-title">${esc(l.flavor)} · ${pkg(l.package_size)}</div><div class="queue-sub">Julian ${l.julian} · ${l.quantity} units currently on -40°F hold</div></div><span class="status-chip warn">PENDING</span></div>
    <div class="queue-actions"><select id="slot-${l.id}">${saleSlots.map(s=>`<option value="${s.id}">${s.wall} wall · ${s.shelf} · Position ${s.position}</option>`).join('')}</select><button class="btn btn-primary btn-compact" data-pass="${l.id}">Pass + place</button><button class="btn btn-danger btn-compact" data-fail="${l.id}">Fail</button></div>
  </div>`).join('')}</div>`;
  $$('[data-pass]').forEach(b=>b.onclick=()=>labPass(b.dataset.pass));
  $$('[data-fail]').forEach(b=>b.onclick=()=>labFail(b.dataset.fail));
}

async function labPass(id){
  const slot=$('slot-'+id)?.value;
  if(!slot)return message('Choose the physical -20°F destination first.','warning');
  await act(sb.rpc('release_and_place_lot',{p_run_id:id,p_slot_id:slot}),'State Lab PASS recorded. Product is now saleable and mapped in -20°F.');
}
async function labFail(id){
  if(!confirm('Mark this production run FAILED and dispose the good quantity?'))return;
  await act(sb.rpc('fail_lab_lot',{p_run_id:id}),'State Lab FAIL recorded and product removed from saleable flow.');
}

function groupedOrders(){
  const map=new Map();
  orders.forEach(row=>{
    if(!map.has(row.order_id))map.set(row.order_id,{id:row.order_id,name:row.customer_name,phone:row.customer_phone,status:row.status,createdAt:row.created_at,items:[]});
    map.get(row.order_id).items.push(row);
  });
  return [...map.values()];
}

function renderOrders(){
  const list=groupedOrders();
  if(!list.length){
    $('openOrders').innerHTML='<div class="empty">No reserved customer orders waiting to be pulled.</div>';
    return;
  }
  $('openOrders').innerHTML=`<div class="queue">${list.map(o=>`<div class="queue-item">
    <div class="queue-item-top"><div><div class="queue-title">${esc(o.name)}</div><div class="queue-sub">${o.phone?esc(o.phone)+' · ':''}${o.items.map(i=>`${i.quantity-i.quantity_pulled} × ${esc(i.flavor)} ${pkg(i.package_size)}`).join(' · ')}</div></div><span class="status-chip neutral">${esc(o.status)}</span></div>
    <div id="pick-${o.id}"></div>
    <div class="queue-actions"><button class="btn btn-soft btn-compact" data-pick="${o.id}">Where to pull</button><button class="btn btn-primary btn-compact" data-complete="${o.id}">Pulled · complete</button><button class="btn btn-danger btn-compact" data-cancel="${o.id}">Cancel</button></div>
  </div>`).join('')}</div>`;
  $$('[data-pick]').forEach(b=>b.onclick=()=>showPick(b.dataset.pick));
  $$('[data-complete]').forEach(b=>b.onclick=()=>completeOrder(b.dataset.complete));
  $$('[data-cancel]').forEach(b=>b.onclick=()=>cancelOrder(b.dataset.cancel));
}

async function showPick(id){
  try{
    const order=groupedOrders().find(x=>x.id===id);
    if(!order)return;
    const lines=[];
    for(const item of order.items){
      const qty=Number(item.quantity)-Number(item.quantity_pulled||0);
      if(qty<=0)continue;
      const {data,error}=await sb.rpc('get_fifo_pick_plan',{p_product_id:item.product_id,p_quantity:qty});
      if(error)throw error;
      (data||[]).forEach(step=>lines.push(`<strong>${esc(item.flavor)}</strong> — pull ${step.quantity_to_pull} · Julian ${step.julian} · ${step.wall} wall / ${step.shelf} / Position ${step.slot_position}`));
    }
    $('pick-'+id).innerHTML=`<div class="pick-plan">${lines.join('<br>')}</div>`;
  }catch(error){message(error?.message||'Could not build FIFO pick plan.','error')}
}
async function completeOrder(id){
  if(!confirm('Confirm the listed units have physically left the freezer?'))return;
  await act(sb.rpc('complete_order_pickup',{p_order_id:id}),'Order completed. Saleable stock and exact FIFO freezer stacks were deducted together.');
}
async function cancelOrder(id){
  await act(sb.rpc('cancel_reserved_order',{p_order_id:id}),'Order cancelled. Reserved quantity is available again.');
}

function renderFreezer(){
  $$('.freezer-tab').forEach(b=>b.classList.toggle('active',b.dataset.freezer===activeFreezer));
  const walls=['BACK','LEFT','RIGHT','ENTRANCE'];
  const filtered=placements.filter(p=>p.freezer===activeFreezer&&Number(p.quantity)>0);
  $('freezerRoom').innerHTML=walls.map(wall=>{
    const stacks=filtered.filter(p=>p.wall===wall);
    return `<section class="wall"><div class="wall-header"><strong>${wall} WALL</strong><span>${stacks.reduce((n,x)=>n+Number(x.quantity||0),0)} units</span></div><div class="wall-body">${stacks.length?stacks.map(p=>`<div class="stack"><div class="stack-flavor">${esc(p.flavor)}</div><div class="stack-meta">${pkg(p.package_size)} · Julian ${p.julian}<br>${p.shelf} · Position ${p.position}</div><div class="stack-qty">${p.quantity}</div></div>`).join(''):'<div class="stack-empty">No product</div>'}</div></section>`;
  }).join('');
}

function renderStorefront(){
  if(!inventory.length){$('storefrontTable').innerHTML='<div class="empty">No product records.</div>';return;}
  $('storefrontTable').innerHTML=`<div class="table-wrap"><table class="data-table"><thead><tr><th>Product</th><th>Storefront</th><th>Saleable</th><th>Rule</th></tr></thead><tbody>${inventory.map(x=>`<tr><td><span class="product-name">${esc(x.flavor)}</span><span class="product-sub">${pkg(x.packageSize)}</span></td><td><span class="qty-strong">${x.storefront}</span></td><td>${x.available}</td><td><span class="status-chip neutral">NOT FOR SALE</span></td></tr>`).join('')}</tbody></table></div>`;
}

function renderCart(){
  $('orderCart').innerHTML=orderCart.length?`<div class="order-cart">${orderCart.map((x,i)=>`<div class="cart-line"><span>${esc(x.label)} × ${x.quantity}</span><button type="button" class="btn btn-danger btn-compact" data-remove="${i}">Remove</button></div>`).join('')}</div>`:'<div class="empty">No products added to this order yet.</div>';
  $$('[data-remove]').forEach(b=>b.onclick=()=>{orderCart.splice(Number(b.dataset.remove),1);renderCart()});
}

async function act(promise,success){
  setLoading(true,'Saving transaction…');
  try{
    const {error}=await promise;
    if(error)throw error;
    await refreshAll({quiet:true});
    message(success);
    return true;
  }catch(error){
    if(isAuthTimingError(error)){
      await sb.auth.refreshSession();
      message('Session refreshed. Please retry the action once.','warning');
    }else message(error?.message||'Could not save the transaction.','error');
    return false;
  }finally{setLoading(false)}
}

function goToScreen(name){
  $$('.nav button').forEach(b=>b.classList.toggle('active',b.dataset.screen===name));
  $$('.screen').forEach(s=>s.classList.toggle('active',s.id===name));
  const [title,subtitle]=titles[name]||titles.dashboard;
  $('screenTitle').textContent=title;
  $('screenSubtitle').textContent=subtitle;
  $('sidebar').classList.remove('open');
  window.scrollTo({top:0,behavior:'smooth'});
}

$('nav').querySelectorAll('button').forEach(b=>b.onclick=()=>goToScreen(b.dataset.screen));
$$('[data-quick]').forEach(b=>b.onclick=()=>goToScreen(b.dataset.quick));
$('mobileMenu').onclick=()=>$('sidebar').classList.toggle('open');
$('refreshBtn').onclick=()=>refreshAll();
$$('.freezer-tab').forEach(b=>b.onclick=()=>{activeFreezer=b.dataset.freezer;renderFreezer()});

$('addOrderLine').onclick=e=>{
  e.preventDefault();
  const productId=$('orderProduct').value;
  const quantity=Number($('orderQty').value);
  const product=inventory.find(x=>x.productId===productId);
  if(!product||!Number.isInteger(quantity)||quantity<1)return message('Choose a valid product and quantity.','warning');
  const existing=orderCart.find(x=>x.productId===productId);
  if(existing)existing.quantity+=quantity;
  else orderCart.push({productId,quantity,label:`${product.flavor} · ${pkg(product.packageSize)}`});
  renderCart();
};

$('reserveOrder').onclick=async()=>{
  const customerName=$('orderCustomer').value.trim();
  if(!customerName||!orderCart.length)return message('Add a customer name and at least one product.','warning');
  const success=await act(sb.rpc('create_and_reserve_order',{
    p_customer_name:customerName,
    p_customer_phone:$('orderPhone').value.trim()||null,
    p_items:orderCart.map(x=>({productId:x.productId,quantity:x.quantity}))
  }),'Customer order reserved. Physical inventory will deduct only after pickup.');
  if(success){orderCart=[];$('orderCustomer').value='';$('orderPhone').value='';renderCart()}
};

$('addProduction').onclick=async()=>{
  const julian=Number($('prodJulian').value);
  const total=Number($('prodTotal').value);
  const storefront=Number($('prodStore').value);
  if(!Number.isInteger(julian)||julian<1||julian>366||!Number.isInteger(total)||total<1||!Number.isInteger(storefront)||storefront<0||storefront>total)return message('Check Julian date and production quantities.','warning');
  await act(sb.rpc('add_production_run',{
    p_julian:julian,
    p_flavor:$('prodFlavor').value,
    p_package_size:$('prodSize').value,
    p_total_produced:total,
    p_storefront_quantity:storefront
  }),'Production recorded. Good product is now on -40°F State Lab hold.');
};

$('dairySubmit').onclick=async()=>{
  const productId=$('dairyProduct').value;
  const quantity=Number($('dairyQty').value);
  if(!productId||!Number.isInteger(quantity)||quantity<1)return message('Choose a valid product and quantity.','warning');
  if(!confirm('Confirm the Dairy Bar is physically taking these units now?'))return;
  await act(sb.rpc('withdraw_dairy_bar',{p_items:[{productId,quantity}]}),'Dairy Bar withdrawal recorded and FIFO freezer stacks deducted.');
};

$('countPlacement').onchange=()=>{
  const placement=placements.find(x=>x.id===$('countPlacement').value);
  if(placement)$('countQty').value=placement.quantity;
};
$('countSubmit').onclick=async()=>{
  const placementId=$('countPlacement').value;
  const physical=Number($('countQty').value);
  if(!placementId||!Number.isInteger(physical)||physical<0)return message('Choose a freezer stack and enter the physical quantity.','warning');
  await act(sb.rpc('reconcile_placement_count',{
    p_placement_id:placementId,
    p_physical_quantity:physical,
    p_reason:$('countReason').value.trim()||'Physical stack count correction'
  }),'Physical stack and inventory ledger reconciled together.');
};

$('authForm').onsubmit=async event=>{
  event.preventDefault();
  const email=$('email').value.trim();
  const password=$('password').value;
  $('authMsg').textContent='Signing in…';
  const {error}=await sb.auth.signInWithPassword({email,password});
  $('authMsg').textContent=error?error.message:'';
};

$('signup').onclick=async()=>{
  const email=$('email').value.trim();
  const password=$('password').value;
  if(!email||password.length<6){$('authMsg').textContent='Enter an email and a password of at least 6 characters.';return;}
  $('authMsg').textContent='Creating operator account…';
  const {data,error}=await sb.auth.signUp({email,password,options:{emailRedirectTo:'https://smathew-dev.github.io/ice-cream-inventory/'}});
  $('authMsg').textContent=error?error.message:(data.session?'Account created.':'Account created. Check your email to confirm it, then sign in.');
};

$('signout').onclick=async()=>{
  await sb.auth.signOut();
  inventory=[];lots=[];orders=[];slots=[];placements=[];integrity=[];orderCart=[];
};

sb.auth.onAuthStateChange((_event,session)=>switchAuth(session));
const {data:{session}}=await sb.auth.getSession();
switchAuth(session);
