'use strict';

// ── Kanban — ações sobre pedidos ──

/* ══════════════════════════════════════════════
   ACOES KANBAN
══════════════════════════════════════════════ */
function acceptOrder(id) {
  const o = orders.find(x => x.id === id); if (!o) return;
  showPrepTimeModal(id);
}

/* ── Modal de tempo de preparo ── */
function showPrepTimeModal(id) {
  // Remove modal anterior se existir
  const old = document.getElementById('prepModal'); if (old) old.remove();

  const modal = document.createElement('div');
  modal.id = 'prepModal';
  modal.innerHTML = `
    <div class="prep-backdrop" onclick="closePrepModal()"></div>
    <div class="prep-modal">
      <div class="prep-modal-title">⏱ Tempo de Preparo</div>
      <div class="prep-modal-sub">Pedido <strong>${id}</strong> — Quanto tempo levará?</div>
      <div class="prep-presets">
        <button class="prep-preset" onclick="selectPrepTime(15)">15 min</button>
        <button class="prep-preset" onclick="selectPrepTime(20)">20 min</button>
        <button class="prep-preset" onclick="selectPrepTime(25)">25 min</button>
        <button class="prep-preset" onclick="selectPrepTime(30)">30 min</button>
        <button class="prep-preset" onclick="selectPrepTime(40)">40 min</button>
        <button class="prep-preset" onclick="selectPrepTime(45)">45 min</button>
        <button class="prep-preset" onclick="selectPrepTime(60)">60 min</button>
      </div>
      <div class="prep-custom-row">
        <input class="prep-input" id="prepCustom" type="number" min="1" max="180" placeholder="Personalizado" />
        <span class="prep-min-lbl">min</span>
      </div>
      <div class="prep-modal-actions">
        <button class="prep-confirm" onclick="confirmPrepTime('${id}')">Aceitar Pedido</button>
        <button class="prep-cancel" onclick="closePrepModal()">Cancelar</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // Focar input ao abrir
  setTimeout(() => document.getElementById('prepCustom')?.focus(), 50);

  // Enter confirma
  setTimeout(() => document.getElementById('prepCustom')?.focus(), 50);

  modal.querySelector('#prepCustom').addEventListener('keydown', e => {
    if (e.key === 'Enter') confirmPrepTime(id);
  });
}

function selectPrepTime(mins) {
  const inp = document.getElementById('prepCustom');
  if (inp) { inp.value = mins; }
  // Destaca o preset selecionado
  document.querySelectorAll('.prep-preset').forEach(b => {
    b.classList.toggle('selected', parseInt(b.textContent) === mins);
  });
}

function confirmPrepTime(id) {
  const inp = document.getElementById('prepCustom');
  const mins = parseInt(inp?.value) || 25;
  closePrepModal();

  const o = orders.find(x => x.id === id); if (!o) return;
  o.status = 'prep';
  o.prepMins = mins;
  o.prepStart = Date.now();
  dbSaveOrder(o);
  renderAll();
  showToast('Pedido ' + id + ' aceito! Preparo: ' + mins + ' min', 'order');
}

function closePrepModal() {
  const m = document.getElementById('prepModal'); if (m) m.remove();
}

function closePrepModal() {
  const m = document.getElementById('prepModal'); if (m) m.remove();
}

function advOrder(id) {
  const o = orders.find(x => x.id === id); if (!o) return;
  if (o.status === 'prep') {
    o.status = 'ready';
    dbSaveOrder(o);
    renderAll();
    if (alertPrefs.sndReady) playChime();
    showToast('Pedido ' + id + ' pronto!', 'order');
  } else if (o.status === 'ready') {
    o.status = 'done'; revenue += (o.total || 0); doneCnt++;
    if (o.client?.id && clients[o.client.id]) {
      clients[o.client.id].totalSpent = (clients[o.client.id].totalSpent || 0) + (o.total || 0);
      dbSaveClient(clients[o.client.id]);
    }
    dbSaveOrder(o);
    dbSaveSetting('revenue', revenue);
    dbSaveSetting('doneCnt', doneCnt);
    renderAll();
    showToast('Entregue ' + id + '! +R$ ' + (o.total || 0).toFixed(2), 'order');
  }
}

function rejectOrder(id) {
  const o = orders.find(x => x.id === id); if (!o) return;
  o.status = 'cancelled';
  dbSaveOrder(o);
  renderAll();
  showToast('Pedido ' + id + ' recusado.');
}

function clearDone() {
  const toRemove = orders.filter(o => o.status === 'done');
  toRemove.forEach(o => dbDelete('orders', o.id));
  orders = orders.filter(o => o.status !== 'done');
  renderAll();
  showToast('Entregues removidos.');
}

/* ══════════════════════════════════════════════
   LIMPAR TUDO — protegido por PIN de 4 dígitos
══════════════════════════════════════════════ */

/* PIN padrão. Para trocar, altere este valor.
   Uma futura melhoria pode deixá-lo configurável
   via storeConfig / IndexedDB (settings 'clearPin'). */
const CLEAR_PIN = '1234';

function clearAll() {
  _showPinModal();
}

function _showPinModal() {
  // Remove modal anterior se sobrou
  document.getElementById('pin-modal-overlay')?.remove();

  // Injeta estilos uma vez
  if (!document.getElementById('pin-modal-style')) {
    const s = document.createElement('style');
    s.id = 'pin-modal-style';
    s.textContent = `
      #pin-modal-overlay {
        position: fixed; inset: 0; z-index: 9500;
        background: rgba(15,11,9,.88);
        backdrop-filter: blur(4px);
        display: flex; align-items: center; justify-content: center;
        animation: pinFIn .18s ease;
      }
      @keyframes pinFIn { from{opacity:0} to{opacity:1} }

      #pin-modal {
        background: var(--s1);
        border: 2px solid var(--red);
        border-radius: .45rem;
        width: min(340px, 92vw);
        padding: 1.4rem 1.4rem 1.1rem;
        box-shadow: 0 18px 55px rgba(0,0,0,.75);
        animation: pinUp .22s cubic-bezier(.34,1.56,.64,1);
        text-align: center;
      }
      @keyframes pinUp { from{transform:translateY(20px);opacity:0} to{transform:none;opacity:1} }

      #pin-modal h3 {
        font-family: 'Bebas Neue', sans-serif;
        font-size: 1.25rem;
        letter-spacing: .07em;
        color: var(--redbright);
        margin-bottom: .25rem;
      }
      #pin-modal p {
        font-size: .68rem;
        color: var(--muted);
        font-family: 'Barlow Condensed', sans-serif;
        letter-spacing: .04em;
        margin-bottom: 1rem;
        line-height: 1.4;
      }

      /* ── Dígitos ── */
      .pin-dots {
        display: flex;
        justify-content: center;
        gap: .55rem;
        margin-bottom: .9rem;
      }
      .pin-dot {
        width: 14px; height: 14px;
        border-radius: 50%;
        border: 2px solid var(--border2, #5a3a2e);
        background: transparent;
        transition: background .12s, border-color .12s;
      }
      .pin-dot.filled {
        background: var(--redbright);
        border-color: var(--redbright);
      }
      .pin-dot.error {
        background: transparent;
        border-color: var(--redbright);
        animation: pinShake .3s ease;
      }
      @keyframes pinShake {
        0%,100%{transform:translateX(0)}
        20%{transform:translateX(-5px)}
        40%{transform:translateX(5px)}
        60%{transform:translateX(-4px)}
        80%{transform:translateX(4px)}
      }

      /* ── Teclado numérico ── */
      .pin-pad {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: .4rem;
        margin-bottom: .85rem;
      }
      .pin-key {
        font-family: 'Bebas Neue', sans-serif;
        font-size: 1.35rem;
        letter-spacing: .04em;
        color: var(--cream);
        background: var(--s2);
        border: 1px solid var(--border);
        border-radius: .3rem;
        padding: .6rem 0;
        cursor: pointer;
        transition: background .1s, transform .08s;
        user-select: none;
      }
      .pin-key:hover { background: var(--s3, #2e211c); }
      .pin-key:active { transform: scale(.94); background: var(--s4, #3a2a23); }
      .pin-key.del {
        font-size: .95rem;
        color: var(--muted2);
      }
      .pin-key.blank { visibility: hidden; cursor: default; }
      .pin-key.blank:hover, .pin-key.blank:active { background: var(--s2); transform: none; }

      /* ── Mensagem de erro ── */
      .pin-error-msg {
        font-family: 'Barlow Condensed', sans-serif;
        font-size: .65rem;
        color: var(--redbright);
        letter-spacing: .06em;
        text-transform: uppercase;
        min-height: .9rem;
        margin-bottom: .6rem;
        font-weight: 700;
      }

      /* ── Botão cancelar ── */
      .pin-cancel {
        font-family: 'Barlow Condensed', sans-serif;
        font-weight: 800;
        font-size: .68rem;
        letter-spacing: .08em;
        text-transform: uppercase;
        padding: .38rem .9rem;
        border-radius: .25rem;
        border: 1px solid var(--border2);
        background: var(--s3, #2e211c);
        color: var(--muted2);
        cursor: pointer;
        transition: border-color .15s, color .15s;
      }
      .pin-cancel:hover { border-color: var(--cream); color: var(--cream); }
    `;
    document.head.appendChild(s);
  }

  const ov = document.createElement('div');
  ov.id = 'pin-modal-overlay';
  ov.innerHTML = `
    <div id="pin-modal" role="dialog" aria-modal="true" aria-label="Confirmar PIN para limpar dados">
      <h3>⚠ Limpar Tudo</h3>
      <p>Digite o PIN de 4 dígitos para confirmar.<br>Esta ação apaga pedidos, clientes e eventos.</p>
      <div class="pin-dots">
        <div class="pin-dot" id="pd0"></div>
        <div class="pin-dot" id="pd1"></div>
        <div class="pin-dot" id="pd2"></div>
        <div class="pin-dot" id="pd3"></div>
      </div>
      <div class="pin-pad">
        <button class="pin-key" onclick="_pinKey('1')">1</button>
        <button class="pin-key" onclick="_pinKey('2')">2</button>
        <button class="pin-key" onclick="_pinKey('3')">3</button>
        <button class="pin-key" onclick="_pinKey('4')">4</button>
        <button class="pin-key" onclick="_pinKey('5')">5</button>
        <button class="pin-key" onclick="_pinKey('6')">6</button>
        <button class="pin-key" onclick="_pinKey('7')">7</button>
        <button class="pin-key" onclick="_pinKey('8')">8</button>
        <button class="pin-key" onclick="_pinKey('9')">9</button>
        <button class="pin-key blank" aria-hidden="true"></button>
        <button class="pin-key" onclick="_pinKey('0')">0</button>
        <button class="pin-key del" onclick="_pinDel()" title="Apagar">⌫</button>
      </div>
      <div class="pin-error-msg" id="pinErrMsg"></div>
      <button class="pin-cancel" onclick="_closePinModal()">Cancelar</button>
    </div>
  `;
  document.body.appendChild(ov);

  // Fecha ao clicar no backdrop
  ov.addEventListener('click', e => { if (e.target === ov) _closePinModal(); });

  // Suporte a teclado físico
  document.addEventListener('keydown', _pinKeyHandler);

  // Reseta estado interno
  _pinBuffer = '';
}

let _pinBuffer = '';

function _pinKeyHandler(e) {
  if (!document.getElementById('pin-modal-overlay')) return;
  if (e.key >= '0' && e.key <= '9') { e.preventDefault(); _pinKey(e.key); }
  if (e.key === 'Backspace')         { e.preventDefault(); _pinDel(); }
  if (e.key === 'Escape')            { e.preventDefault(); _closePinModal(); }
}

function _pinKey(digit) {
  if (_pinBuffer.length >= 4) return;
  _pinBuffer += digit;
  _updatePinDots();
  if (_pinBuffer.length === 4) _checkPin();
}

function _pinDel() {
  if (!_pinBuffer.length) return;
  _pinBuffer = _pinBuffer.slice(0, -1);
  _updatePinDots();
  // Limpa mensagem de erro ao apagar
  const msg = document.getElementById('pinErrMsg');
  if (msg) msg.textContent = '';
}

function _updatePinDots() {
  for (let i = 0; i < 4; i++) {
    const d = document.getElementById('pd' + i);
    if (d) {
      d.classList.toggle('filled', i < _pinBuffer.length);
      d.classList.remove('error');
    }
  }
}

function _checkPin() {
  if (_pinBuffer === CLEAR_PIN) {
    _closePinModal();
    _executeClearAll();
  } else {
    // Feedback de erro: agita os pontos e reseta
    for (let i = 0; i < 4; i++) {
      const d = document.getElementById('pd' + i);
      if (d) { d.classList.remove('filled'); d.classList.add('error'); }
    }
    const msg = document.getElementById('pinErrMsg');
    if (msg) msg.textContent = 'PIN incorreto — tente novamente';
    setTimeout(() => {
      for (let i = 0; i < 4; i++) {
        const d = document.getElementById('pd' + i);
        if (d) d.classList.remove('error');
      }
      if (msg) msg.textContent = '';
    }, 900);
    _pinBuffer = '';
  }
}

function _closePinModal() {
  document.getElementById('pin-modal-overlay')?.remove();
  document.removeEventListener('keydown', _pinKeyHandler);
  _pinBuffer = '';
}

function _executeClearAll() {
  orders = []; clients = {}; revenue = 0; doneCnt = 0; newCliCnt = 0; seen.clear(); evCount = 0;
  try { localStorage.removeItem('fc_events'); localStorage.removeItem('fc_trigger'); } catch(e) {}
  openPainelDB().then(db => {
    ['orders', 'clients', 'settings', 'seen'].forEach(store => {
      try { db.transaction(store, 'readwrite').objectStore(store).clear(); } catch(e) {}
    });
  });
  dbSet('dbEvCount', 0); dbSet('dbLast', '—'); dbSet('dbLS', '—');
  dbSet('dbStatus', 'IndexedDB limpo');
  renderAll();
  showToast('Todos os dados foram limpos.');
}

function printOrder(id) {
  const o = orders.find(x => x.id === id); if (!o) return;

  // Remove janela anterior se existir
  document.getElementById('fc-print-window')?.remove();

  const wClass = { '58': 'w58', '80': 'w80', 'A4': 'wA4' }[storeConfig.paperWidth] || 'w80';
  const pageW  = { w58: '58mm', w80: '80mm', wA4: '210mm' }[wClass] || '80mm';
  const pageM  = { w58: '2mm',  w80: '3mm',  wA4: '10mm'  }[wClass] || '3mm';

  // Injeta @page dinâmico para o tamanho correto (sem diálogo manual)
  let dynStyle = document.getElementById('fc-print-page-style');
  if (!dynStyle) {
    dynStyle = document.createElement('style');
    dynStyle.id = 'fc-print-page-style';
    document.head.appendChild(dynStyle);
  }
  dynStyle.textContent = '@page { size: ' + pageW + ' auto; margin: ' + pageM + '; }';

  // Cria div de impressão — oculto na tela, visível no print via print.css
  const win = document.createElement('div');
  win.id = 'fc-print-window';
  win.style.cssText = 'display:none';
  win.innerHTML = buildReceiptHTML(o);
  document.body.appendChild(win);

  // Aguarda render antes de acionar impressão
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.print();
      setTimeout(() => win.remove(), 3000);
    });
  });
}
}
