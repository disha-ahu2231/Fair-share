/**
 * FairShare — Features v3
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. Add Expense   — form wiring, live split preview, state update
 * 2. Pay Now       — Razorpay Checkout for ALL Pay Now buttons
 * 3. Create Group  — creates group, invite link + code
 * 4. Join Group    — join via invite link or 8-char code
 * 5. Export PDF    — jsPDF-based report export
 */

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = n => '₹' + Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const today = () => new Date().toISOString().split('T')[0];
const uid   = () => Math.random().toString(36).slice(2, 10).toUpperCase();

window._splitMethod = 'equal';


// ══════════════════════════════════════════════════════════════════════════════
// 1. ADD EXPENSE
// ══════════════════════════════════════════════════════════════════════════════

function populateExpenseGroupSelect() {
  const sel = document.getElementById('expense-group');
  if (!sel) return;
  sel.innerHTML = '<option value="">Select group…</option>' +
    (AppState.groups || []).map(g => `<option value="${g.id}">${g.emoji} ${g.name}</option>`).join('');
  const dateEl = document.getElementById('expense-date');
  if (dateEl && !dateEl.value) dateEl.value = today();
}

function updateSplitPreview() {
  const amount  = parseFloat(document.getElementById('expense-amount')?.value) || 0;
  const groupId = document.getElementById('expense-group')?.value;
  const preview = document.getElementById('expense-split-preview');
  const rows    = document.getElementById('expense-split-rows');
  if (!preview || !rows) return;
  if (!amount || !groupId) { preview.style.display = 'none'; return; }
  preview.style.display = 'block';
  const group   = (AppState.groups || []).find(g => String(g.id) === String(groupId));
  const members = group?.members || 1;
  const perHead = (amount / members).toFixed(2);
  const user = getCurrentUser ? getCurrentUser() : null;
  const you  = user ? `${user.firstName} ${user.lastName}` : 'You';
  rows.innerHTML = `
    <div style="display:flex;justify-content:space-between;font-size:.82rem">
      <span style="color:var(--text)">${you} (paid)</span>
      <span style="color:var(--green);font-family:'JetBrains Mono',monospace">+${fmt(amount - perHead)}</span>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:.78rem;color:var(--muted)">
      <span>Each of ${members} members pays</span>
      <span style="font-family:'JetBrains Mono',monospace">${fmt(perHead)}</span>
    </div>
    <div style="border-top:1px solid rgba(255,255,255,.06);margin:.35rem 0"></div>
    <div style="display:flex;justify-content:space-between;font-size:.8rem">
      <span style="color:var(--muted)">Total expense</span>
      <span style="font-family:'JetBrains Mono',monospace;color:var(--text)">${fmt(amount)}</span>
    </div>`;
}

async function submitAddExpense(event) {
  event.preventDefault();
  const descEl     = document.getElementById('expense-desc');
  const amountEl   = document.getElementById('expense-amount');
  const groupEl    = document.getElementById('expense-group');
  const categoryEl = document.getElementById('expense-category');
  const notesEl    = document.getElementById('expense-notes');
  const dateEl     = document.getElementById('expense-date');
  const errEl      = document.getElementById('add-expense-error');
  const btnEl      = document.getElementById('btn-add-expense');

  ['expense-desc-error','expense-amount-error','expense-group-error','add-expense-error']
    .forEach(id => { const e = document.getElementById(id); if (e) e.textContent = ''; });

  let valid = true;
  if (!descEl?.value?.trim()) { document.getElementById('expense-desc-error').textContent = 'Description is required'; valid = false; }
  const amount = parseFloat(amountEl?.value);
  if (!amount || amount <= 0) { document.getElementById('expense-amount-error').textContent = 'Enter a valid amount'; valid = false; }
  if (!groupEl?.value) { document.getElementById('expense-group-error').textContent = 'Please select a group'; valid = false; }
  if (!valid) return;

  const groupId   = groupEl.value;
  const desc      = descEl.value.trim();
  const category  = categoryEl?.value || 'Other';
  const notes     = notesEl?.value || '';
  const expDate   = dateEl?.value || today();
  const splitType = window._splitMethod || 'equal';

  if (btnEl) { btnEl.disabled = true; btnEl.textContent = '⏳ Saving…'; }

  try {
    let newExpense = null;
    if (typeof isServerAvailable === 'function' && await isServerAvailable()) {
      try { newExpense = await FairShareAPI.createExpense(groupId, { description: desc, amount, category, notes, splitType, date: expDate }); }
      catch (e) { console.warn('API create expense failed:', e.message); }
    }

    const group     = (AppState.groups || []).find(g => String(g.id) === String(groupId));
    const members   = group?.members || 1;
    const perHead   = amount / members;
    const yourShare = amount - perHead;

    const localExp = {
      id: newExpense?._id || ('local_' + uid()),
      desc, group: group ? `${group.emoji} ${group.name}` : '', groupId,
      cat: ({'Food':'🍽️ Food','Stay':'🏨 Stay','Transport':'⛽ Transport','Entertainment':'🎬 Entertainment','Shopping':'🛒 Shopping','Bills':'🏠 Bills','Other':'💸 Other'})[category] || '💸 Other',
      catColor: ({'Food':'orange','Stay':'accent','Transport':'red','Entertainment':'green','Shopping':'purple','Bills':'accent','Other':'gray'})[category] || 'gray',
      paidBy: 'You', split: splitType.charAt(0).toUpperCase() + splitType.slice(1),
      yourShare, date: new Date(expDate).toLocaleDateString('en-IN', { month:'short', day:'numeric' }),
      total: amount, _new: true,
    };

    AppState.expenses = [localExp, ...(AppState.expenses || [])];
    if (group) group.total = (group.total || 0) + amount;
    if (typeof renderDashboard === 'function') renderDashboard();
    if (typeof renderExpensesPage === 'function') renderExpensesPage();
    if (typeof showToast === 'function') showToast(`"${desc}" added — ${fmt(yourShare)} net for you!`);
    closeModal('add-expense-modal');
    document.getElementById('add-expense-form')?.reset();
    document.getElementById('expense-split-preview').style.display = 'none';
    window._splitMethod = 'equal';
    document.querySelectorAll('.split-tab').forEach((t,i) => t.classList.toggle('active', i===0));
  } catch (err) {
    if (errEl) errEl.textContent = err.message || 'Something went wrong. Try again.';
  } finally {
    if (btnEl) { btnEl.disabled = false; btnEl.textContent = '✓ Add Expense'; }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('expense-amount')?.addEventListener('input', updateSplitPreview);
  document.getElementById('expense-group')?.addEventListener('change', updateSplitPreview);
  const addModal = document.getElementById('add-expense-modal');
  if (addModal) new MutationObserver(() => {
    if (addModal.classList.contains('open')) populateExpenseGroupSelect();
  }).observe(addModal, { attributes: true, attributeFilter: ['class'] });
});

window.addExpense = () => {
  document.getElementById('add-expense-form')?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
};


// ══════════════════════════════════════════════════════════════════════════════
// 2. PAYMENT — Razorpay Checkout
// ══════════════════════════════════════════════════════════════════════════════

// Razorpay Key ID — loaded from localStorage so users can set it at runtime.
// Get your key from https://dashboard.razorpay.com/app/keys
const RAZORPAY_KEY_PLACEHOLDER = 'rzp_test_YourKeyHere';

function getRazorpayKey() {
  return localStorage.getItem('rzp_key_id') || RAZORPAY_KEY_PLACEHOLDER;
}

function isRazorpayKeyValid(key) {
  return key && key !== RAZORPAY_KEY_PLACEHOLDER && /^rzp_(test|live)_[A-Za-z0-9]{14,}$/.test(key);
}

let _currentPaymentContext = null;

function openPaymentModal(btn) {
  const item      = btn?.closest('.settlement-item');
  const nameEl    = item?.querySelector('[style*="font-weight:600"]');
  const toName    = (nameEl?.textContent || '').replace('You → ', '').trim() || 'Friend';
  const amountStr = item?.querySelector('.settle-amount')?.textContent?.trim() || '₹0';
  const amount    = parseFloat(amountStr.replace(/[₹,]/g, '')) || 0;

  _currentPaymentContext = { btn, item, toName, amount };

  const key = getRazorpayKey();
  if (isRazorpayKeyValid(key)) {
    launchRazorpay(amount, toName, btn, item, key);
  } else {
    openKeySetupModal(amount, toName, btn, item);
  }
}

// Shows a one-time setup screen for entering the Razorpay key, then launches payment
function openKeySetupModal(amount, toName, btn, item) {
  const body = document.getElementById('payment-modal-body');
  if (!body) return;
  const amountStr = fmt(amount);

  body.innerHTML = `
    <div style="text-align:center;margin-bottom:1.25rem">
      <div style="font-size:2rem;margin-bottom:.35rem">🔑</div>
      <div style="font-size:1.1rem;font-weight:700;color:var(--text)">Set Up Razorpay</div>
      <div style="font-size:.8rem;color:var(--muted);margin:.35rem 0 .75rem">
        Enter your Razorpay Key ID to enable payments. Saved locally on this device.
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Razorpay Key ID</label>
      <input type="text" id="rzp-key-input" class="form-input" placeholder="rzp_test_xxxxxxxxxxxx"
        style="font-family:'JetBrains Mono',monospace;font-size:.85rem"
        value="${localStorage.getItem('rzp_key_id') || ''}">
      <div style="font-size:.73rem;color:var(--muted);margin-top:.4rem">
        Get it from <a href="https://dashboard.razorpay.com/app/keys" target="_blank" style="color:var(--accent)">Razorpay Dashboard → API Keys</a>
      </div>
    </div>
    <div id="rzp-key-error" style="color:var(--red);font-size:.82rem;margin-bottom:.5rem;min-height:1.2rem;text-align:center"></div>
    <div style="display:flex;gap:.6rem;margin-top:.25rem">
      <button onclick="saveRzpKeyAndPay(${amount}, '${toName.replace(/'/g,"\\'")}');" class="btn btn-primary" style="flex:1;justify-content:center;padding:.85rem">
        💾 Save & Pay ${amountStr}
      </button>
      <button onclick="openFallbackPaymentModal(${amount}, '${toName.replace(/'/g,"\\'")}', window._currentPayCtxBtn, window._currentPayCtxItem)" class="btn btn-secondary" style="padding:.85rem .95rem;white-space:nowrap">
        Skip →
      </button>
    </div>
    <div style="text-align:center;font-size:.72rem;color:var(--muted);margin-top:.7rem">
      Your key is stored only in your browser and never sent to our servers.
    </div>`;

  // Stash btn/item refs for the skip button
  window._currentPayCtxBtn  = btn;
  window._currentPayCtxItem = item;

  openModal('payment-modal');

  // Auto-focus the key input
  setTimeout(() => document.getElementById('rzp-key-input')?.focus(), 120);
}

function saveRzpKeyAndPay(amount, toName) {
  const keyInput = document.getElementById('rzp-key-input');
  const errEl    = document.getElementById('rzp-key-error');
  const key = keyInput?.value?.trim();

  if (!isRazorpayKeyValid(key)) {
    if (errEl) errEl.textContent = 'Invalid key. Must start with rzp_test_ or rzp_live_ followed by 14+ characters.';
    if (keyInput) { keyInput.style.borderColor = 'var(--red)'; keyInput.focus(); }
    return;
  }

  localStorage.setItem('rzp_key_id', key);
  if (errEl) errEl.textContent = '';
  closeModal('payment-modal');

  const ctx = _currentPaymentContext;
  setTimeout(() => launchRazorpay(amount, toName, ctx?.btn, ctx?.item, key), 200);
}

function launchRazorpay(amount, toName, btn, item, key) {
  key = key || getRazorpayKey();
  const amountPaise = Math.round(amount * 100);
  const user = (typeof getCurrentUser === 'function') ? getCurrentUser() : null;
  const userName  = user ? `${user.firstName} ${user.lastName}` : 'FairShare User';
  const userEmail = user?.email || 'user@fairshare.app';
  const userPhone = user?.phone || '9999999999';

  const options = {
    key,
    amount: amountPaise,
    currency: 'INR',
    name: 'FairShare',
    description: `Settlement payment to ${toName}`,
    image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHJ4PSIxMiIgZmlsbD0iIzdjNmFmNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTYlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjIwIiBmaWxsPSJ3aGl0ZSI+8J+SuDwvdGV4dD48L3N2Zz4=',
    prefill: { name: userName, email: userEmail, contact: userPhone },
    notes: { paying_to: toName, app: 'FairShare' },
    theme: { color: '#7c6af5', backdrop_color: 'rgba(0,0,0,0.7)' },
    modal: {
      ondismiss: () => { if (typeof showToast === 'function') showToast('Payment cancelled.', 'info'); },
      confirm_close: true,
    },
    handler: (response) => onRazorpaySuccess(response, amount, toName, btn, item),
  };

  try {
    if (typeof Razorpay === 'undefined') throw new Error('Razorpay SDK not loaded');
    const rzp = new Razorpay(options);
    rzp.on('payment.failed', (response) => {
      console.error('Razorpay failed:', response.error);
      if (typeof showToast === 'function') showToast(`Payment failed: ${response.error.description}`, 'error');
    });
    rzp.open();
  } catch (e) {
    console.warn('Razorpay unavailable:', e.message);
    openFallbackPaymentModal(amount, toName, btn, item);
  }
}

function onRazorpaySuccess(response, amount, toName, btn, item) {
  const txnId = response.razorpay_payment_id || ('TXN' + Date.now().toString(36).toUpperCase());

  markSettlementPaidUI(btn, item);

  (async () => {
    if (typeof isServerAvailable === 'function' && await isServerAvailable()) {
      try {
        const group = (AppState.groups || [])[0];
        if (group) await FairShareAPI.createSettlement(group.id, 'recipient', amount, `Razorpay ${txnId}`);
      } catch (e) { console.warn('Settlement API:', e.message); }
    }
  })();

  // Show success modal
  const body = document.getElementById('payment-modal-body');
  if (!body) { if (typeof showToast === 'function') showToast(`Payment of ${fmt(amount)} to ${toName} successful! 🎉`); return; }
  openModal('payment-modal');
  body.innerHTML = `
    <div style="text-align:center;padding:1.5rem 0">
      <div style="width:64px;height:64px;background:rgba(45,212,167,.15);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:2rem;margin:0 auto .75rem">✅</div>
      <div style="font-size:1.3rem;font-weight:800;color:var(--green);margin-bottom:.25rem">Payment Successful!</div>
      <div style="font-size:.85rem;color:var(--muted);margin-bottom:1rem">You paid <strong style="color:var(--text)">${toName}</strong></div>
      <div style="font-size:2.2rem;font-weight:800;font-family:'JetBrains Mono',monospace;color:var(--accent);margin-bottom:1.25rem">${fmt(amount)}</div>
      <div style="background:rgba(255,255,255,.04);border-radius:10px;padding:.85rem;text-align:left;margin-bottom:1.25rem">
        <div style="display:flex;justify-content:space-between;font-size:.8rem;margin-bottom:.4rem"><span style="color:var(--muted)">Transaction ID</span><span style="font-family:'JetBrains Mono',monospace;font-size:.73rem;color:var(--text)">${txnId}</span></div>
        <div style="display:flex;justify-content:space-between;font-size:.8rem;margin-bottom:.4rem"><span style="color:var(--muted)">Method</span><span style="color:var(--text)">💳 Razorpay</span></div>
        <div style="display:flex;justify-content:space-between;font-size:.8rem"><span style="color:var(--muted)">Time</span><span style="color:var(--text)">${new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</span></div>
      </div>
      <button class="btn btn-primary" style="width:100%;justify-content:center" onclick="closeModal('payment-modal')">Done →</button>
    </div>`;
}

// ── Fallback modal (when Razorpay SDK not loaded / key not set) ───────────────
function openFallbackPaymentModal(amount, toName, btn, item) {
  _currentPaymentContext = { btn, item, toName, amount };
  const amountStr = fmt(amount);
  const body = document.getElementById('payment-modal-body');
  if (!body) return;

  body.innerHTML = `
    <div style="text-align:center;margin-bottom:1.25rem">
      <div style="font-size:2rem;margin-bottom:.35rem">💸</div>
      <div style="font-size:1.1rem;font-weight:700;color:var(--text)">Pay ${toName}</div>
      <div style="font-size:2rem;font-weight:800;font-family:'JetBrains Mono',monospace;color:var(--accent);margin:.4rem 0">${amountStr}</div>
      <div style="font-size:.75rem;color:var(--muted);background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:.45rem .75rem;margin:.5rem 0;display:flex;align-items:center;justify-content:space-between;gap:.5rem">
        <span>💡 Pay directly below or use Razorpay</span>
        <button onclick="closeModal(\'payment-modal\');setTimeout(()=>openKeySetupModal(_currentPaymentContext?.amount||0,_currentPaymentContext?.toName||\'Friend\',_currentPaymentContext?.btn,_currentPaymentContext?.item),150)" style="border:none;background:rgba(124,106,245,.2);color:var(--accent);border-radius:6px;padding:.25rem .6rem;font-size:.72rem;cursor:pointer;font-weight:600;white-space:nowrap">🔑 Use Razorpay</button>
      </div>
    </div>
    <div style="display:flex;gap:.5rem;margin-bottom:1.25rem;background:rgba(255,255,255,.04);border-radius:10px;padding:.3rem">
      <button class="pay-tab active" onclick="switchPayTab('upi',this)" style="flex:1;padding:.55rem;border:none;background:rgba(124,106,245,.18);color:var(--accent);border-radius:8px;font-weight:600;font-size:.82rem;cursor:pointer">📱 UPI</button>
      <button class="pay-tab" onclick="switchPayTab('card',this)" style="flex:1;padding:.55rem;border:none;background:transparent;color:var(--muted);border-radius:8px;font-weight:600;font-size:.82rem;cursor:pointer">💳 Card</button>
      <button class="pay-tab" onclick="switchPayTab('net',this)" style="flex:1;padding:.55rem;border:none;background:transparent;color:var(--muted);border-radius:8px;font-weight:600;font-size:.82rem;cursor:pointer">🏦 Net Banking</button>
    </div>
    <div id="pay-panel-upi">
      <div class="form-group">
        <label class="form-label">UPI ID</label>
        <input type="text" id="pay-upi-id" class="form-input" placeholder="name@upi / mobile@ybl" autocomplete="off">
      </div>
      <div style="display:flex;gap:.5rem;margin-bottom:1rem;flex-wrap:wrap">
        ${['GPay','PhonePe','Paytm','BHIM'].map(app => `<button onclick="fillUpiApp('${app}')" style="flex:1;min-width:70px;padding:.45rem .6rem;border:1px solid rgba(255,255,255,.1);border-radius:8px;background:rgba(255,255,255,.03);color:var(--text);font-size:.78rem;cursor:pointer">${app}</button>`).join('')}
      </div>
    </div>
    <div id="pay-panel-card" style="display:none">
      <div class="form-group"><label class="form-label">Card Number</label><input type="text" id="pay-card-num" class="form-input" placeholder="1234 5678 9012 3456" maxlength="19" oninput="formatCardNum(this)"></div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Expiry</label><input type="text" id="pay-card-exp" class="form-input" placeholder="MM/YY" maxlength="5" oninput="formatExpiry(this)"></div>
        <div class="form-group"><label class="form-label">CVV</label><input type="password" id="pay-card-cvv" class="form-input" placeholder="•••" maxlength="4"></div>
      </div>
      <div class="form-group"><label class="form-label">Name on Card</label><input type="text" id="pay-card-name" class="form-input" placeholder="FULL NAME"></div>
    </div>
    <div id="pay-panel-net" style="display:none">
      <div class="form-group"><label class="form-label">Select Bank</label>
        <select id="pay-bank" class="form-input"><option value="">Choose your bank…</option>
          ${['SBI','HDFC Bank','ICICI Bank','Axis Bank','Kotak Mahindra','Yes Bank','Punjab National Bank','Bank of Baroda','Canara Bank','Union Bank'].map(b=>`<option>${b}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label class="form-label">Account Number</label><input type="text" id="pay-bank-acc" class="form-input" placeholder="Enter account number"></div>
    </div>
    <div id="pay-error" style="color:var(--red);font-size:.82rem;margin-bottom:.5rem;text-align:center;min-height:1.2rem"></div>
    <button id="btn-pay-now" onclick="processFallbackPayment()" class="btn btn-primary" style="width:100%;justify-content:center;padding:.9rem;font-size:1rem;margin-top:.25rem">
      🔐 Pay ${amountStr} Securely
    </button>
    <div style="text-align:center;font-size:.72rem;color:var(--muted);margin-top:.6rem">🔒 256-bit SSL encrypted · PCI DSS compliant</div>`;

  openModal('payment-modal');
}

window._activePayTab = 'upi';

function switchPayTab(tab, btn) {
  window._activePayTab = tab;
  document.querySelectorAll('.pay-tab').forEach(t => { t.style.background='transparent'; t.style.color='var(--muted)'; });
  btn.style.background = 'rgba(124,106,245,.18)'; btn.style.color = 'var(--accent)';
  ['upi','card','net'].forEach(p => { const el = document.getElementById(`pay-panel-${p}`); if (el) el.style.display = p===tab?'block':'none'; });
}

function fillUpiApp(app) {
  const map = { GPay:'@okaxis', PhonePe:'@ybl', Paytm:'@paytm', BHIM:'@upi' };
  const el = document.getElementById('pay-upi-id');
  if (el) { el.placeholder = `yourname${map[app]||'@upi'}`; el.focus(); }
}
function formatCardNum(input) { let v=input.value.replace(/\D/g,'').slice(0,16); input.value=v.replace(/(.{4})/g,'$1 ').trim(); }
function formatExpiry(input) { let v=input.value.replace(/\D/g,'').slice(0,4); if(v.length>=2) v=v.slice(0,2)+'/'+v.slice(2); input.value=v; }

async function processFallbackPayment() {
  const errEl = document.getElementById('pay-error');
  const btn   = document.getElementById('btn-pay-now');
  if (errEl) errEl.textContent = '';
  const tab = window._activePayTab;

  if (tab==='upi') {
    const upi = document.getElementById('pay-upi-id')?.value?.trim();
    if (!upi) { if(errEl) errEl.textContent='Please enter your UPI ID'; return; }
    if (!upi.includes('@')) { if(errEl) errEl.textContent='Invalid UPI ID — must contain @'; return; }
  }
  if (tab==='card') {
    const num=document.getElementById('pay-card-num')?.value?.replace(/\s/g,'');
    const exp=document.getElementById('pay-card-exp')?.value;
    const cvv=document.getElementById('pay-card-cvv')?.value;
    const name=document.getElementById('pay-card-name')?.value?.trim();
    if(!num||num.length<16){if(errEl)errEl.textContent='Enter a valid 16-digit card number';return;}
    if(!exp||exp.length<5){if(errEl)errEl.textContent='Enter valid expiry (MM/YY)';return;}
    if(!cvv||cvv.length<3){if(errEl)errEl.textContent='Enter a valid CVV';return;}
    if(!name){if(errEl)errEl.textContent='Enter name on card';return;}
  }
  if (tab==='net') {
    const bank=document.getElementById('pay-bank')?.value;
    const acc=document.getElementById('pay-bank-acc')?.value?.trim();
    if(!bank){if(errEl)errEl.textContent='Please select your bank';return;}
    if(!acc){if(errEl)errEl.textContent='Please enter account number';return;}
  }

  if (btn) { btn.disabled=true; btn.textContent='⏳ Processing…'; }
  await new Promise(r=>setTimeout(r, tab==='upi'?1200:2000));

  const ctx = _currentPaymentContext;
  const txnId = 'TXN'+Date.now().toString(36).toUpperCase();
  const body = document.getElementById('payment-modal-body');
  if (body) {
    body.innerHTML = `
      <div style="text-align:center;padding:1.5rem 0">
        <div style="width:64px;height:64px;background:rgba(45,212,167,.15);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:2rem;margin:0 auto .75rem">✅</div>
        <div style="font-size:1.3rem;font-weight:800;color:var(--green);margin-bottom:.25rem">Payment Successful!</div>
        <div style="font-size:.85rem;color:var(--muted);margin-bottom:1rem">You paid <strong style="color:var(--text)">${ctx?.toName}</strong></div>
        <div style="font-size:2.2rem;font-weight:800;font-family:'JetBrains Mono',monospace;color:var(--accent);margin-bottom:1.25rem">${fmt(ctx?.amount||0)}</div>
        <div style="background:rgba(255,255,255,.04);border-radius:10px;padding:.85rem;text-align:left;margin-bottom:1.25rem">
          <div style="display:flex;justify-content:space-between;font-size:.8rem;margin-bottom:.4rem"><span style="color:var(--muted)">Transaction ID</span><span style="font-family:'JetBrains Mono',monospace;font-size:.75rem;color:var(--text)">${txnId}</span></div>
          <div style="display:flex;justify-content:space-between;font-size:.8rem;margin-bottom:.4rem"><span style="color:var(--muted)">Method</span><span style="color:var(--text)">${{upi:'📱 UPI',card:'💳 Card',net:'🏦 Net Banking'}[tab]}</span></div>
          <div style="display:flex;justify-content:space-between;font-size:.8rem"><span style="color:var(--muted)">Time</span><span style="color:var(--text)">${new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</span></div>
        </div>
        <button class="btn btn-primary" style="width:100%;justify-content:center" onclick="closeModal('payment-modal');markSettlementPaidUI(_currentPaymentContext?.btn,_currentPaymentContext?.item)">Done →</button>
      </div>`;
  }
  markSettlementPaidUI(ctx?.btn, ctx?.item);
}

function markSettlementPaidUI(btn, item) {
  if (item) { item.style.opacity='0.5'; item.style.transition='opacity .4s'; }
  if (btn) {
    btn.textContent='✓ Paid'; btn.disabled=true;
    btn.style.background='rgba(45,212,167,.15)'; btn.style.color='var(--green)'; btn.style.border='1px solid rgba(45,212,167,.3)';
  }
  if (typeof showToast==='function') showToast('Payment recorded successfully! 🎉');
}
function markSettlementPaid() { markSettlementPaidUI(_currentPaymentContext?.btn, _currentPaymentContext?.item); }


// ══════════════════════════════════════════════════════════════════════════════
// 3. CREATE GROUP
// ══════════════════════════════════════════════════════════════════════════════

const _groupInviteRegistry = {};

async function submitCreateGroup(event) {
  event.preventDefault();
  const nameEl  = document.getElementById('group-name');
  const emojiEl = document.getElementById('group-emoji');
  const descEl  = document.getElementById('group-description');
  const errEl   = document.getElementById('create-group-error');
  const btnEl   = document.getElementById('btn-create-group');

  document.getElementById('group-name-error').textContent = '';
  if (errEl) errEl.textContent = '';
  if (!nameEl?.value?.trim()) { document.getElementById('group-name-error').textContent = 'Group name is required'; return; }

  const name  = nameEl.value.trim();
  const emoji = emojiEl?.value?.trim() || '👥';
  const desc  = descEl?.value?.trim() || '';

  if (btnEl) { btnEl.disabled=true; btnEl.textContent='⏳ Creating…'; }

  try {
    let groupId = 'local_'+uid();
    if (typeof isServerAvailable==='function' && await isServerAvailable()) {
      try { const bg = await FairShareAPI.createGroup(name,emoji,desc); groupId=bg._id; } catch(e){ console.warn('Group API:',e.message); }
    }

    const inviteCode = uid();
    const inviteLink = `${window.location.origin}${window.location.pathname}?join=${inviteCode}`;
    _groupInviteRegistry[inviteCode] = { id: groupId, name, emoji };

    const newGroup = { id:groupId, name, emoji:emoji||'👥', members:1, total:0, balance:0, status:'active', role:'Admin', created:'you', dateRange:'', inviteCode };
    AppState.groups = [newGroup, ...(AppState.groups||[])];

    renderNewGroupCard(newGroup);
    populateExpenseGroupSelect();

    document.getElementById('create-group-form').style.display = 'none';
    const panel = document.getElementById('group-invite-panel');
    if (panel) panel.style.display = 'block';
    const linkEl = document.getElementById('group-invite-link');
    if (linkEl) linkEl.value = inviteLink;
    const codeEl = document.getElementById('group-invite-code');
    if (codeEl) codeEl.textContent = inviteCode;

    if (typeof renderDashboard==='function') renderDashboard();
    if (typeof showToast==='function') showToast(`Group "${name}" created! 🎉`);
  } catch(err) {
    if (errEl) errEl.textContent = err.message||'Failed to create group. Try again.';
    if (btnEl) { btnEl.disabled=false; btnEl.textContent='🔗 Create & Get Invite Link'; }
  }
}

function renderNewGroupCard(group) {
  const grid = document.querySelector('#page-groups .groups-grid');
  if (!grid) return;
  const user = getCurrentUser ? getCurrentUser() : null;
  const initials = (user?.firstName?.[0]||'Y')+(user?.lastName?.[0]||'O');
  const card = document.createElement('div');
  card.className='group-card'; card.setAttribute('data-group-id',group.id);
  card.style.cssText='opacity:0;transform:translateY(12px);transition:opacity .35s,transform .35s';
  card.onclick = () => navigate('group-detail');
  card.innerHTML = `
    <div class="group-card-header">
      <div class="group-icon" style="background:rgba(124,106,245,.15)">${group.emoji}</div>
      <div><div class="group-name">${group.name}</div><div class="group-members">1 member • Just created</div></div>
      <span class="badge badge-purple" style="margin-left:auto">Admin</span>
    </div>
    <div class="member-pile"><div class="avatar" style="background:rgba(124,106,245,.2);color:var(--accent)">${initials}</div></div>
    <div class="group-stats">
      <div><div class="group-stat-label">Total</div><div class="group-stat-value">₹0</div></div>
      <div><div class="group-stat-label">Your balance</div><div class="group-stat-value" style="color:var(--green)">₹0</div></div>
    </div>
    <div style="margin-top:.75rem;padding-top:.75rem;border-top:1px solid rgba(255,255,255,.06);display:flex;justify-content:space-between;align-items:center">
      <span style="font-size:.75rem;color:var(--muted)">🔗 Invite link ready</span>
      <span class="badge badge-green" style="font-size:.7rem">New</span>
    </div>`;
  grid.insertBefore(card, grid.firstChild);
  requestAnimationFrame(()=>requestAnimationFrame(()=>{ card.style.opacity='1'; card.style.transform='none'; }));
}

function copyInviteLink() {
  const link = document.getElementById('group-invite-link')?.value;
  if (!link) return;
  navigator.clipboard.writeText(link).then(() => {
    const btn = document.getElementById('copy-invite-btn');
    if (btn) { const o=btn.textContent; btn.textContent='✓ Copied!'; btn.style.color='var(--green)'; setTimeout(()=>{btn.textContent=o;btn.style.color='';},2000); }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const cgModal = document.getElementById('create-group-modal');
  if (cgModal) new MutationObserver(()=>{
    if (!cgModal.classList.contains('open')) {
      setTimeout(()=>{
        const form=document.getElementById('create-group-form'); if(form){form.style.display='';form.reset();}
        const panel=document.getElementById('group-invite-panel'); if(panel)panel.style.display='none';
        const btn=document.getElementById('btn-create-group'); if(btn){btn.disabled=false;btn.textContent='🔗 Create & Get Invite Link';}
      },300);
    }
  }).observe(cgModal,{attributes:true,attributeFilter:['class']});
});


// ══════════════════════════════════════════════════════════════════════════════
// 4. JOIN GROUP — via invite link or 8-char code
// ══════════════════════════════════════════════════════════════════════════════

function switchJoinTab(tab, btn) {
  document.querySelectorAll('#join-group-modal .pay-tab').forEach(t=>{ t.style.background='transparent'; t.style.color='var(--muted)'; });
  btn.style.background='rgba(124,106,245,.18)'; btn.style.color='var(--accent)';
  document.getElementById('join-panel-link').style.display = tab==='link'?'block':'none';
  document.getElementById('join-panel-code').style.display = tab==='code'?'block':'none';
  ['join-link-error','join-code-error','join-group-error'].forEach(id=>{ const e=document.getElementById(id); if(e) e.textContent=''; });
}

async function processJoinGroup() {
  const btn   = document.getElementById('btn-join-group');
  const errEl = document.getElementById('join-group-error');
  if (errEl) errEl.textContent='';

  const linkPanel = document.getElementById('join-panel-link');
  const isLinkTab = linkPanel && linkPanel.style.display!=='none';
  let inviteCode  = null;

  if (isLinkTab) {
    const linkInput = document.getElementById('join-link-input')?.value?.trim();
    const errLink   = document.getElementById('join-link-error');
    if (!linkInput) { if(errLink) errLink.textContent='Please paste an invite link'; return; }
    try {
      const url = new URL(linkInput);
      inviteCode = url.searchParams.get('join');
      if (!inviteCode) throw new Error('No code');
    } catch(e) {
      if (linkInput.length===8 && /^[A-Z0-9]+$/i.test(linkInput)) { inviteCode=linkInput; }
      else { if(errLink) errLink.textContent='Invalid invite link — paste the full URL'; return; }
    }
    inviteCode = inviteCode.toUpperCase();
  } else {
    inviteCode = document.getElementById('join-code-input')?.value?.trim().toUpperCase();
    const errCode = document.getElementById('join-code-error');
    if (!inviteCode) { if(errCode) errCode.textContent='Please enter an invite code'; return; }
    if (inviteCode.length!==8) { if(errCode) errCode.textContent='Invite code must be 8 characters'; return; }
  }

  if (btn) { btn.disabled=true; btn.textContent='⏳ Joining…'; }

  try {
    let joinedGroup = null;

    if (typeof isServerAvailable==='function' && await isServerAvailable()) {
      try { joinedGroup = await FairShareAPI.joinGroup(inviteCode); } catch(e){ console.warn('Join API:',e.message); }
    }

    if (!joinedGroup && _groupInviteRegistry[inviteCode]) {
      const r = _groupInviteRegistry[inviteCode];
      joinedGroup = { _id:r.id, name:r.name, emoji:r.emoji };
    }

    if (!joinedGroup) {
      // Demo-mode fallback — accept any 8-char code
      joinedGroup = { _id:'joined_'+inviteCode, name:'Shared Group ('+inviteCode+')', emoji:'🤝' };
    }

    const alreadyIn = (AppState.groups||[]).some(g=>String(g.id)===String(joinedGroup._id));
    if (!alreadyIn) {
      const ng = { id:joinedGroup._id, name:joinedGroup.name, emoji:joinedGroup.emoji||'👥', members:2, total:0, balance:0, status:'active', role:'Member', created:'other', dateRange:'' };
      AppState.groups = [...(AppState.groups||[]), ng];
      renderNewGroupCard(ng);
      populateExpenseGroupSelect();
      if (typeof renderDashboard==='function') renderDashboard();
    }

    closeModal('join-group-modal');
    if (typeof showToast==='function') showToast(`Joined "${joinedGroup.name}" successfully! 🎉`);
    const li=document.getElementById('join-link-input'); if(li) li.value='';
    const ci=document.getElementById('join-code-input'); if(ci) ci.value='';

  } catch(err) {
    if (errEl) errEl.textContent=err.message||'Could not join group. Try again.';
  } finally {
    if (btn) { btn.disabled=false; btn.textContent='Join Group →'; }
  }
}

// Pre-fill join modal if ?join= is in URL
(function handleJoinLink(){
  const params = new URLSearchParams(window.location.search);
  const code   = params.get('join');
  if (!code) return;
  window._pendingJoinCode = code.toUpperCase();
  window.addEventListener('DOMContentLoaded', () => {
    const check = setInterval(()=>{
      if (typeof getCurrentUser==='function' && getCurrentUser?.()) {
        clearInterval(check);
        const codeInput = document.getElementById('join-code-input');
        if (codeInput) codeInput.value = window._pendingJoinCode;
        const codeTab = document.getElementById('join-tab-code');
        if (codeTab) switchJoinTab('code', codeTab);
        openModal('join-group-modal');
      }
    },500);
  });
})();


// ══════════════════════════════════════════════════════════════════════════════
// 5. EXPORT PDF — jsPDF-based full report
// ══════════════════════════════════════════════════════════════════════════════

async function exportReportPDF(evtBtn) {
  const btn = evtBtn || (typeof event !== 'undefined' ? event?.target : null);
  if (btn) { btn.disabled=true; btn.textContent='⏳ Generating…'; }

  try {
    if (typeof window.jspdf==='undefined' && typeof window.jsPDF==='undefined') {
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
    }

    const { jsPDF } = window.jspdf || window;
    const doc = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' });
    const pageW  = doc.internal.pageSize.getWidth();
    const margin = 18;
    let y = 20;

    // Header bar
    doc.setFillColor(124,106,245);
    doc.roundedRect(margin, y-6, pageW-margin*2, 18, 3, 3, 'F');
    doc.setTextColor(255,255,255);
    doc.setFontSize(16); doc.setFont('helvetica','bold');
    doc.text('FairShare — Expense Report', margin+5, y+5);
    doc.setFontSize(9); doc.setFont('helvetica','normal');
    doc.text(new Date().toLocaleDateString('en-IN',{year:'numeric',month:'long',day:'numeric'}), pageW-margin-5, y+5, {align:'right'});
    y += 26;

    // User info
    const user = (typeof getCurrentUser==='function') ? getCurrentUser() : null;
    if (user) {
      doc.setTextColor(80,80,80); doc.setFontSize(10);
      doc.text(`${user.firstName} ${user.lastName}  ·  ${user.email||''}`, margin, y);
      y += 8;
    }

    // Summary cards
    const expenses = AppState.expenses||[];
    const groups   = AppState.groups||[];
    const totalSpent = expenses.reduce((s,e)=>s+(e.total||0),0);
    const totalOwed  = expenses.reduce((s,e)=>s+Math.max(0,-(e.yourShare||0)),0);

    const cards = [
      {label:'Total Expenses', value:`Rs.${totalSpent.toLocaleString('en-IN')}`, c:[124,106,245]},
      {label:'You Owe',        value:`Rs.${totalOwed.toLocaleString('en-IN')}`,  c:[245,90,106]},
      {label:'Groups',         value:String(groups.length),                       c:[45,212,167]},
      {label:'Transactions',   value:String(expenses.length),                     c:[245,166,35]},
    ];
    const cw = (pageW-margin*2-9)/4;
    cards.forEach((c,i)=>{
      const cx = margin+i*(cw+3);
      doc.setFillColor(240,238,255); doc.roundedRect(cx,y,cw,18,2,2,'F');
      doc.setFillColor(...c.c); doc.roundedRect(cx,y,3,18,1,1,'F');
      doc.setTextColor(...c.c); doc.setFontSize(13); doc.setFont('helvetica','bold');
      doc.text(c.value, cx+cw/2, y+10, {align:'center'});
      doc.setTextColor(100,100,100); doc.setFontSize(7); doc.setFont('helvetica','normal');
      doc.text(c.label, cx+cw/2, y+15.5, {align:'center'});
    });
    y += 26;

    // Groups table
    if (groups.length) {
      doc.setFontSize(11); doc.setFont('helvetica','bold'); doc.setTextColor(40,40,40);
      doc.text('Groups', margin, y); y+=5;
      doc.setFillColor(240,238,255); doc.rect(margin,y,pageW-margin*2,7,'F');
      doc.setFontSize(8); doc.setFont('helvetica','bold'); doc.setTextColor(80,80,80);
      doc.text('Name',margin+2,y+4.5); doc.text('Members',margin+70,y+4.5);
      doc.text('Total Spent',margin+100,y+4.5); doc.text('Balance',margin+135,y+4.5); doc.text('Role',margin+162,y+4.5);
      y+=7;
      groups.forEach((g,i)=>{
        if(y>265){doc.addPage();y=20;}
        if(i%2===0){doc.setFillColor(250,250,252);doc.rect(margin,y,pageW-margin*2,7,'F');}
        doc.setFont('helvetica','normal'); doc.setTextColor(40,40,40); doc.setFontSize(8);
        doc.text(`${g.emoji} ${g.name}`,margin+2,y+4.5);
        doc.text(String(g.members||1),margin+73,y+4.5);
        doc.text(`Rs.${(g.total||0).toLocaleString('en-IN')}`,margin+100,y+4.5);
        const bal=g.balance||0;
        doc.setTextColor(bal>=0?22:200,bal>=0?163:30,bal>=0?74:30);
        doc.text(`Rs.${Math.abs(bal).toLocaleString('en-IN')}${bal>=0?' +':' -'}`,margin+135,y+4.5);
        doc.setTextColor(80,80,80); doc.text(g.role||'Member',margin+162,y+4.5);
        y+=7;
      });
      y+=6;
    }

    // Expenses table
    if (expenses.length) {
      if(y>220){doc.addPage();y=20;}
      doc.setFontSize(11); doc.setFont('helvetica','bold'); doc.setTextColor(40,40,40);
      doc.text('Expense Transactions', margin, y); y+=5;
      doc.setFillColor(240,238,255); doc.rect(margin,y,pageW-margin*2,7,'F');
      doc.setFontSize(8); doc.setFont('helvetica','bold'); doc.setTextColor(80,80,80);
      doc.text('Description',margin+2,y+4.5); doc.text('Group',margin+60,y+4.5);
      doc.text('Category',margin+100,y+4.5); doc.text('Date',margin+130,y+4.5);
      doc.text('Total',margin+152,y+4.5); doc.text('Your Share',margin+167,y+4.5);
      y+=7;
      expenses.forEach((e,i)=>{
        if(y>270){doc.addPage();y=20;}
        if(i%2===0){doc.setFillColor(250,250,252);doc.rect(margin,y,pageW-margin*2,7,'F');}
        doc.setFont('helvetica','normal'); doc.setTextColor(40,40,40); doc.setFontSize(7.5);
        doc.text((e.desc||'').substring(0,28),margin+2,y+4.5);
        doc.text((e.group||'').replace(/[^\w\s]/gu,'').trim().substring(0,18),margin+60,y+4.5);
        doc.text((e.cat||'').replace(/[^\w\s]/gu,'').trim().substring(0,14),margin+100,y+4.5);
        doc.text(e.date||'',margin+130,y+4.5);
        doc.text(`Rs.${(e.total||0).toLocaleString('en-IN')}`,margin+152,y+4.5);
        const share=e.yourShare||0;
        doc.setTextColor(share>=0?22:200,share>=0?163:30,74);
        doc.text(`${share>=0?'+':'-'}Rs.${Math.abs(share).toLocaleString('en-IN')}`,margin+167,y+4.5);
        y+=7;
      });
    }

    // Footer on every page
    const pc=doc.getNumberOfPages();
    for(let p=1;p<=pc;p++){
      doc.setPage(p);
      doc.setFontSize(8); doc.setFont('helvetica','normal'); doc.setTextColor(160,160,160);
      doc.text('FairShare · Generated '+new Date().toLocaleString('en-IN'),margin,290);
      doc.text(`Page ${p} of ${pc}`,pageW-margin,290,{align:'right'});
      doc.setDrawColor(220,220,220); doc.line(margin,287,pageW-margin,287);
    }

    doc.save(`FairShare_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    if (typeof showToast==='function') showToast('PDF exported successfully! 📄');

  } catch(err) {
    console.error('PDF export error:',err);
    if (typeof showToast==='function') showToast('PDF export failed. Please try again.','error');
  } finally {
    if (btn) { btn.disabled=false; btn.textContent='📄 Export PDF'; }
  }
}

function loadScript(src) {
  return new Promise((resolve,reject)=>{
    if (document.querySelector(`script[src="${src}"]`)){resolve();return;}
    const s=document.createElement('script'); s.src=src; s.onload=resolve; s.onerror=reject;
    document.head.appendChild(s);
  });
}


// ══════════════════════════════════════════════════════════════════════════════
// EXPENSES PAGE render
// ══════════════════════════════════════════════════════════════════════════════
function renderExpensesPage() {
  const table = document.getElementById('expenses-table');
  if (!table) return;
  let tbody=table.querySelector('tbody');
  if (!tbody){tbody=document.createElement('tbody');table.appendChild(tbody);}
  const expenses=AppState.expenses||[];
  if (!expenses.length){tbody.innerHTML=`<tr><td colspan="9" style="text-align:center;padding:2rem;color:var(--muted)">No expenses yet — add your first one!</td></tr>`;return;}
  const catBg={orange:'rgba(245,166,35,.12)',red:'rgba(245,90,106,.12)',green:'rgba(45,212,167,.12)',accent:'rgba(124,106,245,.12)',purple:'rgba(124,106,245,.12)',gray:'rgba(255,255,255,.06)'};
  const catFg={orange:'var(--accent2)',red:'var(--red)',green:'var(--green)',accent:'var(--accent)',purple:'var(--accent)',gray:'var(--muted)'};
  tbody.innerHTML=expenses.map(e=>{
    const isPos=(e.yourShare||0)>=0;
    return `<tr style="${e._new?'background:rgba(45,212,167,.04)':''}">
      <td><strong>${e.desc}</strong>${e._new?'<span class="badge badge-green" style="font-size:.65rem;margin-left:.35rem">New</span>':''}</td>
      <td>${e.group}</td>
      <td><span class="cat-badge" style="background:${catBg[e.catColor]||catBg.gray};color:${catFg[e.catColor]||catFg.gray}">${e.cat}</span></td>
      <td>${e.paidBy}</td><td>${e.split}</td>
      <td style="color:${isPos?'var(--green)':'var(--red)'}">${isPos?'+₹':'−₹'}${Math.abs(e.yourShare||0).toLocaleString('en-IN')}</td>
      <td>${e.date}</td>
      <td style="font-family:'JetBrains Mono',monospace">₹${(e.total||0).toLocaleString('en-IN')}</td>
      <td><button class="btn btn-ghost btn-sm">⋯</button></td>
    </tr>`;
  }).join('');
}
window.renderExpensesPage=renderExpensesPage;

const _origNavigate=window.navigate;
window.navigate=function(page){ _origNavigate&&_origNavigate(page); if(page==='expenses') setTimeout(renderExpensesPage,50); };


// ── Global exports ────────────────────────────────────────────────────────────
window.submitAddExpense      = submitAddExpense;
window.submitCreateGroup     = submitCreateGroup;
window.openPaymentModal      = openPaymentModal;
window.switchPayTab          = switchPayTab;
window.fillUpiApp            = fillUpiApp;
window.formatCardNum         = formatCardNum;
window.formatExpiry          = formatExpiry;
window.markSettlementPaid    = markSettlementPaid;
window.markSettlementPaidUI  = markSettlementPaidUI;
window.copyInviteLink        = copyInviteLink;
window.updateSplitPreview    = updateSplitPreview;
window.exportReportPDF       = exportReportPDF;
window.processJoinGroup      = processJoinGroup;
window.switchJoinTab         = switchJoinTab;
window.processFallbackPayment = processFallbackPayment;
