'use strict';

// ── Mapa de Calor 7×24 — Edição #2 ──
//
// Renderiza um grid de 7 dias × 24 horas mostrando intensidade de pedidos.
// Fontes de dados (em ordem de prioridade por célula):
//   1. Pedidos AO VIVO do dia atual (array global `orders` de state.js)
//   2. Snapshots dos dias anteriores em localStorage['dailySummaries']
//      → cada snapshot pode conter um campo `hourlyOrders` (array[24])
//         gerado automaticamente por fecharDia() se você aplicar o patch
//         opcional abaixo em ui.js / reports.js.
//
// Compatibilidade: funciona SEM o campo hourlyOrders — dias sem breakdown
// por hora aparecem com a legenda "sem detalhe" em cinza uniforme.
//
// Dependências globais esperadas: orders, getDailySummaries, showToast
// Container esperado no index.html: <div id="ed2-heatmap"></div>

/* ══════════════════════════════════════════════
   CONSTANTES DE ESTILO
══════════════════════════════════════════════ */
const HM_COLORS = [
  // [minOrders, background, text-on-cell]
  // Paleta warm: do cinza escuro ao laranja vibrante
  [0,  'rgba(255,255,255,0.03)', 'transparent'],   // 0 pedidos — célula vazia
  [1,  'rgba(245,192,0,0.18)',   'rgba(245,192,0,0.7)'],
  [2,  'rgba(245,192,0,0.36)',   '#F5C000'],
  [4,  'rgba(230,130,20,0.55)',  '#F5C000'],
  [7,  'rgba(224,80,30,0.72)',   '#fff'],
  [10, 'rgba(224,48,64,0.88)',   '#fff'],
  [15, '#e03040',                '#fff'],
];

function hmColor(n) {
  let cfg = HM_COLORS[0];
  for (const c of HM_COLORS) { if (n >= c[0]) cfg = c; }
  return cfg;
}

/* ══════════════════════════════════════════════
   MONTAGEM DA MATRIZ 7×24
══════════════════════════════════════════════ */

/**
 * Retorna matriz[dayIndex 0..6][hour 0..23] = { count, hasDetail }
 * dayIndex 0 = 6 dias atrás, dayIndex 6 = hoje.
 */
function buildHeatmapMatrix() {
  const summaries = (typeof getDailySummaries === 'function') ? getDailySummaries() : [];
  const matrix = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const row = [];

    if (i === 0) {
      // ── Dia atual: usa o array global `orders` ──
      const hourBuckets = Array(24).fill(0);
      (typeof orders !== 'undefined' ? orders : [])
        .filter(o => o.status !== 'cancelled')
        .forEach(o => {
          const h = new Date(o.time).getHours();
          if (h >= 0 && h < 24) hourBuckets[h]++;
        });
      for (let h = 0; h < 24; h++) row.push({ count: hourBuckets[h], hasDetail: true, isToday: true });

    } else {
      // ── Dias anteriores: busca snapshot ──
      const snap = summaries.find(s => s.date === key);
      if (!snap) {
        // Nenhum dado para esse dia
        for (let h = 0; h < 24; h++) row.push({ count: 0, hasDetail: false, noData: true });
      } else if (snap.hourlyOrders && snap.hourlyOrders.length === 24) {
        // Snapshot com breakdown por hora
        for (let h = 0; h < 24; h++) row.push({ count: snap.hourlyOrders[h] || 0, hasDetail: true });
      } else {
        // Snapshot só com total — distribui o total uniformemente entre 10h e 22h
        const total = snap.orders || 0;
        const activeHours = 12; // horas prováveis de operação
        for (let h = 0; h < 24; h++) {
          const isActive = h >= 10 && h < 22;
          row.push({ count: isActive ? Math.round(total / activeHours * 10) / 10 : 0, hasDetail: false });
        }
      }
    }

    matrix.push({ key, row, dayIndex: 6 - i });
  }

  return matrix;
}

/* ══════════════════════════════════════════════
   RENDER PRINCIPAL
══════════════════════════════════════════════ */
function renderHeatmap() {
  const container = document.getElementById('ed2-heatmap');
  if (!container) return;

  const matrix = buildHeatmapMatrix();

  // Valor máximo global (para normalização da legenda)
  let maxVal = 1;
  matrix.forEach(({ row }) => row.forEach(cell => { if (cell.count > maxVal) maxVal = cell.count; }));

  // Labels dos dias
  const dayLabels = matrix.map(({ key, row }) => {
    const d = new Date(key + 'T12:00:00');
    const isToday = row[0]?.isToday;
    const wd = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
    const dm = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    return { wd, dm, isToday };
  });

  // Labels das horas (só mostra a cada 3h para não poluir)
  const hourLabels = Array.from({ length: 24 }, (_, h) => (h % 3 === 0) ? String(h).padStart(2, '0') : '');

  /* ── CSS inline (escopo .hm-*) ── */
  if (!document.getElementById('hm-style')) {
    const s = document.createElement('style');
    s.id = 'hm-style';
    s.textContent = `
      .hm-card {
        background: var(--surface, #1a120a);
        border: 1px solid var(--border, rgba(255,255,255,.08));
        border-radius: .5rem;
        padding: 1rem 1.2rem 1rem 1rem;
        margin-bottom: 1rem;
      }
      .hm-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: .75rem;
        flex-wrap: wrap;
        gap: .4rem;
      }
      .hm-title {
        font-family: 'Barlow Condensed', sans-serif;
        font-size: .78rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: .07em;
        color: var(--muted, #888);
      }
      .hm-metric-sel {
        display: flex;
        gap: .3rem;
      }
      .hm-ms-btn {
        background: rgba(255,255,255,.06);
        border: 1px solid rgba(255,255,255,.1);
        border-radius: .25rem;
        color: var(--muted, #888);
        font-family: 'Barlow Condensed', sans-serif;
        font-size: .65rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: .05em;
        padding: .18rem .5rem;
        cursor: pointer;
        transition: background .15s, color .15s, border-color .15s;
      }
      .hm-ms-btn.active {
        background: var(--orange, #F5C000);
        border-color: var(--orange, #F5C000);
        color: #1a0a00;
      }
      .hm-grid-wrap {
        overflow-x: auto;
        overflow-y: visible;
      }
      .hm-grid {
        display: grid;
        /* col 0: label dias | cols 1-24: horas */
        grid-template-columns: 3.4rem repeat(24, minmax(0, 1fr));
        gap: 2px;
        min-width: 520px;
      }
      .hm-hour-hdr {
        font-size: .5rem;
        color: var(--muted, #666);
        text-align: center;
        padding-bottom: .15rem;
        font-family: 'JetBrains Mono', monospace;
        line-height: 1;
        align-self: end;
      }
      .hm-day-lbl {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: flex-end;
        padding-right: .4rem;
        gap: .05rem;
      }
      .hm-day-wd {
        font-family: 'Barlow Condensed', sans-serif;
        font-size: .6rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: .04em;
        color: var(--fg, #e0d0c0);
        line-height: 1;
      }
      .hm-day-wd.today { color: var(--orange, #F5C000); }
      .hm-day-dm {
        font-family: 'JetBrains Mono', monospace;
        font-size: .48rem;
        color: var(--muted, #666);
        line-height: 1;
      }
      .hm-cell {
        height: 18px;
        border-radius: 2px;
        cursor: default;
        position: relative;
        transition: transform .1s, box-shadow .1s;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .hm-cell:hover { transform: scale(1.35); z-index: 10; box-shadow: 0 2px 8px rgba(0,0,0,.5); }
      .hm-cell-lbl {
        font-size: .42rem;
        font-family: 'JetBrains Mono', monospace;
        font-weight: 700;
        pointer-events: none;
        line-height: 1;
      }
      /* Tooltip nativo via title é suficiente; .hm-tip é reserva */
      .hm-legend {
        display: flex;
        align-items: center;
        gap: .3rem;
        margin-top: .6rem;
        flex-wrap: wrap;
      }
      .hm-leg-lbl {
        font-size: .52rem;
        color: var(--muted, #666);
        font-family: 'Barlow Condensed', sans-serif;
        letter-spacing: .04em;
        margin-right: .1rem;
      }
      .hm-leg-swatch {
        width: 14px; height: 10px;
        border-radius: 2px;
        display: inline-block;
      }
      .hm-leg-val {
        font-size: .48rem;
        color: var(--muted, #666);
        font-family: 'JetBrains Mono', monospace;
      }
      .hm-no-data-note {
        font-size: .56rem;
        color: var(--muted, #666);
        font-family: 'Barlow', sans-serif;
        margin-top: .4rem;
        font-style: italic;
      }
    `;
    document.head.appendChild(s);
  }

  /* ── HTML do grid ── */
  // Linha 0: cabeçalho das horas
  let gridHTML = `<div></div>`; // célula vazia no canto superior esquerdo
  for (let h = 0; h < 24; h++) {
    gridHTML += `<div class="hm-hour-hdr">${hourLabels[h]}</div>`;
  }

  // Uma linha por dia
  let hasAnyNoDetail = false;
  matrix.forEach(({ row }, di) => {
    const { wd, dm, isToday } = dayLabels[di];
    const wdCls = isToday ? 'hm-day-wd today' : 'hm-day-wd';
    gridHTML += `<div class="hm-day-lbl"><span class="${wdCls}">${wd}</span><span class="hm-day-dm">${dm}</span></div>`;

    row.forEach((cell, h) => {
      if (cell.noData) {
        hasAnyNoDetail = true;
        gridHTML += `<div class="hm-cell" style="background:rgba(255,255,255,0.03)" title="${wd} ${dm} · ${h}h — sem dados"></div>`;
        return;
      }
      const n = Math.round(cell.count);
      const [, bg, fg] = hmColor(n);
      const lbl = n > 0 ? String(n) : '';
      const detailNote = !cell.hasDetail && n > 0 ? ' (estimativa)' : '';
      if (!cell.hasDetail && n > 0) hasAnyNoDetail = true;
      gridHTML += `<div class="hm-cell" style="background:${bg}" title="${wd} ${dm} · ${h}h–${h+1}h · ${n} pedido${n !== 1 ? 's' : ''}${detailNote}">` +
        (n > 0 ? `<span class="hm-cell-lbl" style="color:${fg}">${lbl}</span>` : '') +
        `</div>`;
    });
  });

  // Legenda de intensidade
  const legendSwatches = HM_COLORS.map(([minV, bg]) => {
    if (minV === 0) return `<span class="hm-leg-swatch" style="background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.1)"></span>`;
    return `<span class="hm-leg-swatch" style="background:${bg}"></span>`;
  }).join('');
  const legendVals = HM_COLORS.map(([minV]) => `<span class="hm-leg-val">${minV === 0 ? '0' : '≥' + minV}</span>`).join('');

  const noDetailNote = hasAnyNoDetail
    ? `<div class="hm-no-data-note">* Dias sem breakdown por hora mostram estimativa ou ficam vazios — use "Fechar Dia" com o patch hourlyOrders para dados completos.</div>`
    : '';

  container.innerHTML = `
    <div class="hm-card">
      <div class="hm-header">
        <div class="hm-title">🔥 Mapa de Calor — Pedidos por Hora (7 dias)</div>
      </div>
      <div class="hm-grid-wrap">
        <div class="hm-grid">${gridHTML}</div>
      </div>
      <div class="hm-legend">
        <span class="hm-leg-lbl">Menos</span>
        ${legendSwatches}
        <span class="hm-leg-lbl">Mais</span>
        &nbsp;
        ${legendVals}
      </div>
      ${noDetailNote}
    </div>
  `;
}

/* ══════════════════════════════════════════════
   PATCH OPCIONAL — fecharDia com hourlyOrders
   Cole este bloco em ui.js / reports.js para
   enriquecer os snapshots com breakdown por hora.
   (Substitui a função fecharDia existente)
══════════════════════════════════════════════

function fecharDia() {
  if (!confirm('Fechar o dia e arquivar as métricas de hoje?')) return;
  const live = liveMetrics();
  const key  = todayKey();

  // Breakdown por hora
  const hourlyOrders = Array(24).fill(0);
  orders
    .filter(o => o.status !== 'cancelled')
    .forEach(o => {
      const h = new Date(o.time).getHours();
      if (h >= 0 && h < 24) hourlyOrders[h]++;
    });

  let summaries = getDailySummaries();
  summaries = summaries.filter(s => s.date !== key);
  summaries.unshift({
    date: key,
    revenue: live.revenue,
    orders: live.doneCnt,
    avgTicket: live.avgTicket,
    hourlyOrders        // ← campo novo
  });
  if (summaries.length > 60) summaries.length = 60;
  saveDailySummaries(summaries);
  showToast('Dia ' + key + ' arquivado! Receita: R$ ' + live.revenue.toFixed(2));
  renderReports();
}

══════════════════════════════════════════════ */
