/* SHAYN MIS — chart renderers (vanilla SVG, no dependencies)
   Unified 5-color palette: --c1 gold · --c2 teal · --c3 blue · --c4 green · --c5 amber
   Reads colors via getComputedStyle so they follow theme/tweaks live. */

const ns = 'http://www.w3.org/2000/svg';
const el = (tag, attrs = {}) => {
  const e = document.createElementNS(ns, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  return e;
};

// Resolve a CSS variable like 'var(--c2)' or '--c2' or '#aaa' to a hex/rgb string
function cssColor(input) {
  if (!input) return '#000';
  let token = input;
  const m = /var\((--[\w-]+)\)/.exec(input);
  if (m) token = m[1];
  if (token.startsWith('--')) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
    return v || input;
  }
  return input;
}

// Hex → rgba
function withAlpha(color, a) {
  const c = cssColor(color);
  if (c.startsWith('#')) {
    const hex = c.slice(1);
    const f = (h) => parseInt(h.length === 1 ? h + h : h, 16);
    const r = f(hex.length === 3 ? hex[0] : hex.slice(0, 2));
    const g = f(hex.length === 3 ? hex[1] : hex.slice(2, 4));
    const b = f(hex.length === 3 ? hex[2] : hex.slice(4, 6));
    return `rgba(${r},${g},${b},${a})`;
  }
  if (c.startsWith('rgb')) {
    return c.replace(/rgba?\(([^)]+)\)/, (_, parts) => {
      const p = parts.split(',').map(s => s.trim());
      return `rgba(${p[0]},${p[1]},${p[2]},${a})`;
    });
  }
  return c;
}

// Generate a unique id for SVG defs
let _gid = 0;
const uid = (p) => `${p}-${++_gid}`;

// ── Sparkline (mini line, used in KPI cards)
function sparkline(svg, data, opts = {}) {
  const { stroke = 'var(--accent)', fill = 'rgba(184,137,62,0.10)', width = 200, height = 36 } = opts;
  svg.innerHTML = '';
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('preserveAspectRatio', 'none');
  const max = Math.max(...data), min = Math.min(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);
  const pts = data.map((v, i) => [i * step, height - 2 - ((v - min) / range) * (height - 8)]);
  const d = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');

  // gradient fill
  const gid = uid('sg');
  const defs = el('defs');
  const grad = el('linearGradient', { id: gid, x1: 0, y1: 0, x2: 0, y2: 1 });
  grad.appendChild(el('stop', { offset: '0%', 'stop-color': cssColor(stroke), 'stop-opacity': 0.32 }));
  grad.appendChild(el('stop', { offset: '100%', 'stop-color': cssColor(stroke), 'stop-opacity': 0 }));
  defs.appendChild(grad);
  svg.appendChild(defs);

  svg.appendChild(el('path', { d: d + ` L ${width} ${height} L 0 ${height} Z`, fill: `url(#${gid})` }));
  svg.appendChild(el('path', {
    d, fill: 'none', stroke: cssColor(stroke), 'stroke-width': '1.6',
    'stroke-linejoin': 'round', 'stroke-linecap': 'round', 'vector-effect': 'non-scaling-stroke'
  }));
  const last = pts[pts.length - 1];
  svg.appendChild(el('circle', { cx: last[0], cy: last[1], r: 2.2, fill: cssColor(stroke) }));
  svg.appendChild(el('circle', { cx: last[0], cy: last[1], r: 4.5, fill: cssColor(stroke), opacity: 0.18 }));
}

// ── Bar chart (with gradient fill + dotted gridlines)
function barChart(svg, data, opts = {}) {
  const { width = 800, height = 220, padL = 44, padR = 8, padT = 16, padB = 28, color = 'var(--c1)' } = opts;
  svg.innerHTML = '';
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  const innerW = width - padL - padR, innerH = height - padT - padB;
  const max = Math.max(...data.map(d => d.v));
  const niceMax = Math.ceil(max / 10000) * 10000 || max * 1.1;
  const bw = innerW / data.length;
  const barW = bw * 0.58;
  const c = cssColor(color);

  // gradient fill for bars
  const gid = uid('bg');
  const defs = el('defs');
  const grad = el('linearGradient', { id: gid, x1: 0, y1: 0, x2: 0, y2: 1 });
  grad.appendChild(el('stop', { offset: '0%', 'stop-color': c, 'stop-opacity': 1 }));
  grad.appendChild(el('stop', { offset: '100%', 'stop-color': c, 'stop-opacity': 0.55 }));
  defs.appendChild(grad);
  svg.appendChild(defs);

  // dotted gridlines + y labels
  const ticks = 4;
  for (let i = 0; i <= ticks; i++) {
    const y = padT + (innerH / ticks) * i;
    const v = niceMax * (1 - i / ticks);
    svg.appendChild(el('line', { x1: padL, x2: width - padR, y1: y, y2: y, class: 'gridline' }));
    const t = el('text', { x: padL - 8, y: y + 3, 'text-anchor': 'end', 'font-size': '10', fill: 'var(--muted-2)', 'font-family': 'Geist Mono, monospace' });
    t.textContent = window.SHAYN.fmtINR(v);
    svg.appendChild(t);
  }

  // baseline
  svg.appendChild(el('line', { x1: padL, x2: width - padR, y1: padT + innerH, y2: padT + innerH, stroke: 'var(--line-2)', 'stroke-width': 1 }));

  data.forEach((d, i) => {
    const h = (d.v / niceMax) * innerH;
    const x = padL + bw * i + (bw - barW) / 2;
    const y = padT + innerH - h;
    const r = el('rect', {
      x, y, width: barW, height: h,
      rx: 3, ry: 3,
      fill: `url(#${gid})`, class: 'bar',
      'data-v': d.v, 'data-l': d.l
    });
    svg.appendChild(r);
  });

  const labelEvery = Math.ceil(data.length / 8);
  data.forEach((d, i) => {
    if (i % labelEvery !== 0 && i !== data.length - 1) return;
    const x = padL + bw * i + bw / 2;
    const t = el('text', { x, y: height - 8, 'text-anchor': 'middle', 'font-size': '10', fill: 'var(--muted-2)', 'font-family': 'Geist Mono, monospace' });
    t.textContent = d.l;
    svg.appendChild(t);
  });
}

// ── Line chart (smooth, with gradient area + last-point dots)
function lineChart(svg, series, opts = {}) {
  const {
    width = 800, height = 240,
    padL = 44, padR = 44, padT = 18, padB = 30,
    yFormat = (v) => v, yFormatRight, dualAxis = false
  } = opts;
  svg.innerHTML = '';
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  const innerW = width - padL - padR, innerH = height - padT - padB;

  const leftSeries = series.filter(s => !s.right);
  const rightSeries = series.filter(s => s.right);
  const leftMax = Math.max(...leftSeries.flatMap(s => s.data)) * 1.1;
  const rightMax = rightSeries.length ? Math.max(...rightSeries.flatMap(s => s.data)) * 1.1 : 1;

  const N = series[0].data.length;
  const xAt = (i) => padL + (innerW / (N - 1)) * i;
  const yAt = (v, max) => padT + innerH - (v / max) * innerH;

  // dotted gridlines
  const ticks = 4;
  const cleanFP = (v, max) => Math.abs(v) < max * 1e-6 ? 0 : v;
  for (let i = 0; i <= ticks; i++) {
    const y = padT + (innerH / ticks) * i;
    const vL = cleanFP(leftMax * (1 - i / ticks), leftMax);
    svg.appendChild(el('line', { x1: padL, x2: width - padR, y1: y, y2: y, class: 'gridline' }));
    const t = el('text', { x: padL - 8, y: y + 3, 'text-anchor': 'end', 'font-size': '10', fill: 'var(--muted-2)', 'font-family': 'Geist Mono, monospace' });
    t.textContent = yFormat(vL);
    svg.appendChild(t);
    if (dualAxis) {
      const vR = cleanFP(rightMax * (1 - i / ticks), rightMax);
      const t2 = el('text', { x: width - padR + 8, y: y + 3, 'text-anchor': 'start', 'font-size': '10', fill: 'var(--muted-2)', 'font-family': 'Geist Mono, monospace' });
      t2.textContent = yFormatRight ? yFormatRight(vR) : Math.round(vR);
      svg.appendChild(t2);
    }
  }

  // baseline
  svg.appendChild(el('line', { x1: padL, x2: width - padR, y1: padT + innerH, y2: padT + innerH, stroke: 'var(--line-2)', 'stroke-width': 1 }));

  const smoothPath = (data, max) => {
    let d = '';
    for (let i = 0; i < data.length; i++) {
      const x = xAt(i), y = yAt(data[i], max);
      if (i === 0) { d += `M ${x.toFixed(1)} ${y.toFixed(1)}`; continue; }
      const px = xAt(i - 1), py = yAt(data[i - 1], max);
      const cx1 = px + (x - px) * 0.4, cy1 = py;
      const cx2 = x - (x - px) * 0.4, cy2 = y;
      d += ` C ${cx1.toFixed(1)} ${cy1.toFixed(1)} ${cx2.toFixed(1)} ${cy2.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    return d;
  };

  // Defs for gradient fills, one per series that has fill
  const defs = el('defs');
  svg.appendChild(defs);

  series.forEach((s) => {
    const max = s.right ? rightMax : leftMax;
    const d = smoothPath(s.data, max);
    const stroke = cssColor(s.color);

    if (s.fill) {
      const gid = uid('lg');
      const grad = el('linearGradient', { id: gid, x1: 0, y1: 0, x2: 0, y2: 1 });
      grad.appendChild(el('stop', { offset: '0%', 'stop-color': cssColor(s.fill), 'stop-opacity': 0.32 }));
      grad.appendChild(el('stop', { offset: '100%', 'stop-color': cssColor(s.fill), 'stop-opacity': 0 }));
      defs.appendChild(grad);
      svg.appendChild(el('path', {
        d: d + ` L ${xAt(N - 1)} ${padT + innerH} L ${xAt(0)} ${padT + innerH} Z`,
        fill: `url(#${gid})`
      }));
    }

    svg.appendChild(el('path', {
      d, fill: 'none', stroke,
      'stroke-width': '1.9',
      'stroke-dasharray': s.dashed ? '4 3' : '',
      'stroke-linejoin': 'round',
      'stroke-linecap': 'round'
    }));

    // last-point dot for each series (indicator of "now")
    const lastIdx = s.data.length - 1;
    const lx = xAt(lastIdx), ly = yAt(s.data[lastIdx], max);
    svg.appendChild(el('circle', { cx: lx, cy: ly, r: 4.5, fill: stroke, opacity: 0.18 }));
    svg.appendChild(el('circle', { cx: lx, cy: ly, r: 2.4, fill: stroke }));
  });

  (opts.xLabels || []).forEach((lbl) => {
    const x = xAt(lbl.i);
    const t = el('text', { x, y: height - 8, 'text-anchor': 'middle', 'font-size': '10', fill: 'var(--muted-2)', 'font-family': 'Geist Mono, monospace' });
    t.textContent = lbl.l;
    svg.appendChild(t);
  });
}

// ── Donut chart (rounded caps, subtle inner glow ring)
function donutChart(svg, data, opts = {}) {
  const { size = 160, thickness = 22, gap = 2 } = opts;
  svg.innerHTML = '';
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  const cx = size / 2, cy = size / 2;
  const r = (size - thickness) / 2;
  const circumference = 2 * Math.PI * r;
  const total = data.reduce((s, d) => s + d.v, 0);

  // track
  svg.appendChild(el('circle', {
    cx, cy, r, fill: 'none',
    stroke: 'var(--bg-2)', 'stroke-width': thickness
  }));

  let offset = 0;
  data.forEach((d) => {
    const len = (d.v / total) * circumference;
    const c = el('circle', {
      cx, cy, r,
      fill: 'none',
      stroke: cssColor(d.color),
      'stroke-width': thickness,
      'stroke-dasharray': `${Math.max(0, len - gap)} ${circumference - Math.max(0, len - gap)}`,
      'stroke-dashoffset': -offset,
      transform: `rotate(-90 ${cx} ${cy})`,
      'stroke-linecap': 'butt',
    });
    svg.appendChild(c);
    offset += len;
  });
}

// ── Stylized region map (executive-friendly, no real shapefile needed)
function regionMap(svg, levels) {
  svg.innerHTML = '';
  svg.setAttribute('viewBox', '0 0 600 320');
  const REGIONS = [
    ['NA', 'North America',     30,  60, 130,  90],
    ['SA', 'South America',     90, 170,  70, 110],
    ['EU', 'Europe',           220,  50,  80,  60],
    ['UK', 'United Kingdom',   210,  40,  20,  20],
    ['AF', 'Africa',           240, 130,  90, 130],
    ['ME', 'Middle East',      330, 110,  60,  50],
    ['RU', 'Russia',           300,  20, 200,  60],
    ['IN', 'India',            390, 150,  60,  70],
    ['CN', 'China',            440, 100, 100,  80],
    ['SE', 'SE Asia',          440, 200,  70,  50],
    ['JP', 'Japan',            540, 100,  30,  40],
    ['AU', 'Australia',        470, 240,  90,  60],
    ['ID', 'Indonesia',        450, 250,  60,  20],
  ];
  REGIONS.forEach(([code, name, x, y, w, h]) => {
    const lvl = levels[code] || 0;
    const cls = lvl ? `map-country l${lvl}` : 'map-country';
    const r = el('rect', { x, y, width: w, height: h, rx: 6, ry: 6, class: cls, 'data-code': code, 'data-name': name });
    svg.appendChild(r);
  });
}

window.SHAYN_CHARTS = { sparkline, barChart, lineChart, donutChart, regionMap, el, cssColor, withAlpha };
