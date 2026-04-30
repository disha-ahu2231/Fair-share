// ─── ONBOARDING TOUR (shows only once) ───
const TOUR_KEY = 'SplitShare_tour_completed';
const tourSteps = [
  { title: 'Welcome to FairShare! 🎉', desc: 'This short tour will point out the main areas you will use.', selector: '.nav-brand', placement: 'bottom' },
  { title: 'Your Dashboard', desc: 'Your financial command center: balances and quick stats.', selector: '#page-dashboard .page-title', placement: 'right', showPage: 'dashboard' },
  { title: 'Add Expense', desc: 'Tap here to quickly add a new expense anytime.', selector: "#btn-add-expense", placement: 'left', showPage: 'dashboard' },
  { title: 'Groups', desc: 'Manage groups for trips, roommates, and recurring bills.', selector: '#nav-groups', placement: 'bottom', showPage: 'groups' },
  { title: 'Settlements', desc: 'Clear dues quickly from the Settlements view.', selector: '#nav-settlement', placement: 'bottom', showPage: 'settlement' },
];
let tourStep = 0;

function startTour() {
  // Only show once
  if (localStorage.getItem(TOUR_KEY)) return;
  navigate('home');
  tourStep = 0;
  document.getElementById('onboarding').classList.add('active');
  document.body.classList.add('tour-open');
  updateTourCard();
}

function updateTourCard() {
  const step = tourSteps[tourStep];
  document.getElementById('tour-step-num').textContent = `Step ${tourStep + 1} of ${tourSteps.length}`;
  document.getElementById('tour-title').textContent = step.title;
  document.getElementById('tour-desc').textContent = step.desc;
  const prevBtn = document.getElementById('tour-prev-btn');
  const nextBtn = document.getElementById('tour-next-btn');
  if (prevBtn) prevBtn.disabled = tourStep === 0;
  if (nextBtn) nextBtn.textContent = tourStep === tourSteps.length - 1 ? 'Finish ✓' : 'Next →';
  const dots = document.getElementById('tour-dots');
  dots.innerHTML = tourSteps.map((_, i) => `<div class="tour-dot ${i === tourStep ? 'active' : ''}"></div>`).join('');
  const card = document.getElementById('tour-card');
  const spotlight = document.getElementById('tour-spotlight');
  card.classList.remove('placement-top','placement-bottom','placement-left','placement-right');

  if (step && step.showPage) {
    const active = document.querySelector('.page.active');
    const desiredId = 'page-' + step.showPage;
    if (active && active.id !== desiredId) {
      navigate(step.showPage);
      setTimeout(updateTourCard, 150);
      return;
    }
  }

  let target = null;
  try { if (step && step.selector) target = document.querySelector(step.selector); } catch(e) { target = null; }
  if (!target) {
    spotlight.style.cssText = 'width:0;height:0;left:50%;top:50%;transform:translate(-50%,-50%)';
    card.style.cssText = 'left:50%;top:50%;transform:translate(-50%,-50%)';
    return;
  }
  const rect = target.getBoundingClientRect();
  const pad = 10;
  spotlight.style.cssText = `left:${Math.max(8, rect.left - pad + window.scrollX)}px;top:${Math.max(8, rect.top - pad + window.scrollY)}px;width:${rect.width + pad * 2}px;height:${rect.height + pad * 2}px;border-radius:12px;transform:none`;

  const placement = step.placement || 'bottom';
  card.classList.add('placement-' + placement);
  const margin = 12;
  let cardLeft, cardTop;
  if (placement === 'bottom') { cardLeft = rect.left + window.scrollX + rect.width / 2 - 150; cardTop = rect.top + window.scrollY + rect.height + margin; }
  else if (placement === 'top') { cardLeft = rect.left + window.scrollX + rect.width / 2 - 150; cardTop = rect.top + window.scrollY - (card.offsetHeight || 140) - margin; }
  else if (placement === 'left') { cardLeft = rect.left + window.scrollX - 300 - margin; cardTop = rect.top + window.scrollY + rect.height / 2 - (card.offsetHeight || 80) / 2; }
  else { cardLeft = rect.left + window.scrollX + rect.width + margin; cardTop = rect.top + window.scrollY + rect.height / 2 - (card.offsetHeight || 80) / 2; }

  cardLeft = Math.max(8, Math.min(cardLeft, window.innerWidth + window.scrollX - 312));
  cardTop = Math.max(8 + window.scrollY, Math.min(cardTop, window.innerHeight + window.scrollY - 120));
  card.style.cssText = `left:${cardLeft}px;top:${cardTop}px;transform:none`;
}

function nextTourStep() {
  if (tourStep >= tourSteps.length - 1) { endTour(); return; }
  tourStep++;
  updateTourCard();
}

function prevTourStep() {
  if (tourStep <= 0) return;
  tourStep--;
  updateTourCard();
}

function endTour() {
  document.getElementById('onboarding').classList.remove('active');
  document.body.classList.remove('tour-open');
  localStorage.setItem(TOUR_KEY, 'true');
  tourStep = 0;
}





