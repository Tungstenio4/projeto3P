'use strict';

// ── Bridge — handlers de eventos e receiver BroadcastChannel/localStorage ──

/* ══════════════════════════════════════════════
   HANDLERS DE EVENTOS
══════════════════════════════════════════════ */
function onNewClient(d) {
  if (!d || !d.id) return;
  const first = !clients[d.id];
  clients[d.id] = {
    id: d.id,
    name: d.name || 'Sem nome',
    email: d.email || '',
    phone: d.phone || '',
    address: d.address || '',
    cep: d.cep || '',
    registeredAt: d.registeredAt || new Date().toISOString(),
    orderCount: clients[d.id]?.orderCount || 0,
    totalSpent:  clients[d.id]?.totalSpent || 0,
    isNew: true
  };
  dbSaveClient(clients[d.id]);
  if (first) {
    newCliCnt++;
    dbSaveSetting('newCliCnt', newCliCnt);
    showNotif('👤', 'Novo Cliente: ' + d.name,
      (d.email ? d.email : '') + (d.phone ? ' · ' + d.phone : '') + (d.address ? '\n' + d.address : ''), 'nc');
    showToast('Novo cliente: ' + d.name, 'client');
    setText('bridgeTxt', 'Ultimo: ' + d.name + ' — ' + hhmm());
    debugLog('NEW_CLIENT: ' + d.name);
    if (soundOn) playChime();
  }
}
 
function onClientLogin(d) {
  if (d?.id && clients[d.id]) {
    clients[d.id].lastLogin = d.loginAt;
    dbSaveClient(clients[d.id]);
    debugLog('CLIENT_LOGIN: ' + (clients[d.id]?.name || d.id));
  }
}
 
function onAddrUpdate(d) {
  if (d?.clientId && clients[d.clientId]) {
    clients[d.clientId].address = d.address;
    clients[d.clientId].cep = d.cep;
    dbSaveClient(clients[d.clientId]);
    debugLog('ADDR_UPDATE: ' + d.address);
  }
}
 
function onNewOrder(d) {
  if (!d || !d.id) return;
  if (orders.find(o => o.id === d.id)) {
    debugLog('Order duplicada ignorada: ' + d.id);
    return;
  }
  const isNC = clients[d.client?.id]?.isNew;
  const newOrder = { ...d, time: new Date(d.time || Date.now()), status: 'new', isNewClient: !!isNC };
  orders.unshift(newOrder);
  dbSaveOrder(newOrder);
  if (d.client?.id && clients[d.client.id]) {
    clients[d.client.id].orderCount++;
    clients[d.client.id].isNew = false;
    dbSaveClient(clients[d.client.id]);
  }
  showNotif('📦', 'Pedido ' + d.id + (isNC ? ' — 1o pedido!' : ''),
    (d.client?.name || '') + ' · R$ ' + (d.total || 0).toFixed(2) + ' · ' +
    (d.type === 'market' ? 'Mercado' : d.type === 'delivery' ? 'Delivery' : 'Retirada'), 'no');
  showToast('Pedido ' + d.id + ' recebido!', 'order');
  setText('ordSub',   'Ultimo: ' + d.id + ' de ' + d.client?.name + ' — ' + hhmm());
  setText('bridgeTxt','Ultimo: ' + d.id + ' de ' + d.client?.name + ' — ' + hhmm());
  debugLog('NEW_ORDER: ' + d.id + ' R$ ' + (d.total || 0).toFixed(2));
  if (soundOn) playBeep();
}
 
function onOrderStatus(d) {
  debugLog('ORDER_STATUS: ' + d?.orderId + ' = ' + d?.status);
}
 
function handleEvent(type, payload) {
  if (!payload) return;
  const map = {
    NEW_CLIENT: onNewClient,
    CLIENT_LOGIN: onClientLogin,
    CLIENT_ADDRESS_UPDATE: onAddrUpdate,
    NEW_ORDER: onNewOrder,
    ORDER_STATUS: onOrderStatus
  };
  if (map[type]) map[type](payload);
  else debugLog('Tipo desconhecido: ' + type);
}
 
/* ══════════════════════════════════════════════
   BRIDGE — recebe de culinaria_v3.html
══════════════════════════════════════════════ */
function processEvent(ev) {
  if (!ev || !ev.id || seen.has(ev.id)) return;
  seen.add(ev.id);
  dbMarkSeen(ev.id);
  evCount++;
  dbSet('dbEvCount', evCount);
  dbSaveSetting('evCount', evCount);
  handleEvent(ev.type, ev.payload);
  renderAll();
}
 
function processLocalStorage() {
  let evs = [];
  try {
    const raw = localStorage.getItem('fc_events');
    if (!raw) return;
    evs = JSON.parse(raw);
  } catch(e) {
    debugLog('LS parse error: ' + e.message);
    return;
  }
  if (!Array.isArray(evs) || !evs.length) return;
  let changed = false;
  // percorre do mais antigo ao mais novo
  for (let i = evs.length - 1; i >= 0; i--) {
    const ev = evs[i];
    if (!ev || !ev.id || seen.has(ev.id)) continue;
    processEvent(ev);
    changed = true;
  }
  if (changed) {
    const cnt = localStorage.getItem('fc_events');
    dbSet('dbLS', 'OK · ' + (cnt ? JSON.parse(cnt).length : 0) + ' ev');
    renderAll();
  }
}