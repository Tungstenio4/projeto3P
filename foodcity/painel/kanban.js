'use strict';

// ── Kanban — ações sobre pedidos ──

/* ══════════════════════════════════════════════
   ACOES KANBAN
══════════════════════════════════════════════ */
function acceptOrder(id) {
  const o = orders.find(x => x.id === id); if (!o) return;
  o.status = 'prep';
  dbSaveOrder(o);
  renderAll();
  showToast('Pedido ' + id + ' aceito!', 'order');
}
function advOrder(id) {
  const o = orders.find(x => x.id === id); if (!o) return;
  if (o.status === 'prep') {
    o.status = 'ready';
    dbSaveOrder(o);
    renderAll();
    showToast('Pedido ' + id + ' pronto!', 'order');
  } else if (o.status === 'ready') {
    o.status = 'done'; revenue += (o.total || 0); doneCnt++;
    if (o.client?.id && clients[o.client.id]) {
      clients[o.client.id].totalSpent = (clients[o.client.id].totalSpent || 0) + (o.total || 0);
      dbSaveClient(clients[o.client.id]);
    }
    dbSaveOrder(o);
    dbSaveSetting('revenue', revenue);
    dbSaveSetting('doneCnt', doneCnt);
    renderAll();
    showToast('Entregue ' + id + '! +R$ ' + (o.total || 0).toFixed(2), 'order');
  }
}
function rejectOrder(id) {
  const o = orders.find(x => x.id === id); if (!o) return;
  o.status = 'cancelled';
  dbSaveOrder(o);
  renderAll();
  showToast('Pedido ' + id + ' recusado.');
}
function clearDone() {
  const toRemove = orders.filter(o => o.status === 'done');
  toRemove.forEach(o => dbDelete('orders', o.id));
  orders = orders.filter(o => o.status !== 'done');
  renderAll();
  showToast('Entregues removidos.');
}
function clearAll() {
  if (!confirm('Limpar TODOS os dados (pedidos, clientes, eventos)?')) return;
  orders = []; clients = {}; revenue = 0; doneCnt = 0; newCliCnt = 0; seen.clear(); evCount = 0;
  try { localStorage.removeItem('fc_events'); localStorage.removeItem('fc_trigger'); } catch(e) {}
  // Limpa o IndexedDB completamente
  openPainelDB().then(db => {
    ['orders','clients','settings','seen'].forEach(store => {
      try { db.transaction(store, 'readwrite').objectStore(store).clear(); } catch(e) {}
    });
  });
  dbSet('dbEvCount', 0); dbSet('dbLast', '—'); dbSet('dbLS', '—');
  dbSet('dbStatus', 'IndexedDB limpo');
  renderAll();
  showToast('Todos os dados foram limpos.');
}
function printOrder(id) {
  const o = orders.find(x => x.id === id); if (!o) return;
  const w = window.open('', '_blank');
  w.document.write(
    '<html><head><title>Pedido ' + o.id + '</title>' +
    '<style>body{font-family:monospace;padding:1rem;max-width:300px}hr{border:1px dashed #000}.r{display:flex;justify-content:space-between}</style></head><body>' +
    '<h2 style="text-align:center">FOODCITY</h2><hr/>' +
    '<p><b>Pedido:</b> ' + o.id + '</p><p><b>Cliente:</b> ' + (o.client?.name || '—') + '</p>' +
    '<p><b>Tipo:</b> ' + o.type + '</p><p><b>Horario:</b> ' + o.time.toLocaleTimeString('pt-BR') + '</p><hr/>' +
    (o.items || []).map(i => '<div class="r"><span>' + i.qty + 'x ' + i.name + '</span><span>R$ ' + (i.price || 0).toFixed(2) + '</span></div>').join('') +
    '<hr/><div class="r"><b>TOTAL</b><b>R$ ' + (o.total || 0).toFixed(2) + '</b></div>' +
    '<p><b>Pagamento:</b> ' + (o.pay || '—') + '</p>' +
    (o.type !== 'pickup' ? '<p><b>Endereco:</b> ' + (o.client?.addr || o.client?.address || '—') + '</p>' : '') +
    '<hr/><p style="text-align:center">Obrigado!</p></body></html>'
  );
  w.print();
}