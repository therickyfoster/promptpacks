// PromptPack loader with offline fallback + cache
async function loadPromptPack() {
  const fall = JSON.parse(document.getElementById('promptpack-fallback').textContent);
  const sources = [
    './promptpacks/core.json',        // local copy you can update
    'https://planetaryrestorationarchive.com/promptpacks/core.json' // optional remote mirror
  ];

  for (const src of sources) {
    try {
      const res = await fetch(src, {cache: 'no-store'});
      if (res.ok) return await res.json();
    } catch (_) { /* keep trying */ }
  }
  return fall;
}

// Apply tokens to CSS variables
function applyTokens(pack) {
  const r = document.documentElement;
  const t = pack.tokens;
  if (!t) return;
  const map = {
    '--accent': t.brand?.accent,
    '--accent-2': t.brand?.accent2,
    '--accent-3': t.brand?.warning,
    '--danger': t.brand?.danger,
    '--bg': t.surface?.bgDark,
    '--bg-soft': t.surface?.bgSoft,
    '--panel': t.surface?.panel,
    '--ink': t.surface?.ink,
    '--muted': t.surface?.muted
  };
  for (const [k, v] of Object.entries(map)) { if (v) r.style.setProperty(k, v); }
}

// Simple helper: view transition if supported
function withTransition(fn) {
  if (document.startViewTransition) {
    return document.startViewTransition(fn);
  }
  fn();
}

// Web Component: App Shell
customElements.define('app-shell', class extends HTMLElement {
  connectedCallback() {
    this.removeAttribute('unresolved');
  }
});

// Web Component: Overlay Panel
customElements.define('overlay-panel', class extends HTMLElement {
  static get observedAttributes() { return ['minimized']; }
  connectedCallback() {
    this.addEventListener('click', e => {
      const el = e.target;
      if (el.matches('[data-action="minimize"]')) {
        this.toggleAttribute('minimized');
      }
    });
  }
});

// Populate UI from PromptPack
async function boot() {
  const pack = await loadPromptPack();
  applyTokens(pack);

  // Nav
  const nav = document.querySelector('app-shell > nav[slot="top"]');
  const wrap = document.createElement('div'); wrap.className = 'wrap';
  const title = document.createElement('a'); title.href = '/'; title.textContent = pack.copy?.siteTitle ?? 'Continuity';
  title.style.fontWeight = 800;
  wrap.appendChild(title);
  const navlist = document.createElement('div'); navlist.setAttribute('role','navigation');
  (pack.patterns?.nav ?? []).forEach((label,i)=>{
    const a = document.createElement('a'); a.href = '#'+label.toLowerCase().replace(/\s+/g,'-'); a.textContent = label;
    if (i===0) a.innerHTML = `<span aria-current="page">${label}</span>`;
    navlist.appendChild(a);
  });
  wrap.appendChild(navlist);
  nav.appendChild(wrap);

  // Hero copy
  document.querySelector('.badge').textContent = pack.copy?.badge ?? 'Node';
  document.getElementById('site-title').textContent = pack.copy?.siteTitle ?? 'Continuity';
  document.getElementById('site-tagline').textContent = pack.copy?.siteTagline ?? '';
  document.getElementById('cta-primary').textContent = pack.copy?.ctaPrimary ?? 'Open';
  document.getElementById('cta-secondary').textContent = pack.copy?.ctaSecondary ?? 'Browse';

  // Footer
  document.getElementById('year').textContent = new Date().getFullYear();
  const fl = document.getElementById('footer-links');
  (pack.patterns?.footerLinks ?? []).forEach(link => {
    const li = document.createElement('li');
    const a = document.createElement('a'); a.href = link.href; a.textContent = link.label;
    li.appendChild(a); fl.appendChild(li);
  });

  // Example content cards (replace with your data loader)
  const grid = document.getElementById('blueprint-grid');
  const cards = [
    {title:'Seed Node Kit', copy:'Offline-first starter to deploy regenerative learning hubs.', href:'#'},
    {title:'Peace Grid', copy:'Narrative + protocol layer for conflict de-escalation.', href:'#'},
    {title:'Lightforge', copy:'Emotional alchemy & sobriety gamification system.', href:'#'},
    {title:'RegenNode—Beijing', copy:'City-scale restoration blueprint with continuity clauses.', href:'#'}
  ];
  for (const c of cards) {
    const art = document.createElement('article'); art.tabIndex = 0;
    art.innerHTML = `<h3>${c.title}</h3><p>${c.copy}</p><p><a href="${c.href}">Open →</a></p>`;
    grid.appendChild(art);
  }

  // Actions
  document.getElementById('cta-primary').addEventListener('click', ()=>withTransition(()=>location.hash='#field-kit'));
  document.getElementById('cta-secondary').addEventListener('click', ()=>withTransition(()=>location.hash='#blueprints'));

  // Overlay quick actions
  const overlay = document.getElementById('overlay');
  overlay.addEventListener('click', (e)=>{
    const t = e.target;
    if (t?.dataset?.toggle === 'theme') toggleTheme();
    if (t?.dataset?.open === 'field-kit') withTransition(()=>location.hash='#field-kit');
    if (t?.dataset?.open === 'community') withTransition(()=>location.hash='#community');
    if (t?.hasAttribute('data-check-updates')) checkForUpdates();
  });

  // Mark shell as ready
  document.querySelector('app-shell').removeAttribute('unresolved');
}

// Theme toggle
function toggleTheme() {
  const html = document.documentElement;
  const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  withTransition(()=>html.setAttribute('data-theme', next));
  try { localStorage.setItem('theme', next); } catch(_) {}
}
(function restoreTheme(){
  try { const t = localStorage.getItem('theme'); if (t) document.documentElement.setAttribute('data-theme', t); } catch(_) {}
})();

// SW update ping
async function checkForUpdates() {
  if (!navigator.serviceWorker?.controller) return alert('Offline mode ready. Updates will apply when available.');
  const reg = await navigator.serviceWorker.getRegistration();
  await reg?.update();
  alert('Checked for updates. Reload if new content was found.');
}

boot().catch(err => {
  console.error(err);
  document.querySelector('app-shell').removeAttribute('unresolved');
});

