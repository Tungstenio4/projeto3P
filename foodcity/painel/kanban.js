'use strict';

// ── Kanban — ações sobre pedidos ──

/* ══════════════════════════════════════════════
   ACOES KANBAN
══════════════════════════════════════════════ */
function acceptOrder(id) {
  const o = orders.find(x => x.id === id); if (!o) return;
  showPrepTimeModal(id);
}

/* ── Modal de tempo de preparo ── */
function showPrepTimeModal(id) {
  // Remove modal anterior se existir
  const old = document.getElementById('prepModal'); if (old) old.remove();

  const modal = document.createElement('div');
  modal.id = 'prepModal';
  modal.innerHTML = `
    <div class="prep-backdrop" onclick="closePrepModal()"></div>
    <div class="prep-modal">
      <div class="prep-modal-title">⏱ Tempo de Preparo</div>
      <div class="prep-modal-sub">Pedido <strong>${id}</strong> — Quanto tempo levará?</div>
      <div class="prep-presets">
        <button class="prep-preset" onclick="selectPrepTime(15)">15 min</button>
        <button class="prep-preset" onclick="selectPrepTime(20)">20 min</button>
        <button class="prep-preset" onclick="selectPrepTime(25)">25 min</button>
        <button class="prep-preset" onclick="selectPrepTime(30)">30 min</button>
        <button class="prep-preset" onclick="selectPrepTime(40)">40 min</button>
        <button class="prep-preset" onclick="selectPrepTime(45)">45 min</button>
        <button class="prep-preset" onclick="selectPrepTime(60)">60 min</button>
      </div>
      <div class="prep-custom-row">
        <input class="prep-input" id="prepCustom" type="number" min="1" max="180" placeholder="Personalizado" />
        <span class="prep-min-lbl">min</span>
      </div>
      <div class="prep-modal-actions">
        <button class="prep-confirm" onclick="confirmPrepTime('${id}')">Aceitar Pedido</button>
        <button class="prep-cancel" onclick="closePrepModal()">Cancelar</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // Focar input ao abrir
  setTimeout(() => document.getElementById('prepCustom')?.focus(), 50);

  // Enter confirma
  modal.querySelector('#prepCustom').addEventListener('keydown', e => {
    if (e.key === 'Enter') confirmPrepTime(id);
  });
}

function selectPrepTime(mins) {
  const inp = document.getElementById('prepCustom');
  if (inp) { inp.value = mins; }
  // Destaca o preset selecionado
  document.querySelectorAll('.prep-preset').forEach(b => {
    b.classList.toggle('selected', parseInt(b.textContent) === mins);
  });
}

function confirmPrepTime(id) {
  const inp = document.getElementById('prepCustom');
  const mins = parseInt(inp?.value) || 25;
  closePrepModal();

  const o = orders.find(x => x.id === id); if (!o) return;
  o.status = 'prep';
  o.prepMins = mins;
  o.prepStart = Date.now();
  dbSaveOrder(o);
  renderAll();
  showToast('Pedido ' + id + ' aceito! Preparo: ' + mins + ' min', 'order');
}

function closePrepModal() {
  const m = document.getElementById('prepModal'); if (m) m.remove();
}
function advOrder(id) {
  const o = orders.find(x => x.id === id); if (!o) return;
  if (o.status === 'prep') {
    o.status = 'ready';
    dbSaveOrder(o);
    renderAll();
    if (alertPrefs.sndReady) playChime();
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

  // Remove janela anterior se existir
  document.getElementById('fc-print-window')?.remove();

  const wClass = { '58': 'w58', '80': 'w80', 'A4': 'wA4' }[storeConfig.paperWidth] || 'w80';
  const pageW  = { w58: '58mm', w80: '80mm', wA4: '210mm' }[wClass] || '80mm';
  const pageM  = { w58: '2mm',  w80: '3mm',  wA4: '10mm'  }[wClass] || '3mm';

  // Injeta @page dinâmico para o tamanho correto (sem diálogo manual)
  let dynStyle = document.getElementById('fc-print-page-style');
  if (!dynStyle) {
    dynStyle = document.createElement('style');
    dynStyle.id = 'fc-print-page-style';
    document.head.appendChild(dynStyle);
  }
  dynStyle.textContent = '@page { size: ' + pageW + ' auto; margin: ' + pageM + '; }';

  // Cria div de impressão — oculto na tela, visível no print via print.css
  const win = document.createElement('div');
  win.id = 'fc-print-window';
  win.style.cssText = 'display:none';
  win.innerHTML = buildReceiptHTML(o);
  document.body.appendChild(win);

  // Aguarda render antes de acionar impressão
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.print();
      setTimeout(() => win.remove(), 3000);
    });
  });
}