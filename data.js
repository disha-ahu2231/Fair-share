// ─── DATA / DASHBOARD RENDERING ───

function getExpenses() {
  return AppState.expenses;
}

function renderDashboard() {
  const user = getCurrentUser();
  if (!user) return;

  // ── Greeting ──
  const greetingEl = document.getElementById('user-greeting');
  if (greetingEl) {
    const hour = new Date().getHours();
    const tod  = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
    greetingEl.textContent = `Good ${tod}, ${user.firstName} 👋`;
  }

  const expenses = AppState.expenses || [];
  const groups   = AppState.groups   || [];

  // ── Show/hide empty state ──
  const contentEl = document.getElementById('dashboard-content');
  const emptyEl   = document.getElementById('dashboard-empty');
  if (contentEl) contentEl.style.display = '';
  if (emptyEl)   emptyEl.style.display   = 'none';

  // ── Stat cards ──
  const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

  const totalExp  = expenses.reduce((s, e) => s + Math.abs(e.total || 0), 0);
  const owed      = expenses.filter(e => (e.yourShare || 0) > 0).reduce((s, e) => s + e.yourShare, 0);
  const owe       = expenses.filter(e => (e.yourShare || 0) < 0).reduce((s, e) => s + Math.abs(e.yourShare), 0);
  const net       = owed - owe;

  const fmt = n => n === 0 ? '₹0' : (n > 0 ? '+₹' : '−₹') + Math.abs(n).toLocaleString('en-IN');

  setEl('total-expense',    expenses.length ? '₹' + totalExp.toLocaleString('en-IN') : '₹0');
  setEl('owed-amount',      owed  > 0 ? '₹' + owed.toLocaleString('en-IN') : '₹0');
  setEl('owe-amount',       owe   > 0 ? '₹' + owe.toLocaleString('en-IN')  : '₹0');
  setEl('net-balance',      fmt(net));

  // Stat sub-labels
  const owedGroups = groups.filter(g => g.balance > 0).length;
  const oweCount   = groups.filter(g => g.balance < 0).length;
  setEl('total-expense-sub', expenses.length ? `${expenses.length} expense${expenses.length > 1 ? 's' : ''} recorded` : '');
  setEl('owed-amount-sub',   owedGroups > 0  ? `Across ${owedGroups} group${owedGroups > 1 ? 's' : ''}` : '');
  setEl('owe-amount-sub',    oweCount   > 0  ? `${oweCount} group${oweCount > 1 ? 's' : ''}` : '');
  setEl('net-balance-sub',   net >= 0 ? "You're doing great!" : 'You have pending dues');

  // ── Balances list ──
  const balEl = document.getElementById('dashboard-balances-list');
  if (balEl) {
    if (groups.length === 0) {
      balEl.innerHTML = `<div style="padding:1.5rem;text-align:center;color:var(--muted);font-size:0.9rem">No balances to show</div>`;
    } else {
      balEl.innerHTML = groups
        .filter(g => g.balance !== 0)
        .map(g => {
          const isPos = g.balance > 0;
          const initials = g.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
          const color = isPos ? 'rgba(45,212,167,.15);color:var(--green)' : 'rgba(245,90,106,.15);color:var(--red)';
          const amtColor = isPos ? 'var(--green)' : 'var(--red)';
          const amt = (isPos ? '+' : '−') + '₹' + Math.abs(g.balance).toLocaleString('en-IN');
          return `<div class="balance-row">
            <div class="balance-user">
              <div class="avatar" style="background:${color}">${initials}</div>
              <div>
                <div style="font-size:.88rem;font-weight:500">${g.name}</div>
                <div style="font-size:.75rem;color:var(--muted)">${g.members} members</div>
              </div>
            </div>
            <div style="font-family:'JetBrains Mono',monospace;font-size:.9rem;color:${amtColor}">${amt}</div>
          </div>`;
        }).join('') || `<div style="padding:1.5rem;text-align:center;color:var(--muted);font-size:0.9rem">All settled up! 🎉</div>`;
    }
  }

  // ── Recent Activity ──
  const actEl = document.getElementById('dashboard-activity-list');
  if (actEl) {
    if (expenses.length === 0) {
      actEl.innerHTML = `<div style="padding:1.5rem;text-align:center;color:var(--muted);font-size:0.9rem">No recent activity</div>`;
    } else {
      const catIcons = { 'Food': '🍽️', 'Bills': '🏠', 'Transport': '⛽', 'Entertain': '🎬', 'Stay': '🏨', 'default': '💸' };
      const catBg    = { 'orange': 'rgba(245,166,35,.15)', 'green': 'rgba(45,212,167,.15)', 'accent': 'rgba(124,106,245,.15)', 'red': 'rgba(245,90,106,.15)' };
      actEl.innerHTML = expenses.slice(0, 5).map(e => {
        const isPos = (e.yourShare || 0) >= 0;
        const amtColor = isPos ? 'var(--green)' : 'var(--red)';
        const amtText  = (isPos ? '+' : '−') + '₹' + Math.abs(e.yourShare || 0).toLocaleString('en-IN');
        const catParts = (e.cat || '').split(' ');
        const icon     = catParts[0] || '💸';
        const catKey   = catParts.slice(1).join('') || 'default';
        const bg       = catBg[e.catColor] || 'rgba(124,106,245,.15)';
        return `<div class="activity-item">
          <div class="activity-icon" style="background:${bg}">${icon}</div>
          <div class="activity-info">
            <div class="activity-title">${e.desc}</div>
            <div class="activity-meta">${e.group} • Paid by ${e.paidBy} • ${e.date}</div>
          </div>
          <div class="activity-amount" style="color:${amtColor}">${amtText}</div>
        </div>`;
      }).join('');
    }
  }

  // ── Your Groups ──
  const grpEl = document.getElementById('dashboard-groups-list');
  if (grpEl) {
    if (groups.length === 0) {
      grpEl.innerHTML = `<div style="padding:1.5rem;text-align:center;color:var(--muted);font-size:0.9rem">No groups created yet</div>`;
    } else {
      const statusBadge = { active: 'badge-green', settled: 'badge-green', pending: 'badge-yellow', default: 'badge-purple' };
      const statusLabel = { active: "You're owed", settled: 'Settled', pending: 'Pending', default: '' };
      grpEl.innerHTML = groups.map(g => {
        const badge = g.balance < 0 ? 'badge-red' : (statusBadge[g.status] || statusBadge.default);
        const label = g.balance < 0 ? 'You owe'   : (statusLabel[g.status] || g.status);
        return `<div class="activity-item" onclick="navigate('group-detail')" style="cursor:pointer">
          <div class="activity-icon" style="background:rgba(124,106,245,.1)">${g.emoji}</div>
          <div class="activity-info">
            <div class="activity-title">${g.name}</div>
            <div class="activity-meta">${g.members} members • ₹${g.total.toLocaleString('en-IN')} total</div>
          </div>
          <span class="badge ${badge}">${label}</span>
        </div>`;
      }).join('');
    }
  }

  // ── Charts ──
  renderWeeklyChart();
  renderMonthlyChart();
}

document.addEventListener('DOMContentLoaded', () => {
  renderDashboard();
});
