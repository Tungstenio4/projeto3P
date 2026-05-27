# FoodCity — Estrutura do Projeto

```
foodcity/
├── README.md
│
├── cliente/                  ← Site do cliente (culinaria.html)
│   ├── index.html            Estrutura HTML (sem CSS/JS inline)
│   ├── style.css             Todo o CSS da interface do cliente
│   ├── data.js               Dados estáticos: PROMOS, MENUS, MCAT, PRODS, DEMO, RIMG, PIMG
│   ├── bridge.js             IndexedDB client + Bridge (BroadcastChannel / localStorage)
│   └── script.js             Google Maps, estado e toda a lógica principal
│
└── painel/                   ← Painel da loja (mercado.html) com Edição #2
    ├── index.html            Estrutura HTML (sem CSS/JS inline)
    ├── style.css             Todo o CSS do painel (inclui estilos da Edição #2)
    ├── db.js                 IndexedDB: openPainelDB, helpers dbPut/dbGet/dbGetAll, dbRestorePainel
    ├── state.js              Variáveis globais (orders, clients, revenue…) + helpers de debug
    ├── bridge.js             Handlers de eventos (onNewClient, onNewOrder…) + receiver BroadcastChannel/localStorage
    ├── kanban.js             Ações sobre pedidos: acceptOrder, advOrder, rejectOrder, clearDone, clearAll, printOrder
    ├── reports.js            Edição #2 — helpers de comparação diária + renderReports + fecharDia
    ├── render.js             renderAll, renderKPIs, renderBoards, cardHTML, renderCliTable, renderHistory
    ├── stock.js              STOCK data, renderStock, restock, restockAll, checkStockAlerts
    ├── ui.js                 badges, navegação, simulação, showToast, showNotif, exportCSV, toggleStore…
    └── init.js               DOMContentLoaded: relógio, atalhos, BroadcastChannel, polling, boot
```

## Como usar

1. Abra os dois arquivos `index.html` no mesmo servidor local (ex: Live Server no VS Code, ou `python3 -m http.server`)  
2. O **painel** em `painel/index.html` recebe pedidos e cadastros em tempo real do **cliente** em `cliente/index.html`  
3. A comunicação é feita via `BroadcastChannel` + `localStorage` — 100% offline, sem servidor externo

## Edição #2 — Métricas Comparativas (reports.js)

- **Badge "vs. ontem"** nos KPIs de Receita, Pedidos e Ticket Médio  
- **Gráfico de barras** dos últimos 7 dias de receita  
- **Comparação com a média dos 30 dias** para os 3 indicadores principais  
- **Botão "Fechar Dia"** na página de Relatórios: arquiva o snapshot diário em `localStorage['dailySummaries']`

## Dependência entre módulos (painel)

```
init.js
  └── depende de todos os outros

bridge.js
  └── depende de: state.js, db.js, render.js, ui.js

reports.js
  └── depende de: state.js (orders, revenue, doneCnt)

render.js
  └── depende de: state.js, kanban.js (cardHTML usa acceptOrder/advOrder)
```
