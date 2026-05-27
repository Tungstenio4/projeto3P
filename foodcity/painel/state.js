'use strict';

// ── Estado global + helpers de debug ──

/* ══════════════════════════════════════════════
   ESTADO
══════════════════════════════════════════════ */
let orders = [], clients = {}, revenue = 0, doneCnt = 0,
    newCliCnt = 0, soundOn = true, storeOpen = true, filterType = 'all';
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