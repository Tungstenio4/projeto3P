'use strict';

// ── Estado global + helpers de debug ──

/* ══════════════════════════════════════════════
   ESTADO
══════════════════════════════════════════════ */
let orders = [], clients = {}, revenue = 0, doneCnt = 0,
    newCliCnt = 0, storeOpen = true, filterType = 'all';

// ── Preferências granulares de alerta ──
// Cada chave controla independentemente som e notificação visual por tipo de evento.
let alertPrefs = {
  sndOrder:  true,   // beep ao receber novo pedido
  sndClient: true,   // chime ao cadastrar novo cliente
  sndReady:  true,   // som ao pedido ficar pronto
  visOrder:  true,   // notificação lateral para novos pedidos
  visClient: true,   // notificação lateral para novos clientes
};
const seen = new Set();
let evCount = 0;
 
/* ══════════════════════════════════════════════
   DEBUG HELPERS
══════════════════════════════════════════════ */
function dbSet(id, v) {
  const el = document.getElementById(id);
  if (el) el.textContent = v;
}
function debugLog(msg) {
  console.log('[FC Painel]', msg);
  dbSet('dbLast', msg.slice(0, 60));
}