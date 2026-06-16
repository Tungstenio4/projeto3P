'use strict';

// ── Init — DOMContentLoaded, BroadcastChannel, polling ──

/* ══════════════════════════════════════════════
   INIT
══════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', function() {
 
  // Relogio
  setInterval(() => { setText('clock', new Date().toLocaleTimeString('pt-BR')); }, 1000);

  // Carrega configurações da loja (nome, endereço, papel) do IndexedDB
  initStoreConfig().then(() => console.log('[FC] storeConfig carregado:', storeConfig));

  // Injeta botão 🖨 Config na topbar (antes do botão Alertas)
  (function injectConfigBtn() {
    const r = document.querySelector('.topbar-r');
    if (!r || document.getElementById('cfgBtn')) return;
    const btn = document.createElement('button');
    btn.className = 'tbtn'; btn.id = 'cfgBtn';
    btn.title = 'Configurações de impressão (papel, nome da loja, rodapé)';
    btn.textContent = '\uD83D\uDDA8 Config';
    btn.onclick = openStoreConfig;
    r.insertBefore(btn, r.firstChild);
  })();

  // Teclas de atalho
  document.addEventListener('keydown', e => {
    if (e.target.matches('input')) return;
    const m = {'1':'nav-pedidos','2':'nav-clientes','3':'nav-historico','4':'nav-relatorios','5':'nav-estoque'};
    if (m[e.key]) document.getElementById(m[e.key])?.click();
    if (e.key === 'n') simulateOrder();
    if (e.key === ',') openStoreConfig();
  });
 
  // Delegacao de eventos
  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    e.stopPropagation();
    const act  = btn.dataset.act;
    const id   = btn.dataset.id   || '';
    const name = btn.dataset.name || '';
    if      (act === 'accept')  { acceptOrder(id); }
    else if (act === 'reject')  { rejectOrder(id); }
    else if (act === 'adv')     { advOrder(id); }
    else if (act === 'print')   { printOrder(id); }
    else if (act === 'restock') { restock(name); }
  });
 
  // ── BroadcastChannel: comunicação instantânea entre abas ──
  let bcOk = false;
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const BC = new BroadcastChannel('foodcity_channel');
      BC.onmessage = e => {
        if (!e.data || !e.data.id) return;
        processEvent(e.data);
        dbSet('dbBC', 'OK · ' + hhmm());
      };
      BC.onerror = () => dbSet('dbBC', 'Erro');
      bcOk = true;
      dbSet('dbBC', 'Ativo');
    } else {
      dbSet('dbBC', 'Nao suportado');
    }
  } catch(e) {
    dbSet('dbBC', 'Erro: ' + e.message);
  }
 
  // ── localStorage: disparo imediato quando outra aba grava ──
  window.addEventListener('storage', e => {
    if (e.key === 'fc_trigger' || e.key === 'fc_events') {
      processLocalStorage();
      dbSet('dbLS', 'Evento · ' + hhmm());
    }
  });
 
  // ── Polling a cada 1s para garantir 100% de captura ──
  setInterval(processLocalStorage, 1000);
 
  // ── Polling adicional mais frequente nos primeiros 10s ──
  let fastPoll = setInterval(processLocalStorage, 300);
  setTimeout(() => clearInterval(fastPoll), 10000);
 
  // Status inicial
  setText('connStatus', 'Ativo');
  dbSet('dbStatus', 'BroadcastChannel ' + (bcOk ? 'OK' : 'indisponivel') + ' + localStorage + polling 1s');
  setText('bridgeTxt', 'Aguardando pedidos de culinaria_v3.html…');
 
  // Render inicial + captura de eventos anteriores
  renderAll();
  renderStock();
  dbSaveStock(); // salva estoque inicial se ainda não existir no DB
  processLocalStorage();
  // Restaura dados do IndexedDB (pedidos, clientes, receita, estoque)
  dbRestorePainel();
});
