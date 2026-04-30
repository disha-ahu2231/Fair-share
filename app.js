// ─── NAVIGATION ───
function navigate(page) {
  const protectedRoutes = ['dashboard', 'groups', 'group-detail', 'expenses', 'reports', 'settlement', 'profile'];
  if (protectedRoutes.includes(page) && !getCurrentUser()) {
    page = 'login';
  }

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  const target = document.getElementById('page-' + page);
  if (target) {
    target.classList.add('active');
    target.classList.add('fade-in');
    setTimeout(() => target.classList.remove('fade-in'), 400);
  } else {
    // Fallback to home for invalid pages
    const home = document.getElementById('page-home');
    if (home) home.classList.add('active');
  }
  const navEl = document.getElementById('nav-' + page);
  if (navEl) navEl.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Close mobile menu if open
  const mobileMenu = document.getElementById('mobile-menu');
  if (mobileMenu) mobileMenu.classList.remove('open');
  document.body.classList.remove('mobile-menu-open');

  // Render charts when their pages become active
  if (page === 'dashboard') renderWeeklyChart();
  if (page === 'reports') renderMonthlyChart();

  // Update profile display
  const user = getCurrentUser();
  if (user) updateProfileDisplay(user);
}

// ─── MODALS ───
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
function closeModalOnBackdrop(e, id) {
  if (e.target === document.getElementById(id)) closeModal(id);
}

// ─── AUTH TABS ───
function switchAuthTab(btn, formId) {
  document.querySelectorAll('.tab-auth').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('login-form').style.display = 'none';
  document.getElementById('signup-form').style.display = 'none';
  document.getElementById(formId).style.display = 'block';
}

// ─── SPLIT TABS ───
function activateSplitTab(btn) {
  document.querySelectorAll('.split-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
}

// ─── FAQ ───
function toggleFaq(item) { item.classList.toggle('open'); }

// ─── MOBILE MENU ───
function toggleMobileMenu() {
  const menu = document.getElementById('mobile-menu');
  menu.classList.toggle('open');
  document.body.classList.toggle('mobile-menu-open');
}

// ─── FILTER CHIPS ───
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', function () {
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      this.classList.add('active');
    });
  });
});

// ─── KEYBOARD SHORTCUTS ───
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-backdrop.open').forEach(m => m.classList.remove('open'));
    endTour();
    const mobileMenu = document.getElementById('mobile-menu');
    if (mobileMenu) mobileMenu.classList.remove('open');
    document.body.classList.remove('mobile-menu-open');
  }
});

// ─── INTERACTIVE SETTLEMENT BUTTONS ───
document.addEventListener('click', e => {
  if (e.target.textContent === 'Mark Paid' || e.target.textContent === 'Mark Received') {
    const item = e.target.closest('.settlement-item');
    if (item) {
      item.style.opacity = '0.4';
      e.target.textContent = '✓ Done';
      e.target.disabled = true;
      e.target.style.background = 'rgba(45,212,167,.12)';
      e.target.style.color = 'var(--green)';
    }
  }
  if (e.target.textContent === 'Pay Now') {
    e.target.textContent = 'Processing…';
    e.target.classList.add('loading');
    setTimeout(() => {
      const item = e.target.closest('.settlement-item');
      if (item) {
        item.style.opacity = '0.4';
        e.target.textContent = '✓ Paid';
        e.target.disabled = true;
        e.target.classList.remove('loading');
      }
    }, 900);
  }
});

// ─── THEME TOGGLE ───
(function(){
  const themeKey = 'theme-preference';
  const btn = document.getElementById('theme-toggle');
  function applyTheme(theme){
    if(theme === 'light') document.body.classList.add('light');
    else document.body.classList.remove('light');
    if(btn) btn.textContent = theme === 'light' ? '☀️' : '🌙';
  }
  const saved = localStorage.getItem(themeKey);
  if(saved) applyTheme(saved);
  else {
    const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    applyTheme(prefersLight ? 'light' : 'dark');
  }
  if(btn){
    btn.addEventListener('click', () => {
      const isLight = document.body.classList.toggle('light');
      const newTheme = isLight ? 'light' : 'dark';
      localStorage.setItem(themeKey, newTheme);
      btn.textContent = isLight ? '☀️' : '🌙';
    });
  }
})();

// ─── INITIALIZATION ───
window.addEventListener('DOMContentLoaded', () => {
  updateAuthUI();
  renderWeeklyChart();
  const user = getCurrentUser();
  if (user) {
    if (window.location.hash === '#login' || !window.location.hash) {
      navigate('dashboard');
    }
  } else {
    navigate('home');
  }
});

// Auto-start tour on load (only shows once thanks to localStorage check)
window.addEventListener('load', () => setTimeout(startTour, 250));





