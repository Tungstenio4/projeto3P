'use strict';

// ── Relatórios — Edição #2: métricas comparativas + renderReports ──

/* ══════════════════════════════════════════════
   EDIÇÃO #2 — HELPERS DE COMPARAÇÃO DIÁRIA
   Depende de dailySummaries no localStorage,
   populado pelo botão "Fechar Dia" (Edição #1).
══════════════════════════════════════════════ */

function getDailySummaries() {
  try { return JSON.parse(localStorage.getItem('dailySummaries') || '[]'); }
  catch { return []; }
}
function saveDailySummaries(arr) {
  try { localStorage.setItem('dailySummaries', JSON.stringify(arr)); } catch(e) {}
}
function todayKey() { return new Date().toISOString().slice(0, 10); }

function liveMetrics() {
  const done = orders.filter(o => o.status !== 'cancelled');
  const rev   = revenue;          // acumulado pelos pedidos entregues
  const cnt   = doneCnt;
  const avg   = cnt > 0 ? rev / cnt : 0;
  return { revenue: rev, orders: done.length, doneCnt: cnt, avgTicket: avg };
}

function fmtVariation(current, previous) {
  if (previous == null || previous === 0) return { text: '—', cls: 'flat' };
  const pct = ((current - previous) / previous) * 100;
  if (Math.abs(pct) < 0.5) return { text: '≈ 0%', cls: 'flat' };
  const arrow = pct > 0 ? '▲' : '▼';
  return { text: arrow + ' ' + Math.abs(pct).toFixed(1) + '%', cls: pct > 0 ? 'up' : 'down' };
}

function yesterdaySummary(summaries) {
  const d = new Date(); d.setDate(d.getDate() - 1);
  const key = d.toISOString().slice(0, 10);
  return summaries.find(s => s.date === key) || null;
}

function last7Days(summaries) {
  const live = liveMetrics();
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key   = d.toISOString().slice(0, 10);
    const label = i === 0 ? 'hoje' : d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
    if (i === 0) {
      days.push({ date: key, label, revenue: live.revenue, orders: live.doneCnt, avgTicket: live.avgTicket, isToday: true });
    } else {
      const snap = summaries.find(s => s.date === key);
      days.push({ date: key, label, revenue: snap ? snap.revenue : 0, orders: snap ? snap.orders : 0,
                  avgTicket: snap ? snap.avgTicket : 0, isToday: false, noData: !snap });
    }
  }
  return days;
}

function avg30Days(summaries) {
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);
  const valid = summaries.filter(s => new Date(s.date) >= cutoff && s.orders > 0);
  if (!valid.length) return null;
  const n = valid.length;
  return {
    revenue:   valid.reduce((a, s) => a + s.revenue,   0) / n,
    orders:    valid.reduce((a, s) => a + s.orders,    0) / n,
    avgTicket: valid.reduce((a, s) => a + s.avgTicket, 0) / n,
    days: n
  };
}

/* Fecha o dia ativo e arquiva em dailySummaries */
function fecharDia() {
  if (!confirm('Fechar o dia e arquivar as métricas de hoje?')) return;
  const live = liveMetrics();
  const key  = todayKey();
  let summaries = getDailySummaries();
  summaries = summaries.filter(s => s.date !== key); // evita duplicata
  summaries.unshift({ date: key, revenue: live.revenue, orders: live.doneCnt, avgTicket: live.avgTicket });
  if (summaries.length > 60) summaries.length = 60;  // mantém 60 dias
  saveDailySummaries(summaries);
  showToast('Dia ' + key + ' arquivado! Receita: R$ ' + live.revenue.toFixed(2));
  renderReports();
}