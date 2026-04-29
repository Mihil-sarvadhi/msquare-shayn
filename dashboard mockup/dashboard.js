/* SHAYN MIS — Dashboard render orchestrator */
(function () {
  const D = window.SHAYN;
  const C = window.SHAYN_CHARTS;
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];

  // ───── KPI strip ─────
  function renderKPIs() {
    const grid = $('#kpiGrid');
    grid.innerHTML = '';
    D.KPIS.forEach((k) => {
      const card = document.createElement('div');
      card.className = 'kpi';
      const dirGood = k.k === 'bounce' ? (k.delta < 0) : (k.delta > 0);
      const dCls = k.delta === 0 ? 'flat' : (dirGood ? 'up' : 'down');
      const dArr = k.delta === 0 ? '–' : (k.delta > 0 ? '↑' : '↓');
      card.innerHTML = `
        <div class="kpi-h">
          <span class="kpi-label">${k.label}</span>
          <span class="kpi-icon">${kpiIcon(k.k)}</span>
        </div>
        <div class="kpi-val">${k.value}</div>
        <div class="kpi-meta">
          <span class="delta ${dCls}">${dArr} ${Math.abs(k.delta).toFixed(1)}%</span>
          <span class="kpi-sub">${k.sub}</span>
        </div>
        <svg class="kpi-spark"></svg>
      `;
      grid.appendChild(card);
      const color = dCls === 'up' ? 'var(--green)' : (dCls === 'down' ? 'var(--red)' : 'var(--muted)');
      const fill = dCls === 'up' ? 'rgba(22,163,74,0.10)' : (dCls === 'down' ? 'rgba(220,38,38,0.10)' : 'rgba(15,15,18,0.05)');
      C.sparkline(card.querySelector('.kpi-spark'), k.spark, { stroke: color, fill });
    });
  }
  function kpiIcon(k) {
    const ICONS = {
      revenue: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/></svg>',
      aov:     '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
      sess:    '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/></svg>',
      active:  '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2M16 3.1a4 4 0 0 1 0 7.7M21 21v-2a4 4 0 0 0-3-3.9"/></svg>',
      new:     '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="8" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h6"/><path d="M19 14v6M22 17h-6"/></svg>',
      bounce:  '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12l3-3 3 3 3-3 3 3 3-3 3 3"/><path d="M3 19l3-3 3 3 3-3 3 3 3-3 3 3"/></svg>',
    };
    return ICONS[k] || '';
  }

  // ───── Live users ─────
  function renderLiveUsers() {
    // pulse radar is rendered inline in Dashboard.html; nothing to do here
    const bars = $('#minutebars');
    if (!bars) return;
    bars.innerHTML = '';
    const seed = [2,3,2,4,3,5,4,3,2,3,4,5,4,3,2,4,3,5,6,4,3,4,5,4,3,2,3,4,5,4];
    seed.forEach((v, i) => {
      const b = document.createElement('div');
      b.className = 'bar' + (i === seed.length - 1 ? ' now' : '');
      b.style.height = (v * 8) + 'px';
      bars.appendChild(b);
    });
    const list = $('#liveCountries');
    if (!list) return;
    list.innerHTML = `<div class="head"><span>Country</span><span>Active</span></div>`;
    D.COUNTRIES_LIVE.forEach((c) => {
      const r = document.createElement('div');
      r.className = 'country-row';
      r.innerHTML = `<span><span class="flag">${flag(c.code)}</span>${c.name}</span><span class="num">${c.n}</span>`;
      list.appendChild(r);
    });
  }

  function flag(code) {
    return code.split('').map(c => String.fromCodePoint(127397 + c.charCodeAt(0))).join('');
  }

  // ───── Recent orders ─────
  function renderOrders() {
    const list = $('#orderList');
    list.innerHTML = '';
    D.ORDERS.slice(0, 6).forEach((o) => {
      const r = document.createElement('div');
      r.className = 'order-row';
      const tagsHtml = o.tags.map(t => `<span class="tag ${t}">${{paid:'Paid',partial:'Partially Paid',fulfilled:'Fulfilled',unfulfilled:'Unfulfilled'}[t]}</span>`).join('');
      r.innerHTML = `
        <div>
          <div class="order-id">${o.id}</div>
          <div class="order-loc">${o.loc}</div>
          <div class="order-tags">${tagsHtml}</div>
        </div>
        <div class="order-amt">
          <div class="v">₹${D.fmtN(o.amt.toFixed(2))}</div>
          <div class="t">${o.t}</div>
        </div>
      `;
      list.appendChild(r);
    });
  }

  // ───── Revenue by Channel (bar chart) ─────
  function renderRevenueByChannel() {
    const svg = $('#revChart');
    svg.innerHTML = '';
    const data = D.SERIES.revenue.map((v, i) => ({ v, l: dayLabel(D.DATES[i]) }));
    C.barChart(svg, data, { width: 800, height: 220 });

    // tooltip
    const tt = $('#revTooltip');
    svg.querySelectorAll('.bar').forEach((b) => {
      b.addEventListener('mouseenter', (e) => {
        const v = +b.getAttribute('data-v'), l = b.getAttribute('data-l');
        tt.innerHTML = `<div class="k">${l}</div><div>${D.fmtINR(v)}</div>`;
        tt.classList.add('show');
        const rect = svg.getBoundingClientRect();
        const wrap = svg.parentElement.getBoundingClientRect();
        const br = b.getBoundingClientRect();
        tt.style.left = (br.left - wrap.left + br.width / 2) + 'px';
        tt.style.top = (br.top - wrap.top) + 'px';
      });
      b.addEventListener('mouseleave', () => tt.classList.remove('show'));
    });
  }
  function dayLabel(d) {
    const m = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return d.getDate() + ' ' + m[d.getMonth()];
  }

  // ───── COD vs Prepaid donut ─────
  function renderCodPrepaid() {
    const svg = $('#codDonut');
    svg.innerHTML = '';
    C.donutChart(svg, [
      { v: 14.5, color: 'var(--c5)' },
      { v: 85.5, color: 'var(--c2)' },
    ], { size: 180, thickness: 28 });
  }

  // ───── Revenue vs Spend ─────
  function renderRevSpend() {
    const svg = $('#revSpend');
    svg.innerHTML = '';
    const xLabels = [
      { i: 0, l: '03-27' }, { i: 6, l: '04-02' }, { i: 12, l: '04-08' },
      { i: 18, l: '04-14' }, { i: 24, l: '04-20' }, { i: 29, l: '04-25' },
    ];
    C.lineChart(svg, [
      { data: D.SERIES.revenue, color: 'var(--c1)', fill: 'var(--c1)' },
      { data: D.SERIES.spend,   color: 'var(--c3)', dashed: true },
    ], { width: 1100, height: 240, padR: 60, padL: 50, dualAxis: true,
         yFormat: D.fmtINR, yFormatRight: D.fmtINR, xLabels });
  }

  // ───── Traffic trend ─────
  function renderTraffic() {
    const svg = $('#trafficChart');
    svg.innerHTML = '';
    const xLabels = [
      { i: 0, l: '27 Mar' }, { i: 5, l: '1 Apr' }, { i: 10, l: '6 Apr' },
      { i: 15, l: '11 Apr' }, { i: 20, l: '16 Apr' }, { i: 25, l: '21 Apr' }, { i: 29, l: '25 Apr' },
    ];
    C.lineChart(svg, [
      { data: D.SERIES.sessions, color: 'var(--c1)', fill: 'var(--c1)' },
      { data: D.SERIES.users,    color: 'var(--c4)' },
      { data: D.SERIES.newUsers, color: 'var(--c3)', dashed: true },
    ], { width: 600, height: 220, padL: 50, yFormat: (v) => v >= 1000 ? (v/1000).toFixed(1) + 'K' : Math.round(v), xLabels });
  }

  // ───── Ecommerce trend ─────
  function renderEcommerce() {
    const svg = $('#ecChart');
    svg.innerHTML = '';
    const xLabels = [
      { i: 0, l: '27 Mar' }, { i: 5, l: '1 Apr' }, { i: 10, l: '6 Apr' },
      { i: 15, l: '11 Apr' }, { i: 20, l: '16 Apr' }, { i: 25, l: '21 Apr' }, { i: 29, l: '25 Apr' },
    ];
    C.lineChart(svg, [
      { data: D.SERIES.ecRev, color: 'var(--c1)', fill: 'var(--c1)' },
      { data: D.SERIES.ecTx,  color: 'var(--c2)', dashed: true, right: true },
    ], { width: 600, height: 220, padL: 50, padR: 50, dualAxis: true,
         yFormat: D.fmtINR, yFormatRight: (v) => Math.round(v), xLabels });
  }

  // ───── Conversion funnel ─────
  function renderFunnel() {
    const sess = 58420, chk = 880, pur = 138;
    $('#funnelArea').innerHTML = `
      <div class="funnel-row">
        <div class="funnel-h"><span class="label">Sessions</span><span><span class="v">${D.fmtN(sess)}</span></span></div>
        <div class="bar-track"><div class="bar-fill t1" style="width:100%"></div></div>
      </div>
      <div class="funnel-row">
        <div class="funnel-h"><span class="label">Checkouts</span><span><span class="v">${D.fmtN(chk)}</span><span class="pct">(${(chk/sess*100).toFixed(2)}%)</span></span></div>
        <div class="bar-track"><div class="bar-fill t2" style="width:${(chk/sess*100*40).toFixed(1)}%"></div></div>
      </div>
      <div class="funnel-row">
        <div class="funnel-h"><span class="label">Purchases</span><span><span class="v">${D.fmtN(pur)}</span><span class="pct">(${(pur/sess*100).toFixed(2)}%)</span></span></div>
        <div class="bar-track"><div class="bar-fill t3" style="width:${(pur/sess*100*100).toFixed(1)}%"></div></div>
      </div>
    `;
    $('#funnelFoot').innerHTML = `
      <div><div class="v" style="color:var(--accent)">${(chk/sess*100).toFixed(2)}%</div><div class="k">Sess → Checkout</div></div>
      <div><div class="v" style="color:var(--blue)">${(pur/chk*100).toFixed(2)}%</div><div class="k">Check → Purchase</div></div>
      <div><div class="v" style="color:var(--green)">${(pur/sess*100).toFixed(3)}%</div><div class="k">Overall conv</div></div>
    `;
  }

  // ───── Acquisition donut + table ─────
  function renderAcquisition() {
    const svg = $('#acqDonut');
    svg.innerHTML = '';
    // map all channels onto our 5-color palette in order
    const PAL = ['var(--c1)','var(--c2)','var(--c3)','var(--c4)','var(--c5)','var(--muted-2)','var(--ink-3)'];
    const channelsWithColor = D.CHANNELS.map((c, i) => ({ ...c, color: PAL[i % PAL.length] }));
    C.donutChart(svg, channelsWithColor.map(c => ({ v: c.sessions, color: c.color })), { size: 160, thickness: 22 });
    const list = $('#acqLegend');
    list.innerHTML = '';
    channelsWithColor.forEach((c) => {
      const r = document.createElement('div');
      r.className = 'donut-row';
      r.innerHTML = `<span class="sw" style="background:${c.color}"></span>
        <span class="nm">${c.name}</span>
        <span class="vl">${D.fmtN(c.sessions)}</span>
        <span class="pc">${(c.conv).toFixed(1)}%</span>`;
      list.appendChild(r);
    });
  }

  // ───── World map + country list ─────
  function renderMap() {
    const svg = $('#worldMap');
    svg.innerHTML = '';
    C.regionMap(svg, { IN: 4, CN: 4, NA: 3, SE: 2, EU: 2, ME: 1, AU: 1, SA: 1, AF: 1 });

    const list = $('#mapList');
    list.innerHTML = `<div class="head"><span>Country</span><span>Active users</span></div>`;
    const max = D.COUNTRIES_ACTIVE[0].n;
    D.COUNTRIES_ACTIVE.forEach((c) => {
      const r = document.createElement('div');
      r.className = 'row';
      const w = (c.n / max) * 100;
      r.innerHTML = `<span class="nm" style="--w:${w}%"><span class="flag">${flag(c.code)}</span>${c.name}<span class="bar-mini" style="display:inline-block;height:4px;width:${w * 0.9}px;background:rgba(37,99,235,0.25);border-radius:2px;margin-left:8px"></span></span><span class="v">${D.fmtN(c.n)}</span>`;
      list.appendChild(r);
    });
  }

  // ───── Campaign table ─────
  function renderCampaigns() {
    const tb = $('#campaignBody');
    tb.innerHTML = '';
    D.CAMPAIGNS.forEach((c) => {
      const tr = document.createElement('tr');
      const roasCls = c.roas >= 2 ? 'ok' : (c.roas >= 1 ? 'warn' : 'err');
      const stCls = { Hold: 'hold', Cut: 'err', Scale: 'ok' }[c.status];
      tr.innerHTML = `
        <td><strong style="color:var(--ink);font-weight:500">${c.nm}</strong></td>
        <td class="num">${D.fmtINR(c.spend)}</td>
        <td class="num">${D.fmtINR(c.rev)}</td>
        <td class="num"><span class="bounce-cell ${roasCls}">${c.roas.toFixed(2)}×</span></td>
        <td class="num">${c.ctr.toFixed(2)}%</td>
        <td class="num">₹${c.cpm}</td>
        <td class="num">${c.freq.toFixed(1)}</td>
        <td><span class="badge ${stCls}">${c.status}</span></td>
      `;
      tb.appendChild(tr);
    });
  }

  // ───── Pages table ─────
  function renderPages() {
    const tb = $('#pagesBody');
    tb.innerHTML = '';
    D.PAGES.forEach((p) => {
      const tr = document.createElement('tr');
      const bCls = p.bounce <= 10 ? 'low' : (p.bounce <= 30 ? 'mid' : 'high');
      tr.innerHTML = `
        <td><div style="max-width:280px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--ink);font-weight:500" title="${p.nm}">${p.nm}</div></td>
        <td class="num">${D.fmtN(p.views)}</td>
        <td class="num">${D.fmtN(p.users)}</td>
        <td class="num">${p.vu.toFixed(2)}</td>
        <td class="num">${p.time}</td>
        <td class="num">${D.fmtN(p.events)}</td>
        <td class="num"><span class="bounce-cell ${bCls}">${p.bounce.toFixed(1)}%</span></td>
      `;
      tb.appendChild(tr);
    });
  }

  // ───── Top products / rated / reviews ─────
  function renderProducts() {
    const list = $('#topProducts');
    list.innerHTML = '';
    D.PRODUCTS.forEach((p, i) => {
      const r = document.createElement('div');
      r.className = 'product-row' + (i === 0 ? ' top' : '');
      r.innerHTML = `<span class="rank">#${p.rank}</span>
        <span class="nm">${p.nm}</span>
        <span class="units">${p.units} units</span>
        <span class="rev">${D.fmtINR(p.rev)}</span>`;
      list.appendChild(r);
    });

    const list2 = $('#topRated');
    list2.innerHTML = '';
    D.RATED.forEach((p) => {
      const r = document.createElement('div');
      r.className = 'product-row';
      r.innerHTML = `<span class="rank">#${p.rank}</span>
        <span class="nm">${p.nm}<div style="font-size:11px;color:var(--muted);margin-top:2px">${p.reviews} review${p.reviews>1?'s':''}</div></span>
        <span></span>
        <span class="stars">${stars(p.rating)}</span>`;
      list2.appendChild(r);
    });

    // review summary
    const total = Object.values(D.REVIEWS_DIST).reduce((s, v) => s + v, 0);
    const max = Math.max(...Object.values(D.REVIEWS_DIST));
    const bars = $('#revBars');
    bars.innerHTML = '';
    [5, 4, 3, 2, 1].forEach((s) => {
      const c = D.REVIEWS_DIST[s];
      const w = max ? (c / max) * 100 : 0;
      const r = document.createElement('div');
      r.className = 'rev-bar-row';
      r.innerHTML = `<span class="lbl">${s}★</span><div class="track"><div class="fill" style="width:${w}%"></div></div><span class="ct">${c}</span>`;
      bars.appendChild(r);
    });
  }
  function stars(n) {
    const full = Math.floor(n), half = n - full >= 0.5;
    let out = '';
    for (let i = 0; i < 5; i++) {
      if (i < full) out += '★';
      else if (i === full && half) out += '★';
      else out += '<span class="empty">★</span>';
    }
    return out;
  }

  // ───── Sortable tables ─────
  function makeSortable(table) {
    const headers = table.querySelectorAll('th');
    headers.forEach((th, ci) => {
      if (!th.classList.contains('sortable')) return;
      th.addEventListener('click', () => {
        const dir = th.classList.contains('sort-asc') ? 'desc' : 'asc';
        headers.forEach(h => h.classList.remove('sort-asc', 'sort-desc'));
        th.classList.add('sort-' + dir);
        const tbody = table.querySelector('tbody');
        const rows = [...tbody.querySelectorAll('tr')];
        rows.sort((a, b) => {
          const av = parseFloat(a.children[ci].innerText.replace(/[^\d.-]/g, '')) || 0;
          const bv = parseFloat(b.children[ci].innerText.replace(/[^\d.-]/g, '')) || 0;
          if (Number.isNaN(av) || (av === 0 && bv === 0)) {
            const ax = a.children[ci].innerText, bx = b.children[ci].innerText;
            return dir === 'asc' ? ax.localeCompare(bx) : bx.localeCompare(ax);
          }
          return dir === 'asc' ? av - bv : bv - av;
        });
        rows.forEach(r => tbody.appendChild(r));
      });
    });
  }

  // ───── Insight rotator ─────
  const INSIGHTS = [
    { tag: 'Anomaly', body: 'New users dropped <b>−3.4%</b> while sessions rose <b>+6.8%</b>. Likely a returning-user surge from the <b>S18 campaign</b> — consider doubling its budget.' },
    { tag: 'Opportunity', body: '<b>S18 Color Silver</b> ROAS climbed to <b>2.43×</b> on a small spend. Worth scaling — projected incremental revenue <b>₹84K</b> at current frequency.' },
    { tag: 'Risk', body: '<b>S06 Image Travel</b> spent <b>₹9K</b> with zero conversions across 7 days. Recommend pausing and reallocating to <b>Remarketing S11</b>.' },
    { tag: 'Logistics', body: '<b>9 RTO orders</b> this period (5.7%) — above your 4% threshold. Top reason: <b>"customer unavailable"</b> in Tier-2 cities.' },
  ];
  let insightIdx = 0;
  function renderInsight() {
    const body = $('#insightBody'); if (!body) return;
    const ins = INSIGHTS[insightIdx];
    body.innerHTML = ins.body;
    $('#insightTag').textContent = ins.tag;
    $('#insightCount').textContent = `${insightIdx + 1} of ${INSIGHTS.length}`;
  }

  // ───── Tabs ─────
  function bindTabs() {
    $$('.tabs').forEach(g => {
      g.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        g.querySelectorAll('button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  }

  // ───── Date range mock ─────
  function bindDateRange() {
    const btn = $('#daterange');
    const opts = ['Last 7 days', 'Last 30 days', 'Last 90 days', 'Quarter to date', 'Year to date', 'Custom…'];
    btn.addEventListener('click', () => {
      const idx = opts.findIndex(o => btn.querySelector('.label').textContent.includes(o));
      const next = (idx + 1) % opts.length;
      btn.querySelector('.label').textContent = opts[next];
    });
  }

  // ───── Cmd+K palette ─────
  const CMDK_ITEMS = [
    { ic: '⌘', sec: 'Pages', label: 'Go to Marketing', hint: 'G then M' },
    { ic: '⌘', sec: 'Pages', label: 'Go to Customers', hint: 'G then C' },
    { ic: '⌘', sec: 'Pages', label: 'Go to Operations', hint: 'G then O' },
    { ic: '⌘', sec: 'Pages', label: 'Go to Reviews', hint: 'G then R' },
    { ic: '↓', sec: 'Quick actions', label: 'Export dashboard as PDF', hint: '⌘E' },
    { ic: '✉', sec: 'Quick actions', label: 'Schedule weekly digest', hint: '' },
    { ic: '↻', sec: 'Quick actions', label: 'Force resync Shopify + Meta', hint: '' },
    { ic: '☰', sec: 'Search', label: 'Find order #SYN/26-27/…', hint: '' },
    { ic: '☰', sec: 'Search', label: 'Find customer by email or phone', hint: '' },
    { ic: '☆', sec: 'Insights', label: 'Open AI insights feed', hint: '' },
  ];
  let cmdkActive = 0;
  function renderCmdkList(filter = '') {
    const list = $('#cmdkList');
    list.innerHTML = '';
    const q = filter.toLowerCase();
    const filtered = CMDK_ITEMS.filter(i => !q || i.label.toLowerCase().includes(q));
    let lastSec = '';
    filtered.forEach((it, i) => {
      if (it.sec !== lastSec) {
        const s = document.createElement('div');
        s.className = 'cmdk-section';
        s.textContent = it.sec;
        list.appendChild(s);
        lastSec = it.sec;
      }
      const r = document.createElement('div');
      r.className = 'cmdk-item' + (i === cmdkActive ? ' active' : '');
      r.innerHTML = `<span class="ic">${it.ic}</span><span>${it.label}</span><span class="hint">${it.hint}</span>`;
      r.addEventListener('click', () => closeCmdk());
      list.appendChild(r);
    });
  }
  function openCmdk() { $('#cmdkOverlay').classList.add('show'); $('#cmdkInput').value = ''; $('#cmdkInput').focus(); cmdkActive = 0; renderCmdkList(); }
  function closeCmdk() { $('#cmdkOverlay').classList.remove('show'); }
  function bindCmdk() {
    $('#searchBtn').addEventListener('click', openCmdk);
    $('#cmdkOverlay').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeCmdk(); });
    $('#cmdkInput').addEventListener('input', (e) => { cmdkActive = 0; renderCmdkList(e.target.value); });
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); openCmdk(); }
      if (e.key === 'Escape') closeCmdk();
    });
  }

  // ───── Theme toggle ─────
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem('shayn-theme', t); } catch(_) {}
    const sun = $('#iconSun'), moon = $('#iconMoon');
    if (sun && moon) {
      sun.style.display = t === 'dark' ? 'block' : 'none';
      moon.style.display = t === 'dark' ? 'none' : 'block';
    }
  }
  function bindTheme() {
    const saved = (() => { try { return localStorage.getItem('shayn-theme'); } catch(_) { return null; } })();
    applyTheme(saved || 'light');
    $('#themeBtn').addEventListener('click', () => {
      const cur = document.documentElement.getAttribute('data-theme') || 'light';
      applyTheme(cur === 'light' ? 'dark' : 'light');
    });
  }

  // ───── Density toggle ─────
  function bindDensity() {
    const saved = (() => { try { return localStorage.getItem('shayn-density'); } catch(_) { return null; } })();
    if (saved) document.documentElement.setAttribute('data-density', saved);
  }

  // ───── Init ─────
  function init() {
    renderKPIs();
    renderLiveUsers();
    renderOrders();
    renderRevenueByChannel();
    renderCodPrepaid();
    renderRevSpend();
    renderTraffic();
    renderEcommerce();
    renderFunnel();
    renderAcquisition();
    renderMap();
    renderCampaigns();
    renderPages();
    renderProducts();
    renderInsight();
    bindTabs();
    bindDateRange();
    bindCmdk();
    bindTheme();
    bindDensity();
    makeSortable($('#campaignTable'));
    makeSortable($('#pagesTable'));

    const ip = $('#insightPrev'); if (ip) ip.addEventListener('click', () => { insightIdx = (insightIdx - 1 + INSIGHTS.length) % INSIGHTS.length; renderInsight(); });
    const inx = $('#insightNext'); if (inx) inx.addEventListener('click', () => { insightIdx = (insightIdx + 1) % INSIGHTS.length; renderInsight(); });

    // re-render charts on theme change to pick up new colors
    new MutationObserver(() => {
      renderRevenueByChannel(); renderCodPrepaid(); renderRevSpend();
      renderTraffic(); renderEcommerce(); renderAcquisition(); renderMap();
      renderKPIs();
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-density'] });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
