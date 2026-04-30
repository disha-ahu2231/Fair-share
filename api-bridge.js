/**
 * ─── FairShare API Bridge v2 ─────────────────────────────────────────────────
 *
 * Connects the frontend to the full backend API.
 * Auth, Groups, Expenses, Balances, Settlements — all wired here.
 *
 * Falls back gracefully to local AppState if the server is offline,
 * so the app still works in dev/demo mode without a backend.
 */

// ─── Config ───────────────────────────────────────────────────────────────────
const API_BASE  = 'http://localhost:5000/api';
const TOKEN_KEY = 'fairshare_jwt';

// ─── Token helpers ────────────────────────────────────────────────────────────
function saveToken(token)  { localStorage.setItem(TOKEN_KEY, token); }
function getToken()        { return localStorage.getItem(TOKEN_KEY); }
function clearToken()      { localStorage.removeItem(TOKEN_KEY); }

// ─── Generic API caller ───────────────────────────────────────────────────────
async function apiCall(endpoint, method = 'GET', body = null) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const config = { method, headers };
  if (body) config.body = JSON.stringify(body);
  const response = await fetch(`${API_BASE}${endpoint}`, config);
  const data = await response.json();
  return { ok: response.ok, status: response.status, data };
}

// ─── UI helpers ───────────────────────────────────────────────────────────────
function showError(id, msg) { const el = document.getElementById(id); if (el) el.textContent = msg; }
function clearErrors(...ids) { ids.forEach(id => showError(id, '')); }
function setButtonLoading(btnId, loading, originalText) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled = loading;
  btn.textContent = loading ? '⏳ Please wait...' : originalText;
}

// ─── Toast notification ───────────────────────────────────────────────────────
function showToast(message, type = 'success') {
  const existing = document.getElementById('fs-toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.id = 'fs-toast';
  Object.assign(toast.style, {
    position: 'fixed', bottom: '24px', right: '24px',
    padding: '12px 20px', borderRadius: '10px',
    background: type === 'error' ? '#ff4d4d' : '#00c47c',
    color: '#fff', fontFamily: 'inherit', fontSize: '14px',
    fontWeight: '500', zIndex: '9999',
    boxShadow: '0 4px 16px rgba(0,0,0,0.18)', transition: 'opacity 0.4s',
  });
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 400); }, 3000);
}

// ─── Server availability ──────────────────────────────────────────────────────
let _serverAvailable = null;
async function isServerAvailable() {
  if (_serverAvailable !== null) return _serverAvailable;
  try {
    const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(2000) });
    _serverAvailable = res.ok;
  } catch { _serverAvailable = false; }
  return _serverAvailable;
}

// ══════════════════════════════════════════════════════════════════════════════
// AUTH
// ══════════════════════════════════════════════════════════════════════════════

window.handleLoginSubmit = async function (event) {
  if (event) event.preventDefault();
  const emailInput    = document.getElementById('login-email');
  const passwordInput = document.getElementById('login-password');
  clearErrors('login-email-error', 'login-password-error');

  let valid = true;
  if (!emailInput?.value.trim()) { showError('login-email-error', 'Email is required'); valid = false; }
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value)) { showError('login-email-error', 'Enter a valid email address'); valid = false; }
  if (!passwordInput?.value) { showError('login-password-error', 'Password is required'); valid = false; }
  if (!valid) return;

  setButtonLoading('btn-login-submit', true, 'Sign In →');
  try {
    const { ok, data } = await apiCall('/login', 'POST', {
      email: emailInput.value.trim(), password: passwordInput.value,
    });
    if (ok && data.success) {
      saveToken(data.token);
      _serverAvailable = true;
      login(data.user.email, '', data.user.firstName, data.user.lastName);
      setTimeout(() => syncStateFromBackend(), 500);
    } else {
      showError('login-password-error', data.message || 'Invalid email or password.');
    }
  } catch {
    console.warn('Backend unavailable — using local auth.');
    login(emailInput.value.trim(), passwordInput.value);
  } finally {
    setButtonLoading('btn-login-submit', false, 'Sign In →');
  }
};

window.handleSignupSubmit = async function (event) {
  if (event) event.preventDefault();
  const firstName = document.getElementById('signup-first-name');
  const lastName  = document.getElementById('signup-last-name');
  const email     = document.getElementById('signup-email');
  const password  = document.getElementById('signup-password');
  clearErrors('signup-fn-error', 'signup-ln-error', 'signup-email-error', 'signup-pw-error');

  let valid = true;
  if (!firstName?.value.trim())   { showError('signup-fn-error',    'First name is required'); valid = false; }
  if (!lastName?.value.trim())    { showError('signup-ln-error',    'Last name is required');  valid = false; }
  if (!email?.value.trim())       { showError('signup-email-error', 'Email is required');       valid = false; }
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) { showError('signup-email-error', 'Enter a valid email'); valid = false; }
  if (!password?.value)           { showError('signup-pw-error',    'Password is required');    valid = false; }
  else if (password.value.length < 8) { showError('signup-pw-error', 'Min 8 characters');       valid = false; }
  if (!valid) return;

  setButtonLoading('btn-signup-submit', true, 'Create Account →');
  try {
    const { ok, data } = await apiCall('/signup', 'POST', {
      firstName: firstName.value.trim(), lastName: lastName.value.trim(),
      email: email.value.trim(), password: password.value,
    });
    if (ok && data.success) {
      saveToken(data.token);
      _serverAvailable = true;
      login(data.user.email, '', data.user.firstName, data.user.lastName);
      setTimeout(() => syncStateFromBackend(), 500);
    } else {
      showError('signup-email-error', data.message || 'Signup failed. Please try again.');
    }
  } catch {
    showError('signup-email-error', 'Cannot connect to server. Please try again.');
  } finally {
    setButtonLoading('btn-signup-submit', false, 'Create Account →');
  }
};

const _originalLogout = window.logout;
window.logout = function () {
  clearToken();
  _serverAvailable = null;
  if (typeof _originalLogout === 'function') _originalLogout();
};

// ══════════════════════════════════════════════════════════════════════════════
// FAIRSHARE API — Groups, Expenses, Balances, Settlements
// ══════════════════════════════════════════════════════════════════════════════

const FairShareAPI = {
  // Groups
  async getGroups() {
    const { ok, data } = await apiCall('/groups');
    if (ok && data.success) return data.groups;
    throw new Error(data.message || 'Failed to load groups');
  },
  async createGroup(name, emoji = '👥', description = '') {
    const { ok, data } = await apiCall('/groups', 'POST', { name, emoji, description });
    if (ok && data.success) return data.group;
    throw new Error(data.message || 'Failed to create group');
  },
  async updateGroup(groupId, updates) {
    const { ok, data } = await apiCall(`/groups/${groupId}`, 'PUT', updates);
    if (ok && data.success) return data.group;
    throw new Error(data.message || 'Failed to update group');
  },
  async deleteGroup(groupId) {
    const { ok, data } = await apiCall(`/groups/${groupId}`, 'DELETE');
    if (!ok) throw new Error(data.message || 'Failed to delete group');
    return true;
  },
  async addMember(groupId, email) {
    const { ok, data } = await apiCall(`/groups/${groupId}/members`, 'POST', { email });
    if (ok && data.success) return data.group;
    throw new Error(data.message || 'Failed to add member');
  },
  async removeMember(groupId, userId) {
    const { ok, data } = await apiCall(`/groups/${groupId}/members/${userId}`, 'DELETE');
    if (!ok) throw new Error(data.message || 'Failed to remove member');
    return true;
  },
  // Expenses
  async getExpenses(groupId) {
    const { ok, data } = await apiCall(`/groups/${groupId}/expenses`);
    if (ok && data.success) return data.expenses;
    throw new Error(data.message || 'Failed to load expenses');
  },
  async getAllExpenses() {
    const { ok, data } = await apiCall('/expenses');
    if (ok && data.success) return data.expenses;
    throw new Error(data.message || 'Failed to load expenses');
  },
  async createExpense(groupId, expenseData) {
    const { ok, data } = await apiCall(`/groups/${groupId}/expenses`, 'POST', expenseData);
    if (ok && data.success) return data.expense;
    throw new Error(data.message || 'Failed to create expense');
  },
  async updateExpense(expenseId, updates) {
    const { ok, data } = await apiCall(`/expenses/${expenseId}`, 'PUT', updates);
    if (ok && data.success) return data.expense;
    throw new Error(data.message || 'Failed to update expense');
  },
  async deleteExpense(expenseId) {
    const { ok, data } = await apiCall(`/expenses/${expenseId}`, 'DELETE');
    if (!ok) throw new Error(data.message || 'Failed to delete expense');
    return true;
  },
  // Balances
  async getBalances(groupId) {
    const { ok, data } = await apiCall(`/groups/${groupId}/balances`);
    if (ok && data.success) return data.balances;
    throw new Error(data.message || 'Failed to load balances');
  },
  // Settlements
  async getSettlements(groupId) {
    const { ok, data } = await apiCall(`/groups/${groupId}/settlements`);
    if (ok && data.success) return data.settlements;
    throw new Error(data.message || 'Failed to load settlements');
  },
  async createSettlement(groupId, toUserId, amount, note = '') {
    const { ok, data } = await apiCall(`/groups/${groupId}/settlements`, 'POST', { toUserId, amount, note });
    if (ok && data.success) return data.settlement;
    throw new Error(data.message || 'Failed to record settlement');
  },
  async getAllSettlements() {
    const { ok, data } = await apiCall('/expenses/settlements');
    if (ok && data.success) return data.settlements;
    throw new Error(data.message || 'Failed to load settlements');
  },
};

window.FairShareAPI = FairShareAPI;

// ══════════════════════════════════════════════════════════════════════════════
// STATE SYNC — pull backend data into AppState and re-render
// ══════════════════════════════════════════════════════════════════════════════

async function syncStateFromBackend() {
  if (!(await isServerAvailable())) return;
  try {
    const [groups, expenses] = await Promise.all([
      FairShareAPI.getGroups(),
      FairShareAPI.getAllExpenses(),
    ]);

    AppState.groups = groups.map(g => ({
      id:        g._id,
      name:      g.name,
      emoji:     g.emoji || '👥',
      members:   g.members?.length || 1,
      total:     g.totalExpenses || 0,
      balance:   0,
      status:    g.status,
      role:      g.members?.find(m => String(m.user?._id || m.user) === String(AppState.user?.id))?.role || 'member',
      created:   g.createdBy?.firstName || '',
      dateRange: '',
    }));

    const currentUserId = AppState.user?.id;
    AppState.expenses = expenses.map(exp => {
      const myShare   = exp.splits?.find(s => String(s.user) === String(currentUserId));
      const paidByMe  = String(exp.paidBy?._id || exp.paidBy) === String(currentUserId);
      const yourShare = paidByMe ? exp.amount - (myShare?.amount || 0) : -(myShare?.amount || 0);
      return {
        id:        exp._id,
        desc:      exp.description,
        group:     `${exp.group?.emoji || ''} ${exp.group?.name || ''}`.trim(),
        groupId:   exp.group?._id || exp.group,
        cat:       exp.category,
        catColor:  ({ Food:'orange', Transport:'red', Stay:'accent', Bills:'accent', Entertainment:'green', Shopping:'purple' })[exp.category] || 'gray',
        paidBy:    paidByMe ? 'You' : `${exp.paidBy?.firstName || ''} ${exp.paidBy?.lastName || ''}`.trim(),
        split:     exp.splitType ? exp.splitType.charAt(0).toUpperCase() + exp.splitType.slice(1) : 'Equal',
        yourShare,
        date:      exp.date ? new Date(exp.date).toLocaleDateString('en-IN', { month:'short', day:'numeric' }) : '',
        total:     exp.amount,
      };
    });

    if (typeof renderDashboard === 'function') renderDashboard();
    console.log(`✅ Synced ${AppState.groups.length} groups, ${AppState.expenses.length} expenses.`);
  } catch (err) {
    console.warn('State sync failed, keeping local data:', err.message);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// DOM READY — restore session + hook expense form
// ══════════════════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', async () => {
  const token = getToken();
  if (token) {
    try {
      const { ok, data } = await apiCall('/user');
      if (ok && data.success) {
        _serverAvailable = true;
        syncStateFromBackend();
        console.log('✅ JWT verified for', data.user.firstName);
      } else {
        clearToken();
        localStorage.removeItem('SplitShare_user_session');
      }
    } catch {
      console.warn('⚠️ Backend unreachable, using local session.');
    }
  }

  // Hook expense form if it exists
  const expenseForm = document.getElementById('add-expense-form');
  if (expenseForm) {
    expenseForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!(await isServerAvailable())) return;
      const desc     = document.getElementById('expense-desc')?.value?.trim();
      const amount   = document.getElementById('expense-amount')?.value;
      const category = document.getElementById('expense-category')?.value || 'Other';
      const notes    = document.getElementById('expense-notes')?.value || '';
      const groupSelect = document.getElementById('expense-group');
      const groupId     = groupSelect?.value || AppState.groups?.[0]?.id;
      if (!desc || !amount || !groupId) return;
      try {
        await FairShareAPI.createExpense(groupId, { description: desc, amount: Number(amount), category, notes, splitType: 'equal' });
        showToast(`Expense "${desc}" added!`);
        await syncStateFromBackend();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }

  window.syncStateFromBackend = syncStateFromBackend;
  window.FairShareAPI         = FairShareAPI;
  window.showToast            = showToast;
});
