'use strict';

// ── IndexedDB client + Bridge (BroadcastChannel / localStorage) ──

/* ═══════════════════════════════════════════════════════════
   INDEXEDDB — banco de dados local do navegador
   Persiste: carrinho, usuário logado, modo de entrega
   Banco: "foodcity_client" · Versão: 1
   Sem servidor, sem instalação, sem limite prático de tamanho.
═══════════════════════════════════════════════════════════ */
 
const DB_NAME = 'foodcity_client';
const DB_VER  = 1;
let clientDB  = null;
 
function openClientDB() {
  return new Promise((resolve, reject) => {
    if (clientDB) { resolve(clientDB); return; }
    const req = indexedDB.open(DB_NAME, DB_VER);
 
    req.onupgradeneeded = e => {
      const db = e.target.result;
      // Store do carrinho: chave = "name+source"
      if (!db.objectStoreNames.contains('cart'))
        db.createObjectStore('cart', { keyPath: 'key' });
      // Store de sessão: chave = "field" (user, mode)
      if (!db.objectStoreNames.contains('session'))
        db.createObjectStore('session', { keyPath: 'field' });
    };
 
    req.onsuccess = e => { clientDB = e.target.result; resolve(clientDB); };
    req.onerror   = e => { console.warn('[IDB] Erro ao abrir:', e); reject(e); };
  });
}
 
/* ── salva array do carrinho inteiro ── */
async function dbSaveCart(cartArr) {
  try {
    const db = await openClientDB();
    const tx = db.transaction('cart', 'readwrite');
    const st = tx.objectStore('cart');
    st.clear();
    cartArr.forEach(item => st.put({ ...item, key: item.name + '|' + item.source }));
  } catch(e) { console.warn('[IDB] saveCart:', e); }
}
 
/* ── carrega carrinho ── */
async function dbLoadCart() {
  try {
    const db = await openClientDB();
    return await new Promise(res => {
      const req = db.transaction('cart', 'readonly').objectStore('cart').getAll();
      req.onsuccess = e => res(e.target.result || []);
      req.onerror   = () => res([]);
    });
  } catch(e) { return []; }
}
 
/* ── salva campo de sessão ── */
async function dbSaveSession(field, value) {
  try {
    const db = await openClientDB();
    db.transaction('session', 'readwrite').objectStore('session').put({ field, value });
  } catch(e) { console.warn('[IDB] saveSession:', e); }
}
 
/* ── carrega campo de sessão ── */
async function dbLoadSession(field) {
  try {
    const db = await openClientDB();
    return await new Promise(res => {
      const req = db.transaction('session', 'readonly').objectStore('session').get(field);
      req.onsuccess = e => res(e.target.result?.value ?? null);
      req.onerror   = () => res(null);
    });
  } catch(e) { return null; }
}
 
/* ── restaura estado ao abrir a página ── */
async function dbRestoreClient() {
  const savedCart = await dbLoadCart();
  if (savedCart.length) {
    cart = savedCart;
    renderCart();
    console.log('[IDB] Carrinho restaurado:', cart.length, 'item(s)');
  }
 
  const savedUser = await dbLoadSession('currentUser');
  if (savedUser) {
    currentUser = savedUser;
    const btn = document.getElementById('loginBtn');
    if (btn) btn.textContent = '◈ ' + currentUser.name;
    console.log('[IDB] Usuário restaurado:', currentUser.name);
  }
 
  const savedMode = await dbLoadSession('orderMode');
  if (savedMode && savedMode !== orderMode) {
    orderMode = savedMode;
    ['mD','mD2'].forEach(id => { const e = document.getElementById(id); if(e) e.classList.toggle('active', orderMode==='delivery'); });
    ['mP','mP2'].forEach(id => { const e = document.getElementById(id); if(e) e.classList.toggle('active', orderMode==='pickup'); });
    console.log('[IDB] Modo restaurado:', orderMode);
  }
}
 
/* ═══════════════════════════════════════════════════════════
   BRIDGE — envia eventos para o painel (mercado_v3.html)
   Usa BroadcastChannel (entre abas/janelas do mesmo servidor)
   + localStorage como fallback e cache persistente.
   Funciona 100% sem servidor externo.
═══════════════════════════════════════════════════════════ */
 
// Canal de comunicação entre abas (mesmo servidor)
const BC = (typeof BroadcastChannel !== 'undefined')
  ? new BroadcastChannel('foodcity_channel')
  : null;
 
function setLiveStatus(ok) {
  const dot = document.querySelector('.live-dot');
  const txt = document.querySelector('.live-txt');
  if (dot) dot.style.background = ok ? 'var(--green)' : 'var(--accent2)';
  if (txt) txt.textContent = ok
    ? 'Sincronizado com o painel da loja'
    : 'Painel da loja — abra mercado.html na mesma aba';
}
 
function bridgeSend(type, payload) {
  const event = {
    type, payload,
    id: Date.now() + '_' + Math.random().toString(36).slice(2, 8),
    ts: Date.now()
  };
 
  // 1. BroadcastChannel — entrega instantânea se o painel estiver aberto
  if (BC) {
    try { BC.postMessage(event); } catch(_) {}
  }
 
  // 2. localStorage — persiste para quando o painel abrir depois
  try {
    let list = JSON.parse(localStorage.getItem('fc_events') || '[]');
    list.unshift(event);
    if (list.length > 500) list.length = 500;
    localStorage.setItem('fc_events', JSON.stringify(list));
    // fc_trigger dispara o storage event no painel instantaneamente
    localStorage.setItem('fc_trigger', event.id);
  } catch(_) {}
 
  setLiveStatus(true);
  console.log('[FC Bridge] Enviado:', type, event.id);
}