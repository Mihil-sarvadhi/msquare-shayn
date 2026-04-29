/* SHAYN MIS — sample data (realistic, freshly invented) */

const fmtINR = (n) => {
  if (n >= 1e7) return '₹' + (n/1e7).toFixed(1).replace(/\.0$/,'') + 'Cr';
  if (n >= 1e5) return '₹' + (n/1e5).toFixed(1).replace(/\.0$/,'') + 'L';
  if (n >= 1e3) return '₹' + (n/1e3).toFixed(1).replace(/\.0$/,'') + 'K';
  return '₹' + n;
};
const fmtN = (n) => n.toLocaleString('en-IN');
const fmtPct = (n, d=1) => (n>=0?'+':'') + n.toFixed(d) + '%';

// 30-day daily series
function genSeries(seed, base, vol) {
  let s = seed;
  const arr = [];
  for (let i = 0; i < 30; i++) {
    s = (s * 9301 + 49297) % 233280;
    const r = s / 233280;
    arr.push(Math.max(0, base + (r - 0.5) * vol));
  }
  return arr;
}

const SERIES = {
  revenue: [42,48,55,62,72,68,58,52,49,45,52,68,82,75,68,60,52,45,42,38,35,32,38,42,48,52,55,62,58,55].map(v => v*1000),
  spend:   [18,22,25,28,32,30,28,26,25,24,26,30,34,32,30,28,26,24,22,20,18,16,18,20,22,24,26,28,26,25].map(v => v*1000),
  sessions: [1820,1950,2240,2380,2620,2480,2180,1960,1880,1750,1920,2280,2540,2380,2180,1980,1820,1660,1580,1480,1420,1380,1450,1580,1720,1880,1960,2080,2020,1940],
  users:    [1640,1760,2010,2140,2360,2230,1960,1760,1690,1570,1730,2050,2280,2140,1960,1780,1640,1490,1420,1330,1280,1240,1300,1420,1550,1690,1760,1870,1820,1740],
  newUsers: [1280,1380,1580,1680,1850,1750,1540,1380,1320,1230,1360,1610,1790,1680,1540,1400,1290,1170,1110,1040,1000, 970,1020,1110,1210,1320,1380,1460,1420,1360],
  ecRev:    [38,42,48,55,62,58,52,46,42,38,42,52,58,55,50,46,42,38,35,32,30,28,32,35,40,44,48,52,50,46].map(v=>v*1000),
  ecTx:     [10,11,12,14,16,15,13,12,11,10,11,13,15,14,13,12,11,10, 9, 8, 8, 7, 8, 9,10,11,12,13,12,11],
};

const DATES = (() => {
  const out = [];
  const start = new Date(2026, 2, 27); // Mar 27
  for (let i = 0; i < 30; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    out.push(d);
  }
  return out;
})();

const KPIS = [
  { k: 'revenue', label: 'Revenue', value: '₹7.2L', sub: '152 orders · ₹4.7K AOV', delta: 12.4, dir: 'up',
    spark: [38,42,46,52,58,55,52,48,46,52,58,62,68,62,58,55,52,48,52,58,62,68,72,75,72] },
  { k: 'aov', label: 'AOV', value: '₹4.7K', sub: 'avg order value', delta: 8.2, dir: 'up',
    spark: [42,44,46,45,47,46,48,47,49,48,46,48,50,52,51,49,50,52,53,52,51,50,52,53,55] },
  { k: 'sess', label: 'Sessions', value: '58,420', sub: 'traffic · vs prev period', delta: 6.8, dir: 'up',
    spark: [1820,1950,2240,2380,2620,2480,2180,1960,1880,1750,1920,2280,2540,2380,2180,1980,1820,2080,2240,2380,2540,2680,2820,2740,2620] },
  { k: 'active', label: 'Active users', value: '47,810', sub: 'unique · vs prev period', delta: 4.2, dir: 'up',
    spark: [1640,1760,2010,2140,2360,2230,1960,1760,1690,1570,1730,2050,2280,2140,1960,1780,1850,1980,2120,2280,2380,2480,2540,2480,2380] },
  { k: 'new', label: 'New users', value: '44,120', sub: 'first-time · vs prev period', delta: -3.4, dir: 'down',
    spark: [1280,1380,1580,1680,1850,1750,1540,1380,1320,1230,1360,1610,1790,1680,1540,1400,1480,1520,1580,1620,1680,1640,1580,1520,1480] },
  { k: 'bounce', label: 'Bounce rate', value: '38.2%', sub: 'session quality', delta: -2.1, dir: 'up', // lower = better
    spark: [44,42,41,43,40,39,41,42,40,38,39,40,38,37,38,39,40,38,37,38,39,38,37,38,38] },
];

const ORDERS = [
  { id: '#SYN/26-27/2812', loc: 'BANGALORE', tags: ['paid','fulfilled'], amt: 9442.50, t: '24 Apr · 14:32' },
  { id: '#SYN/26-27/2811', loc: 'MUMBAI',    tags: ['paid','unfulfilled'], amt: 8887.75, t: '24 Apr · 13:18' },
  { id: '#SYN/26-27/2810', loc: 'DELHI',     tags: ['paid','fulfilled'], amt: 7124.00, t: '24 Apr · 11:44' },
  { id: '#SYN/26-27/2809', loc: 'CHENNAI',   tags: ['partial','fulfilled'], amt: 5656.73, t: '23 Apr · 22:09' },
  { id: '#SYN/26-27/2808', loc: 'PUNE',      tags: ['paid','unfulfilled'], amt: 4329.20, t: '23 Apr · 19:51' },
  { id: '#SYN/26-27/2807', loc: 'HYDERABAD', tags: ['paid','fulfilled'], amt: 3572.82, t: '23 Apr · 17:03' },
  { id: '#SYN/26-27/2806', loc: 'KOLKATA',   tags: ['partial','unfulfilled'], amt: 2267.95, t: '23 Apr · 15:42' },
];

const COUNTRIES_LIVE = [
  { code: 'IN', name: 'India',     n: 24 },
  { code: 'ID', name: 'Indonesia', n: 3  },
  { code: 'SG', name: 'Singapore', n: 2  },
  { code: 'AE', name: 'UAE',       n: 1  },
];

const COUNTRIES_ACTIVE = [
  { code: 'IN', name: 'India',          n: 22420, max: 22420 },
  { code: 'CN', name: 'China',          n: 18840 },
  { code: 'US', name: 'United States',  n:  4980 },
  { code: 'SG', name: 'Singapore',      n:  1620 },
  { code: 'AE', name: 'UAE',            n:   720 },
  { code: 'ID', name: 'Indonesia',      n:   480 },
  { code: 'GB', name: 'United Kingdom', n:   210 },
  { code: 'DE', name: 'Germany',        n:   180 },
  { code: 'BR', name: 'Brazil',         n:    96 },
];

const CHANNELS = [
  { name: 'Direct',          dot: '#0F0F12', sessions: 26840, users: 25910, rev: 312000, conv: 99.5, soon: false, on: true },
  { name: 'Organic Social',  dot: '#7C3AED', sessions: 18420, users: 15280, rev: 282000, conv: 99.4, soon: false, on: true },
  { name: 'Organic Search',  dot: '#16A34A', sessions:  6480, users:  5410, rev: 124000, conv: 95.2, soon: false, on: true },
  { name: 'Paid Social',     dot: '#2563EB', sessions:  4860, users:  3920, rev:  82000, conv: 99.6, soon: false, on: true },
  { name: 'Referral',        dot: '#0D9488', sessions:   210, users:   148, rev:   2200, conv: 96.4, soon: false, on: true },
  { name: 'Organic Shopping',dot: '#D97706', sessions:    84, users:    62, rev:  18000, conv: 96.9, soon: false, on: true },
  { name: 'Cross-network',   dot: '#9A9AA2', sessions:    36, users:    24, rev:    900, conv:100.0, soon: false, on: true },
];

const REVENUE_CHANNELS = [
  { name: 'Shopify',  color: '#B8893E', on: true,  soon: false },
  { name: 'Amazon',   color: '#9A9AA2', on: false, soon: true  },
  { name: 'Flipkart', color: '#9A9AA2', on: false, soon: true  },
  { name: 'Myntra',   color: '#9A9AA2', on: false, soon: true  },
  { name: 'Eternz',   color: '#9A9AA2', on: false, soon: true  },
];

const CAMPAIGNS = [
  { nm: 'S12/Video',         spend: 110000, rev: 231000, roas: 2.10, ctr: 3.00, cpm: 188, freq: 1.4, status: 'Hold' },
  { nm: 'Remarketing S11',   spend:  48000, rev:  85000, roas: 1.76, ctr: 4.33, cpm: 337, freq: 1.3, status: 'Hold' },
  { nm: 'Income > 10L',      spend:  37000, rev:  32000, roas: 0.85, ctr: 2.06, cpm: 179, freq: 1.5, status: 'Cut'  },
  { nm: 'S18 Color Silver',  spend:  26000, rev:  63000, roas: 2.43, ctr: 3.70, cpm: 268, freq: 1.2, status: 'Scale' },
  { nm: 'S2 Lookalike (1%)', spend:  16000, rev:  35000, roas: 2.19, ctr: 4.34, cpm: 219, freq: 1.2, status: 'Hold' },
  { nm: 'S3/4 Allcat',       spend:  13000, rev:  15000, roas: 1.09, ctr: 3.79, cpm: 367, freq: 1.2, status: 'Cut'  },
  { nm: 'Fashion interests', spend:  11000, rev:  12000, roas: 1.03, ctr: 4.91, cpm: 390, freq: 1.3, status: 'Cut'  },
  { nm: 'S06 Image Travel',  spend:   9000, rev:      0, roas: 0.00, ctr: 3.40, cpm: 591, freq: 1.1, status: 'Cut'  },
];

const PAGES = [
  { nm: 'Vermeil Fine Jewellery — SHAYN', views: 7715, users: 3149, vu: 2.45, time: '16s', events: 15965, bounce: 28.0 },
  { nm: 'Petal Touch Ring | Moissanite & 18K Gold', views: 2544, users: 1476, vu: 1.72, time: '6s',  events:  7455, bounce: 30.2 },
  { nm: 'All Products — SHAYN',                     views: 2365, users: 1367, vu: 1.73, time: '21s', events:  5142, bounce: 26.7 },
  { nm: 'Ring for Women — Unique, Minimal & Modern', views: 2097, users: 1076, vu: 1.95, time: '45s', events:  4108, bounce: 38.4 },
  { nm: 'Best Finger & Hand for Silver Ring (Women)', views: 1827, users: 921,  vu: 1.98, time: '64s', events:  4363, bounce: 17.0 },
  { nm: 'Gold Purity — Chart, Guide, Table & Value', views: 1649, users: 823,  vu: 2.00, time: '45s', events:  3989, bounce: 31.2 },
  { nm: 'Earrings for Women — Stylish, Latest',      views: 1612, users: 847,  vu: 1.90, time: '42s', events:  3114, bounce: 26.4 },
  { nm: 'Buy Blue Stone Ring for Men | 18KT Vermeil', views: 1411, users: 848,  vu: 1.66, time: '7s',  events:  4322, bounce:  4.2 },
  { nm: 'Bracelet (Women) — Stylish, Fancy & Unique', views: 1294, users: 678,  vu: 1.91, time: '33s', events:  2429, bounce: 26.8 },
];

const PRODUCTS = [
  { rank: 1, nm: 'Classic Onyx Signet Ring',  units: 4, rev: 26000 },
  { rank: 2, nm: 'Garden Bloom Studs',        units: 2, rev: 21000 },
  { rank: 3, nm: 'Malachite Signet Ring',     units: 3, rev: 19000 },
  { rank: 4, nm: 'Braided Edge Band',         units: 2, rev: 14000 },
  { rank: 5, nm: 'Petal Touch Ring',          units: 5, rev: 12500 },
];

const RATED = [
  { rank: 1, nm: 'Half Heart Ring',         rating: 5, reviews: 1 },
  { rank: 2, nm: 'Mangalsutra Bow Necklace', rating: 5, reviews: 1 },
  { rank: 3, nm: 'Hex Link Chain',          rating: 5, reviews: 1 },
  { rank: 4, nm: 'Garden Bloom Studs',      rating: 5, reviews: 1 },
  { rank: 5, nm: 'Petal Touch Ring',        rating: 4.8, reviews: 4 },
];

const REVIEWS_DIST = { 5: 7, 4: 1, 3: 0, 2: 0, 1: 0 };

window.SHAYN = {
  fmtINR, fmtN, fmtPct,
  KPIS, ORDERS, COUNTRIES_LIVE, COUNTRIES_ACTIVE,
  CHANNELS, REVENUE_CHANNELS, CAMPAIGNS, PAGES, PRODUCTS, RATED, REVIEWS_DIST,
  SERIES, DATES,
};
