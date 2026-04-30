// ─── CHART RENDERING WITH TOOLTIPS ───
function renderWeeklyChart() {
  const container = document.getElementById('weeklyChart');
  if (!container) return;
  const data = AppState.weeklyData;
  const max = Math.max(...data.map(d => d.v));
  container.innerHTML = data.map((d, i) => `
    <div class="bar-wrap" style="height:100%" role="img" aria-label="Week ${i+1}: ${d.label}">
      <div style="font-size:.72rem;color:var(--muted);font-family:'JetBrains Mono',monospace">${d.label}</div>
      <div style="flex:1;display:flex;align-items:flex-end;width:100%">
        <div class="chart-bar" data-tooltip="${d.label}" style="width:100%;height:${Math.round((d.v / max) * 100)}%;background:${i === 1 ? 'var(--accent2)' : 'var(--accent)'};border-radius:6px 6px 0 0;opacity:${i === 1 ? '1' : '0.65'};transition:height .5s ease ${i * 0.1}s"></div>
      </div>
    </div>
  `).join('');
}

function renderMonthlyChart() {
  const container = document.getElementById('monthlyChart');
  if (!container) return;
  const { months, values } = AppState.monthlyData;
  const max = Math.max(...values);
  container.innerHTML = values.map((v, i) => `
    <div class="bar-wrap" role="img" aria-label="${months[i]}: ₹${v.toLocaleString()}">
      <div style="font-size:.65rem;color:var(--muted);font-family:'JetBrains Mono',monospace">${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}</div>
      <div style="flex:1;display:flex;align-items:flex-end;width:100%">
        <div class="chart-bar" data-tooltip="₹${v.toLocaleString()}" style="width:100%;height:${Math.round((v / max) * 85) + 15}%;background:${i === 9 ? 'var(--accent2)' : 'var(--accent)'};border-radius:4px 4px 0 0;opacity:${i === 9 ? '1' : '0.55'};transition:height .5s ease ${i * 0.05}s"></div>
      </div>
      <div style="font-size:.65rem;color:var(--muted)">${months[i]}</div>
    </div>
  `).join('');
}





