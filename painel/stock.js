'use strict';

// ── Estoque — dados STOCK, renderStock, restock ──

/* ══════════════════════════════════════════════
   ESTOQUE
══════════════════════════════════════════════ */
const STOCK = [
  {name:'Blend de Carne',cat:'Carnes',qty:12,max:30,unit:'kg'},
  {name:'Mussarela',cat:'Laticinios',qty:8,max:20,unit:'kg'},
  {name:'Tomate',cat:'Hortifruti',qty:5,max:15,unit:'kg'},
  {name:'Pao Hamburguer',cat:'Padaria',qty:45,max:100,unit:'un'},
  {name:'Arroz',cat:'Graos',qty:25,max:50,unit:'kg'},
  {name:'Feijao',cat:'Graos',qty:18,max:40,unit:'kg'},
  {name:'Camarao',cat:'Frutos do Mar',qty:3,max:10,unit:'kg'},
  {name:'Salmao',cat:'Frutos do Mar',qty:2,max:8,unit:'kg'},
  {name:'Oleo de Cozinha',cat:'Outros',qty:6,max:12,unit:'L'},
  {name:'Farinha de Trigo',cat:'Padaria',qty:22,max:30,unit:'kg'},
  {name:'Queijo Coalho',cat:'Laticinios',qty:1,max:10,unit:'kg'},
  {name:'Cerveja Artesanal',cat:'Bebidas',qty:24,max:60,unit:'un'},
  {name:'Maca Fuji',cat:'Hortifruti',qty:8,max:25,unit:'kg'},
  {name:'Frango Inteiro',cat:'Carnes',qty:6,max:20,unit:'kg'},
  {name:'Leite Integral',cat:'Laticinios',qty:12,max:30,unit:'L'},
];
function renderStock() {
  const grid = document.getElementById('stockGrid'); if (!grid) return;
  grid.innerHTML = STOCK.map(s => {
    const p = Math.round((s.qty / s.max) * 100), l = p < 25 ? 'low' : p < 55 ? 'med' : 'ok';
    return '<div class="sc ' + (l === 'low' ? 'low' : '') + '">'
      + '<div class="sc-name">' + s.name + '</div><div class="sc-cat">' + s.cat + '</div>'
      + '<div class="sc-track"><div class="sc-fill ' + l + '" style="width:' + p + '%"></div></div>'
      + '<div class="sc-footer"><div>'
      + '<div class="sc-val ' + l + '">' + s.qty + '<span style="font-size:.6rem;font-weight:400;color:var(--muted)"> / ' + s.max + '</span></div>'
      + '<div class="sc-unit">' + s.unit + '</div></div>'
      + '<button class="btn-rep" data-act="restock" data-name="' + s.name + '">Repor</button>'
      + '</div></div>';
  }).join('');
}
function restock(name) {
  const s = STOCK.find(x => x.name === name); if (!s) return;
  s.qty = s.max; renderStock(); checkStockAlerts();
  dbSaveStock();
  showToast(name + ' reposto!');
}
function restockAll() {
  STOCK.forEach(s => s.qty = s.max); renderStock(); checkStockAlerts();
  dbSaveStock();
  showToast('Estoque totalmente reposto!');
}
function checkStockAlerts() {
  const low = STOCK.filter(s => (s.qty / s.max) < 0.25).length;
  const sb = document.getElementById('sbBadgeStock');
  if (sb) sb.style.display = low ? 'inline' : 'none';
}