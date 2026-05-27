'use strict';

// ── UI — badges, navegação, simulação, utilitários ──

/* ══════════════════════════════════════════════
   BADGES & SIDEBAR
══════════════════════════════════════════════ */
function updateBadges() {
  const nc = orders.filter(o => o.status === 'new').length;
  const bn = document.getElementById('sbBadgeNew');
  if (bn) { bn.textContent = nc; bn.style.display = nc ? 'inline' : 'none'; }
  const nCli = Object.keys(clients).length;
  const bc = document.getElementById('sbBadgeCli');
  if (bc) { bc.textContent = nCli; bc.style.display = nCli ? 'inline' : 'none'; }
  const bh = document.getElementById('sbBadgeHist');
  if (bh) { bh.textContent = orders.length; bh.style.display = orders.length ? 'inline' : 'none'; }
}
function updateSidebar() {
  setText('sbRevenue', 'R$ ' + revenue.toFixed(2).replace('.', ','));
  setText('sbRevSub',  doneCnt + ' pedidos');
  setText('sbCliNew',  newCliCnt);
  setText('sbPending', orders.filter(o => o.status === 'new' || o.status === 'prep').length);
}
 
/* ══════════════════════════════════════════════
   NAVEGACAO
══════════════════════════════════════════════ */
function showPage(id, el, color) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.sb-item').forEach(t => t.classList.remove('active', 'or', 'tl', 'gn', 'pp', 'rd'));
  const pg = document.getElementById('page-' + id);
  if (pg) pg.classList.add('active');
  if (el) { el.classList.add('active'); if (color) el.classList.add(color); }
  if (id === 'pedidos')    { renderBoards(); renderKPIs(); }
  if (id === 'clientes')   renderCliTable();
  if (id === 'historico')  renderHistory();
  if (id === 'relatorios') renderReports();
  if (id === 'estoque')    renderStock();
  updateBadges(); updateSidebar();
}
function filterOrders(type, el) {
  filterType = type;
  document.querySelectorAll('.fchip').forEach(c => c.classList.remove('active'));
  if (el) el.classList.add('active');
  renderBoards();
}
function toggleStore() {
  storeOpen = !storeOpen;
  const b = document.getElementById('storeBadge');
  if (b) b.classList.toggle('closed', !storeOpen);
  setText('storeTxt', storeOpen ? 'Loja Aberta' : 'Loja Fechada');
  const sd = document.getElementById('sdot');
  if (sd) sd.style.animation = storeOpen ? 'pulse 1.2s infinite' : 'none';
  showToast(storeOpen ? 'Loja aberta' : 'Loja fechada');
}
 
/* ══════════════════════════════════════════════
   SIMULACAO
══════════════════════════════════════════════ */
const DNAMES = ['Ana Silva','Joao Costa','Maria Oliveira','Pedro Santos','Carla Lima','Lucas Ferreira','Beatriz Nunes','Rafael Gomes'];
const DITEMS = [['Classic Smash Burger',35],['Pizza Margherita',45],['Combinado Sushi 20un',78],['Frango Inteiro 1kg',13.90],['Agua Mineral',2.50],['Moqueca de Camarao',72],['Baiao de Dois',32],['Croissant',5.90]];
function simulateOrder() {
  const name = DNAMES[Math.floor(Math.random() * DNAMES.length)];
  const n = 1 + Math.floor(Math.random() * 3);
  const items = DITEMS.slice(0, n).map(([nm, p]) => ({name: nm, qty: 1, price: p}));
  const total = items.reduce((s, i) => s + i.price, 0) + 5;
  const cid = 'sim_' + Date.now();
  // registra o cliente simulado
  onNewClient({id: cid, name, email: name.toLowerCase().replace(' ', '.') + '@email.com',
    phone: '(82) 99' + Math.floor(Math.random()*9000+1000) + '-' + Math.floor(Math.random()*9000+1000),
    address: 'Rua Demo, ' + Math.floor(Math.random()*999+1), registeredAt: new Date().toISOString()});
  onNewOrder({
    id: '#' + Math.floor(Math.random() * 9000 + 1000), items, total,
    client: {id: cid, name, email: name.toLowerCase().replace(' ', '.') + '@email.com',
      phone: '(82) 9999-9999',
      addr: 'Rua Demo, ' + Math.floor(Math.random()*999+1)},
    pay: ['Pix','Cartão','Dinheiro'][Math.floor(Math.random() * 3)],
    type: ['delivery','pickup','market'][Math.floor(Math.random() * 3)],
    time: new Date().toISOString(), status: 'new'
  });
  renderAll();
}
 
/* ══════════════════════════════════════════════
   UI
══════════════════════════════════════════════ */
function showToast(msg, type = 'info') {
  const w = document.getElementById('toastWrap'); if (!w) return;
  const t = document.createElement('div'); t.className = 'toast ' + type;
  t.textContent = msg; w.appendChild(t);
  setTimeout(() => { t.classList.add('removing'); setTimeout(() => t.remove(), 220); }, 3000);
}
function showNotif(icon, title, sub, type = 'no') {
  const a = document.getElementById('notifArea'); if (!a) return;
  const el = document.createElement('div'); el.className = 'nt ' + type;
  el.innerHTML = '<div class="ntic">' + icon + '</div><div><div class="ntt">' + title + '</div><div class="nts">' + sub.replace(/\n/g, '<br/>') + '</div><div class="ntm">' + hhmm() + '</div></div>';
  a.appendChild(el);
  el.addEventListener('click', () => el.classList.add('removing'));
  setTimeout(() => { el.classList.add('removing'); setTimeout(() => el.remove(), 240); }, 7000);
}
function playBeep() {
  try {
    const c = new (window.AudioContext || window.webkitAudioContext)();
    [880, 660, 880].forEach((f, i) => {
      const o = c.createOscillator(), g = c.createGain();
      o.connect(g); g.connect(c.destination); o.frequency.value = f; o.type = 'sine';
      g.gain.setValueAtTime(.3, c.currentTime + i * .18);
      g.gain.exponentialRampToValueAtTime(.001, c.currentTime + i * .18 + .18);
      o.start(c.currentTime + i * .18); o.stop(c.currentTime + i * .18 + .18);
    });
  } catch(e) {}
}
function playChime() {
  try {
    const c = new (window.AudioContext || window.webkitAudioContext)();
    [523, 659, 784, 1047].forEach((f, i) => {
      const o = c.createOscillator(), g = c.createGain();
      o.connect(g); g.connect(c.destination); o.frequency.value = f; o.type = 'sine';
      g.gain.setValueAtTime(.2, c.currentTime + i * .2);
      g.gain.exponentialRampToValueAtTime(.001, c.currentTime + i * .2 + .25);
      o.start(c.currentTime + i * .2); o.stop(c.currentTime + i * .2 + .25);
    });
  } catch(e) {}
}
function toggleSound() {
  soundOn = !soundOn;
  const b = document.getElementById('sndBtn');
  if (b) { b.textContent = soundOn ? 'Som On' : 'Som Off'; b.classList.toggle('snd-off', !soundOn); }
}
function hhmm() {
  return new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'});
}
function exportCSV() {
  const list = Object.values(clients);
  if (!list.length) { showToast('Nenhum cliente para exportar'); return; }
  const rows = [['Nome','Email','Telefone','Endereco','CEP','Pedidos','Total Gasto','Cadastrado em'].join(','),
    ...list.map(c => [
      '"' + c.name + '"', '"' + (c.email || '') + '"', '"' + (c.phone || '') + '"',
      '"' + (c.address || '') + '"', '"' + (c.cep || '') + '"',
      c.orderCount || 0, (c.totalSpent || 0).toFixed(2),
      '"' + (c.registeredAt || '') + '"'
    ].join(','))].join('\n');
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(rows);
  a.download = 'clientes_foodcity.csv'; a.click();
  showToast('CSV exportado!');
}