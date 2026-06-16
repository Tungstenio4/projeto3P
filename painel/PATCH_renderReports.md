# Patch — integrar `renderHeatmap()` no `renderReports()`

Localize a função `renderReports()` no arquivo `reports.js` (ou onde ela estiver)
e adicione **uma linha** no final do corpo da função, antes do fechamento `}`:

```js
// …código existente…
  renderReports_ed2_vsOntem(summaries, live);   // já existe
  renderReports_ed2_chart7d(days7);             // já existe
  renderReports_ed2_avg30(avg30, live);         // já existe

  renderHeatmap();   // ← ADICIONAR ESTA LINHA
}
```

Se `renderReports` não chama subfunções nomeadas assim, simplesmente adicione
`renderHeatmap();` como a **última linha** dentro da função:

```js
function renderReports() {
  // … todo o código existente …

  renderHeatmap();   // ← última linha antes do }
}
```

---

## Patch opcional — fecharDia com breakdown por hora

Para que os dias arquivados tenham dados reais por hora (em vez de estimativa),
substitua a função `fecharDia()` em `ui.js` / `reports.js` pela versão abaixo:

```js
function fecharDia() {
  if (!confirm('Fechar o dia e arquivar as métricas de hoje?')) return;
  const live = liveMetrics();
  const key  = todayKey();

  // Breakdown por hora — campo novo: hourlyOrders[0..23]
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
    hourlyOrders        // ← campo adicionado
  });
  if (summaries.length > 60) summaries.length = 60;
  saveDailySummaries(summaries);
  showToast('Dia ' + key + ' arquivado! Receita: R$ ' + live.revenue.toFixed(2));
  renderReports();
}
```
