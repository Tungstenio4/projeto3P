'use strict';

// ── Render — renderAll, KPIs, Kanban, Clientes, Histórico ──

/* ══════════════════════════════════════════════
   RENDER
══════════════════════════════════════════════ */
function renderAll() {
  renderKPIs(); renderBoards(); renderCliTable(); renderHistory();
  updateBadges(); updateSidebar(); checkStockAlerts();
}

/* ── Ticker: atualiza countdowns a cada segundo sem re-renderizar os cards ── */
setInterval(() => {
  document.querySelectorAll('.cd-wrap[data-oid]').forEach(el => {
    const oid = el.dataset.oid;
    const o = orders.find(x => x.id === oid);
    if (!o || !o.prepMins || !o.prepStart) return;
    const elapsed   = Math.floor((Date.now() - o.prepStart) / 1000);
    const totalSecs = o.prepMins * 60;
    const remaining = Math.max(totalSecs - elapsed, 0);
    const m = Math.floor(remaining / 60), s = remaining % 60;
    const pct = Math.min((elapsed / totalSecs) * 100, 100);
    const isLate = remaining === 0;
    const isWarn = !isLate && pct >= 75;
    const cls = isLate ? 'cdlate' : isWarn ? 'cdwarn' : 'cdok';
    const label = isLate ? '⚠ Atrasado!' : m + ':' + String(s).padStart(2, '0');

    // Atualiza classes
    el.className = 'cd-wrap ' + cls;
    const bar = el.querySelector('.cd-bar-fg');
    if (bar) { bar.style.width = pct.toFixed(1) + '%'; bar.className = 'cd-bar-fg ' + cls; }
    const lbl = el.querySelector('.cd-lbl');
    if (lbl) lbl.textContent = '⏱ ' + (isLate ? 'Tempo esgotado' : 'Restante');
    const val = el.querySelector('.cd-val');
    if (val) { val.textContent = label; val.className = 'cd-val ' + cls; }
  });
}, 1000);
function setText(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; }
function setHTML(id, v) { const el = document.getElementById(id); if (el) el.innerHTML = v; }
 
function renderKPIs() {
  const a = orders.filter(o => o.status !== 'cancelled');
  setText('kNew',     a.filter(o => o.status === 'new').length);
  setText('kPrep',    a.filter(o => o.status === 'prep').length);
  setText('kDone',    doneCnt);
  setText('kCli',     newCliCnt);
  setText('kRev',     'R$ ' + revenue.toFixed(2).replace('.', ','));
  setText('kRevSub',  doneCnt + ' pedidos entregues');
  setText('rRevenue', 'R$ ' + revenue.toFixed(2).replace('.', ','));
  setText('rTotal',   a.length);
  setText('rDelivery',a.filter(o => o.type === 'delivery').length);
  setText('rClients', Object.keys(clients).length);
  setText('rTicket',  'R$ ' + (doneCnt > 0 ? revenue / doneCnt : 0).toFixed(2).replace('.', ','));
}
 
function renderBoards() {
  const q  = (document.getElementById('srch')?.value || '').toLowerCase();
  const av = orders.filter(o => o.status !== 'cancelled');
  const fi = av.filter(o => {
    if (filterType !== 'all' && o.type !== filterType) return false;
    if (q && !o.client?.name?.toLowerCase().includes(q) && !o.id?.includes(q)) return false;
    return true;
  });
  const cols = { new: [], prep: [], ready: [], done: [] };
  fi.forEach(o => { if (cols[o.status]) cols[o.status].push(o); });
  const cnt  = { new: 0, prep: 0, ready: 0, done: 0 };
  av.forEach(o => { if (cnt[o.status] !== undefined) cnt[o.status]++; });
 
  [['N','new'],['P','prep'],['R','ready'],['D','done']].forEach(([k, s]) => {
    setText('cnt' + k, cnt[s]);
    setHTML('col' + k, cols[s].length
      ? cols[s].map(o => cardHTML(o)).join('')
      : '<div class="empty-col"><div class="ei">📭</div>Nenhum pedido</div>');
  });
 
  const tc = { delivery: 0, pickup: 0, market: 0 };
  av.forEach(o => { if (tc[o.type] !== undefined) tc[o.type]++; });
  setText('fcAll',  av.length);
  setText('fcDel',  tc.delivery);
  setText('fcPick', tc.pickup);
  setText('fcMkt',  tc.market);
}
 
function cardHTML(o) {
  const tl = o.type === 'delivery' ? 'Delivery' : o.type === 'market' ? 'Mercado' : 'Retirada';
  const pc = o.pay === 'Pix' ? 'pix' : o.pay === 'Cartão' ? 'card' : 'cash';
  const t  = o.time instanceof Date ? o.time : new Date(o.time);
  const sc = { prep: 'oprep', ready: 'oready', done: 'odone' }[o.status] || 'onew';
  const it = o.items || [];

  // ── Countdown para pedidos em preparo ──
  let countdownHTML = '';
  if (o.status === 'prep' && o.prepMins && o.prepStart) {
    const elapsed   = Math.floor((Date.now() - o.prepStart) / 1000);
    const totalSecs = o.prepMins * 60;
    const remaining = Math.max(totalSecs - elapsed, 0);
    const m = Math.floor(remaining / 60), s = remaining % 60;
    const pct = Math.min((elapsed / totalSecs) * 100, 100);
    const isLate = remaining === 0;
    const isWarn = !isLate && pct >= 75;
    const cls = isLate ? 'cdlate' : isWarn ? 'cdwarn' : 'cdok';
    const label = isLate
      ? '⚠ Atrasado!'
      : m + ':' + String(s).padStart(2, '0');
    countdownHTML =
      '<div class="cd-wrap ' + cls + '" data-oid="' + o.id + '">'
      + '<div class="cd-bar-bg"><div class="cd-bar-fg ' + cls + '" style="width:' + pct.toFixed(1) + '%"></div></div>'
      + '<div class="cd-row">'
      + '<span class="cd-lbl">⏱ ' + (isLate ? 'Tempo esgotado' : 'Restante') + '</span>'
      + '<span class="cd-val ' + cls + '">' + label + '</span>'
      + '</div></div>';
  }

  let acts = '';
  if (o.status === 'new')
    acts = '<button class="ob acc" data-act="accept" data-id="' + o.id + '">Aceitar</button>'
         + '<button class="ob rej" data-act="reject" data-id="' + o.id + '">Recusar</button>'
         + '<button class="ob prt" data-act="print"  data-id="' + o.id + '">Imprimir</button>';
  else if (o.status === 'prep')
    acts = '<button class="ob nxt" data-act="adv"   data-id="' + o.id + '">Pronto</button>'
         + '<button class="ob prt" data-act="print" data-id="' + o.id + '">Imprimir</button>';
  else if (o.status === 'ready')
    acts = '<button class="ob dnb" data-act="adv"   data-id="' + o.id + '">Entregue</button>'
         + '<button class="ob prt" data-act="print" data-id="' + o.id + '">Imprimir</button>';
  else
    acts = '<button class="ob prt" data-act="print" data-id="' + o.id + '">Imprimir</button>';

  return (
    '<div class="oc ' + sc + (o.isNewClient ? ' nc' : '') + '">'
    + '<div class="ot"><span class="oid">' + o.id + '</span>'
    + '<span class="otype ' + (o.type || 'delivery') + '">' + tl + '</span>'
    + (o.isNewClient ? '<span class="ncb">1o pedido</span>' : '')
    + '<span class="otime">' + t.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) + '</span></div>'
    + '<div class="oclient">' + (o.client?.name || 'Cliente') + '</div>'
    + '<div class="oaddr">' + (o.type !== 'pickup' ? (o.client?.addr || o.client?.address || 'Endereco nao informado') : 'Retirada no balcao') + '</div>'
    + '<div class="oitems">'
    + it.slice(0, 3).map(i =>
        '<div class="oir"><span><span class="oiq">' + i.qty + '×</span>'
        + '<span class="oin">' + i.name + '</span></span>'
        + '<span class="oip">R$ ' + (i.price || 0).toFixed(2).replace('.', ',') + '</span></div>'
      ).join('')
    + (it.length > 3 ? '<div style="font-size:.58rem;color:var(--muted);padding-top:.1rem">+' + (it.length - 3) + ' item(s)…</div>' : '')
    + '</div>'
    + countdownHTML
    + '<div class="ofooter">'
    + '<span class="ototal">R$ ' + (o.total || 0).toFixed(2).replace('.', ',') + '</span>'
    + '<span class="opay ' + pc + '">' + (o.pay || '—') + '</span></div>'
    + '<div class="oacts">' + acts + '</div></div>'
  );
}
 
function renderCliTable() {
  const tb = document.getElementById('cliTable'); if (!tb) return;
  const list = Object.values(clients).sort((a, b) => new Date(b.registeredAt || 0) - new Date(a.registeredAt || 0));
  if (!list.length) {
    tb.innerHTML = '<tr><td colspan="9" class="no-data"><div class="ni">👥</div>'
      + 'Nenhum cliente ainda.<br/>'
      + '<small style="font-size:.7rem">Quando alguem se cadastrar no '
      + '<a href="../cliente/index.html" target="_blank" style="color:var(--yellow)">site do cliente</a>'
      + ', aparecera aqui.</small></td></tr>';
    return;
  }
  tb.innerHTML = list.map(c =>
    '<tr class="' + (c.isNew && c.orderCount === 0 ? 'new-row' : '') + '">'
    + '<td><span class="cpill ' + (c.orderCount > 0 ? 'cliente' : 'novo') + '">' + (c.orderCount > 0 ? 'Cliente' : 'Novo') + '</span></td>'
    + '<td style="font-weight:600;color:var(--cream)">' + c.name + '</td>'
    + '<td class="mono" style="font-size:.66rem">' + (c.email || '—') + '</td>'
    + '<td class="mono">' + (c.phone || '—') + '</td>'
    + '<td style="font-size:.68rem;max-width:180px;word-break:break-word">' + (c.address || '—') + '</td>'
    + '<td class="mono">' + (c.cep || '—') + '</td>'
    + '<td style="text-align:center;color:var(--yellow)">' + (c.orderCount || 0) + '</td>'
    + '<td class="mono" style="color:var(--olive3)">R$ ' + (c.totalSpent || 0).toFixed(2).replace('.', ',') + '</td>'
    + '<td class="mono" style="font-size:.62rem">' + (c.registeredAt ? new Date(c.registeredAt).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : '—') + '</td>'
    + '</tr>'
  ).join('');
}
 
function renderHistory() {
  const tb = document.getElementById('histTable'); if (!tb) return;
  const list = [...orders].reverse();
  const sl = { new: 'Aguardando', prep: 'Preparando', ready: 'Pronto', done: 'Entregue', cancelled: 'Cancelado' };
  if (!list.length) {
    tb.innerHTML = '<tr><td colspan="8" class="no-data"><div class="ni">📋</div>Nenhum pedido ainda.</td></tr>';
    return;
  }
  tb.innerHTML = list.map(o =>
    '<tr>'
    + '<td class="mono" style="color:var(--yellow)">' + o.id + '</td>'
    + '<td style="font-weight:600">' + (o.client?.name || '—') + '</td>'
    + '<td>' + (o.type || '—') + '</td>'
    + '<td>' + (o.items || []).length + ' item(s)</td>'
    + '<td class="mono" style="color:var(--olive3)">R$ ' + (o.total || 0).toFixed(2).replace('.', ',') + '</td>'
    + '<td>' + (o.pay || '—') + '</td>'
    + '<td><span class="spill ' + (o.status || 'new') + '">' + (sl[o.status] || o.status) + '</span></td>'
    + '<td class="mono" style="font-size:.65rem">' + (o.time instanceof Date ? o.time : new Date(o.time)).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) + '</td>'
    + '</tr>'
  ).join('');
}
 
function renderReports() {
  renderKPIs();

  /* ── Edição #2: bloco "vs. ontem" nos KPIs ── */
  (function renderVsOntem() {
    const summaries = getDailySummaries();
    const yest = yesterdaySummary(summaries);
    const live = liveMetrics();

    // limpa badges anteriores
    document.querySelectorAll('#relKpiRow .kpi-vs').forEach(el => el.remove());

    const metrics = [
      { key: 'revenue',   val: live.revenue,   prev: yest ? yest.revenue   : null, fmt: v => 'R$\u00a0' + v.toFixed(2).replace('.', ',') },
      { key: 'orders',    val: live.doneCnt,   prev: yest ? yest.orders    : null, fmt: v => v + ' pedidos' },
      { key: 'avgTicket', val: live.avgTicket, prev: yest ? yest.avgTicket : null, fmt: v => 'R$\u00a0' + v.toFixed(2).replace('.', ',') }
    ];
    metrics.forEach(m => {
      const card = document.querySelector('#relKpiRow .kpi[data-key="' + m.key + '"]');
      if (!card || m.prev == null) return;
      const v = fmtVariation(m.val, m.prev);
      const badge = document.createElement('div');
      badge.className = 'kpi-vs ' + v.cls;
      badge.title = 'Ontem: ' + m.fmt(m.prev);
      badge.textContent = 'vs. ontem\u00a0' + v.text;
      card.appendChild(badge);
    });

    // botão "Fechar Dia" no cabeçalho da página (insere uma vez)
    if (!document.getElementById('btnFecharDia')) {
      const ph = document.querySelector('#page-relatorios .ph-actions');
      if (ph) {
        const btn = document.createElement('button');
        btn.className = 'btn-sm teal'; btn.id = 'btnFecharDia';
        btn.textContent = 'Fechar Dia'; btn.onclick = fecharDia;
        ph.insertBefore(btn, ph.firstChild);
      }
    }
  })();

  /* ── Edição #2: gráfico 7 dias ── */
  (function renderChart7d() {
    const wrap = document.getElementById('ed2-chart7d'); if (!wrap) return;
    const summaries = getDailySummaries();
    const days = last7Days(summaries);
    const maxRev = Math.max(...days.map(d => d.revenue), 1);

    const bars = days.map(d => {
      const pct = maxRev > 0 ? (d.revenue / maxRev) * 100 : 0;
      const cls  = d.isToday ? 'b7fill b7today' : d.noData ? 'b7fill b7zero' : 'b7fill b7normal';
      const topLbl = d.revenue > 0
        ? (d.revenue >= 1000 ? (d.revenue / 1000).toFixed(1) + 'k' : d.revenue.toFixed(0))
        : '—';
      return '<div class="b7col">'
        + '<div class="b7top">' + topLbl + '</div>'
        + '<div class="' + cls + '" style="height:' + Math.max(pct, d.noData ? 4 : 3) + '%"'
        + ' title="' + d.date + ' | R$ ' + d.revenue.toFixed(2) + ' | ' + d.orders + ' pedidos"></div>'
        + '<div class="b7day">' + d.label + '</div>'
        + '</div>';
    }).join('');

    wrap.innerHTML =
      '<div class="chart7d-wrap">'
      + '<div class="chart7d-head">'
      + '<div class="sec-comp-title" style="margin:0">Receita \u2014 Últimos 7 Dias</div>'
      + '<div class="chart7d-lbl">'
      + '<span><span class="chart7d-legend-dot" style="background:var(--olive3)"></span>hoje</span>'
      + '<span><span class="chart7d-legend-dot" style="background:var(--yellow2)"></span>histórico</span>'
      + '<span><span class="chart7d-legend-dot" style="background:var(--border2)"></span>sem dados</span>'
      + '</div></div>'
      + '<div class="bars7d">' + bars + '</div>'
      + '</div>';
  })();

  /* ── Edição #2: comparação média 30 dias ── */
  (function renderAvg30() {
    const wrap = document.getElementById('ed2-avg30'); if (!wrap) return;
    const summaries = getDailySummaries();
    const avg  = avg30Days(summaries);
    const live = liveMetrics();

    if (!avg) {
      wrap.innerHTML = '<div class="avg30-wrap"><div class="sec-comp-title" style="margin-bottom:.5rem">Hoje vs. Média 30 Dias</div>'
        + '<div style="font-size:.7rem;color:var(--muted);padding:.5rem 0">Sem histórico suficiente. Use <strong style="color:var(--yellow)">Fechar Dia</strong> para começar a acumular dados.</div></div>';
      return;
    }

    function buildCard(label, todayVal, avgVal, fmtFn) {
      const v      = fmtVariation(todayVal, avgVal);
      const ratio  = avgVal > 0 ? Math.min(todayVal / avgVal, 2) : 0;
      const barW   = (ratio * 50).toFixed(1); // 100% = 2× a média
      const barClr = v.cls === 'up' ? 'var(--olive3)' : v.cls === 'down' ? 'var(--redbright)' : 'var(--muted)';
      return '<div class="avg30-card">'
        + '<div class="avg30-metric">' + label + '</div>'
        + '<div class="avg30-today-val">' + fmtFn(todayVal) + '</div>'
        + '<div class="avg30-avg-line">Média 30d: ' + fmtFn(avgVal)
        + ' <span class="kpi-vs ' + v.cls + '" style="font-size:.58rem;padding:.09rem .3rem">' + v.text + '</span></div>'
        + '<div class="avg30-bar-bg"><div class="avg30-bar-fg" style="width:' + barW + '%;background:' + barClr + '"></div></div>'
        + '</div>';
    }

    const fR = v => 'R$\u00a0' + v.toFixed(2).replace('.', ',');
    const fN = v => Math.round(v).toString();

    wrap.innerHTML = '<div class="avg30-wrap">'
      + '<div class="avg30-head">'
      + '<div class="sec-comp-title" style="margin:0">Hoje vs. Média dos Últimos 30 Dias</div>'
      + '<div class="avg30-days-note">baseado em ' + avg.days + ' dia(s) com pedidos</div>'
      + '</div>'
      + '<div class="avg30-grid">'
      + buildCard('Receita',      live.revenue,   avg.revenue,   fR)
      + buildCard('Pedidos',      live.doneCnt,   avg.orders,    fN)
      + buildCard('Ticket Médio', live.avgTicket, avg.avgTicket, fR)
      + '</div></div>';
  })();
  /* ── fim Edição #2 ── */

  const av = orders.filter(o => o.status !== 'cancelled');
  const curH = new Date().getHours();
  const hrs = [...Array(8)].map(() => 0), revH = [...Array(8)].map(() => 0);
  av.forEach(o => {
    const t = o.time instanceof Date ? o.time : new Date(o.time);
    const d = curH - t.getHours();
    if (d >= 0 && d < 8) { hrs[7 - d]++; revH[7 - d] += (o.total || 0); }
  });
  const mxH = Math.max(...hrs, 1), mxR = Math.max(...revH, 1);
  const lbl = Array.from({ length: 8 }, (_, i) => ((curH - (7 - i) + 24) % 24) + 'h');
  setHTML('chartHours',      hrs.map(v  => '<div class="ch-col"><div class="ch-bar" style="height:' + Math.round((v / mxH) * 80) + 'px;background:linear-gradient(to top,var(--red),var(--yellow))"></div></div>').join(''));
  setHTML('chartHoursLbls',  lbl.map(l  => '<span>' + l + '</span>').join(''));
  setHTML('chartReceita',    revH.map(v => '<div class="ch-col"><div class="ch-bar" style="height:' + Math.round((v / mxR) * 80) + 'px;background:linear-gradient(to top,var(--olive),var(--olive3))"></div></div>').join(''));
  setHTML('chartReceitaLbls',lbl.map(l  => '<span>' + l + '</span>').join(''));
 
  const pix = av.filter(o => o.pay === 'Pix').length,
        crd = av.filter(o => o.pay === 'Cartão').length,
        csh = av.filter(o => o.pay === 'Dinheiro').length,
        tot = pix + crd + csh || 1, ci = 2 * Math.PI * 34;
  const pA = pix / tot * ci, cA = crd / tot * ci, kA = csh / tot * ci;
  const dp = document.getElementById('dPix'), dc = document.getElementById('dCard'), dk = document.getElementById('dCash');
  if (dp) dp.setAttribute('stroke-dasharray', pA + ' ' + ci);
  if (dc) { dc.setAttribute('stroke-dasharray', cA + ' ' + ci); dc.style.strokeDashoffset = '-' + pA; }
  if (dk) { dk.setAttribute('stroke-dasharray', kA + ' ' + ci); dk.style.strokeDashoffset = '-' + (pA + cA); }
  setText('legPix', pix); setText('legCard', crd); setText('legCash', csh);
  setText('legPixP', Math.round(pix / tot * 100) + '%');
  setText('legCardP', Math.round(crd / tot * 100) + '%');
  setText('legCashP', Math.round(csh / tot * 100) + '%');
 
  const dl = av.filter(o => o.type === 'delivery').length,
        pk = av.filter(o => o.type === 'pickup').length,
        mk = av.filter(o => o.type === 'market').length,
        mxT = Math.max(dl, pk, mk, 1);
  setHTML('barTipo', [
    { l: 'Delivery', v: dl, c: 'var(--yellow)' },
    { l: 'Retirada', v: pk, c: 'var(--red2)' },
    { l: 'Mercado',  v: mk, c: 'var(--olive3)' }
  ].map(x => '<div class="bar-row"><span class="bar-lbl">' + x.l + '</span><div class="bar-track"><div class="bar-fill" style="width:' + Math.round((x.v / mxT) * 100) + '%;background:' + x.c + '"></div></div><span class="bar-val">' + x.v + ' pedidos</span></div>').join(''));
 
  const ic = {};
  av.forEach(o => (o.items || []).forEach(i => { ic[i.name] = (ic[i.name] || 0) + i.qty; }));
  const top = Object.entries(ic).sort((a, b) => b[1] - a[1]).slice(0, 6), mxI = top[0]?.[1] || 1;
  setHTML('barItens', top.length
    ? top.map(([n, q]) => '<div class="bar-row"><span class="bar-lbl" title="' + n + '">' + n + '</span><div class="bar-track"><div class="bar-fill" style="width:' + Math.round((q / mxI) * 100) + '%;background:var(--redbright)"></div></div><span class="bar-val">' + q + '×</span></div>').join('')
    : '<div style="color:var(--muted);font-size:.72rem;text-align:center;padding:1rem">Sem dados ainda.</div>');
 
  const cl = Object.values(clients).filter(c => c.orderCount > 0).sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0)).slice(0, 5), mxC = cl[0]?.totalSpent || 1;
  setHTML('barClientes', cl.length
    ? cl.map(c => '<div class="bar-row"><span class="bar-lbl" title="' + c.name + '">' + c.name + '</span><div class="bar-track"><div class="bar-fill" style="width:' + Math.round(((c.totalSpent || 0) / mxC) * 100) + '%;background:var(--yellow)"></div></div><span class="bar-val">R$ ' + (c.totalSpent || 0).toFixed(0) + '</span></div>').join('')
    : '<div style="color:var(--muted);font-size:.72rem;text-align:center;padding:1rem">Sem dados ainda.</div>');
}
