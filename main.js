// CopyHome landing: theme switch, nav state, scroll reveals, hero data flow, chart and terminal animations.
// Shared by the Russian (index.html) and English (en/index.html) pages; strings are picked by <html lang>.
(() => {
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SVG = 'http://www.w3.org/2000/svg';

  // Always the newest GitHub release: every release uploads its build under the same name.
  const DOWNLOAD_URL = 'https://github.com/ilyabazhenov/copyhome/releases/latest/download/CopyHome.dmg';

  const STRINGS = {
    ru: {
      checking: 'проверка',
      verified: 'проверен',
      soon: 'Сборка скоро появится',
      toLight: 'Включить светлую тему',
      toDark: 'Включить тёмную тему',
      terminal: [
        ['c', '# 03:00 · по расписанию · проект «Магазин»'],
        ['p', '→ ssh deploy@shop.example.ru'],
        ['', '  mysqldump --single-transaction --routines --triggers --events shop | zstd -T0'],
        ['k', '  ↓ mysql-shop.sql.zst       412 МБ   28,4 МБ/с'],
        ['p', '→ tar -czf - /var/www/shop/uploads --exclude cache'],
        ['k', '  ↓ dir-uploads.tar.gz       1,1 ГБ   31,2 МБ/с'],
        ['', ''],
        ['c', '# проверка на Mac'],
        ['ok', '  ✓ mysql-shop.sql.zst       распакован, «Dump completed» на месте'],
        ['ok', '  ✓ dir-uploads.tar.gz       конечный маркер tar найден'],
        ['ok', '  ✓ размер                   +1,2% к прошлому снимку'],
        ['', ''],
        ['c', '# Яндекс Диск'],
        ['ok', '  ✓ выгружено 3 файла, sha256 совпадает · ротация: хранится 14 копий'],
        ['p', '→ Готово за 4 мин 12 с. Следующий бекап завтра в 03:00'],
      ],
    },
    en: {
      checking: 'checking',
      verified: 'verified',
      soon: 'Build coming soon',
      toLight: 'Switch to light theme',
      toDark: 'Switch to dark theme',
      terminal: [
        ['c', '# 3:00 AM · scheduled · project "Shop"'],
        ['p', '→ ssh deploy@shop.example.com'],
        ['', '  mysqldump --single-transaction --routines --triggers --events shop | zstd -T0'],
        ['k', '  ↓ mysql-shop.sql.zst       412 MB   28.4 MB/s'],
        ['p', '→ tar -czf - /var/www/shop/uploads --exclude cache'],
        ['k', '  ↓ dir-uploads.tar.gz       1.1 GB   31.2 MB/s'],
        ['', ''],
        ['c', '# verifying on the Mac'],
        ['ok', '  ✓ mysql-shop.sql.zst       unpacked, "Dump completed" is there'],
        ['ok', '  ✓ dir-uploads.tar.gz       tar end-of-archive marker found'],
        ['ok', '  ✓ size                     +1.2% vs previous snapshot'],
        ['', ''],
        ['c', '# Yandex Disk'],
        ['ok', '  ✓ 3 files uploaded, sha256 matches · rotation: keeping 14 copies'],
        ['p', '→ Done in 4 min 12 s. Next backup tomorrow at 3:00 AM'],
      ],
    },
  };
  const T = STRINGS[root.lang] || STRINGS.ru;

  // ---------- theme ----------
  const systemDark = matchMedia('(prefers-color-scheme: dark)');
  const toggle = document.querySelector('[data-theme-toggle]');
  const isDark = () => (root.dataset.theme ? root.dataset.theme === 'dark' : systemDark.matches);
  const syncTheme = () => {
    const dark = isDark();
    root.classList.toggle('is-dark', dark);
    if (toggle) {
      const label = dark ? T.toLight : T.toDark;
      toggle.setAttribute('aria-label', label);
      toggle.title = label;
    }
  };
  toggle?.addEventListener('click', () => {
    const next = isDark() ? 'light' : 'dark';
    // Choosing the theme the system already uses means "follow the system" again.
    if ((next === 'dark') === systemDark.matches) delete root.dataset.theme;
    else root.dataset.theme = next;
    try {
      if (root.dataset.theme) localStorage.setItem('copyhome-theme', root.dataset.theme);
      else localStorage.removeItem('copyhome-theme');
    } catch (e) { /* storage blocked: the choice lasts for this page view */ }
    syncTheme();
  });
  systemDark.addEventListener?.('change', syncTheme);
  syncTheme();

  document.querySelectorAll('a[data-download]').forEach((a) => {
    if (DOWNLOAD_URL) a.href = DOWNLOAD_URL;
    else a.addEventListener('click', (e) => { e.preventDefault(); a.querySelector('span').textContent = T.soon; });
  });

  const nav = document.querySelector('.nav');
  const onScroll = () => nav.classList.toggle('scrolled', scrollY > 20);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Reveal on scroll, staggered within each parent.
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const el = e.target;
      const siblings = [...el.parentElement.children].filter((c) => c.classList.contains('reveal'));
      el.style.transitionDelay = `${Math.min(siblings.indexOf(el), 6) * 80}ms`;
      el.classList.add('in');
      io.unobserve(el);
      if (el.id === 'terminal') runTerminal();
    }
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

  // ---------- hero flow ----------
  const flow = document.getElementById('flow');
  const lines = document.getElementById('flow-lines');
  const servers = [...flow.querySelectorAll('.srv')];
  const home = flow.querySelector('.flow-home');
  const homeIcon = flow.querySelector('.home-icon');
  const list = document.getElementById('home-files');
  const clouds = [...flow.querySelectorAll('.cl')];
  const cloudStat = flow.querySelector('.cl.live .cl-stat');
  let paths = [];
  let cloudPath = '';

  function layout() {
    const box = flow.getBoundingClientRect();
    const h = home.getBoundingClientRect();
    const vertical = h.top > servers[servers.length - 1].getBoundingClientRect().bottom;
    lines.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
    lines.innerHTML = `<defs><linearGradient id="lnGrad" x1="0" x2="1"><stop offset="0" stop-color="#2BC6B4" stop-opacity="0"/><stop offset="1" stop-color="#2BC6B4"/></linearGradient></defs>`;
    paths = servers.map((s, i) => {
      const r = s.getBoundingClientRect();
      let d;
      if (vertical) {
        const x1 = r.left + r.width / 2 - box.left, y1 = r.bottom - box.top;
        const x2 = h.left + h.width * (0.3 + 0.2 * i) - box.left, y2 = h.top - box.top;
        const my = (y1 + y2) / 2;
        d = `M${x1},${y1} C${x1},${my} ${x2},${my} ${x2},${y2}`;
      } else {
        const x1 = r.right - box.left, y1 = r.top + r.height / 2 - box.top;
        const x2 = h.left - box.left, y2 = h.top + h.height * (0.36 + 0.14 * i) - box.top;
        const mx = (x1 + x2) / 2;
        d = `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`;
      }
      const p = document.createElementNS(SVG, 'path');
      p.setAttribute('d', d);
      p.setAttribute('class', 'ln');
      lines.append(p);
      return d;
    });
    // On phones the servers stack in one column: only the last one has a clear line down.
    if (vertical && servers[0].getBoundingClientRect().top < servers[1].getBoundingClientRect().top - 5) {
      const last = paths[paths.length - 1];
      lines.querySelectorAll('.ln').forEach((p, i) => { if (i < paths.length - 1) p.remove(); });
      paths = paths.map(() => last);
    }
    // Mac → cloud storages: the live one gets the animated line, planned ones a faint one.
    const below = clouds[0].getBoundingClientRect().top > h.bottom;
    clouds.forEach((c, i) => {
      const r = c.getBoundingClientRect();
      let d;
      if (below) {
        const x1 = h.left + h.width * (0.3 + 0.2 * i) - box.left, y1 = h.bottom - box.top;
        const x2 = r.left + r.width / 2 - box.left, y2 = r.top - box.top;
        const my = (y1 + y2) / 2;
        d = `M${x1},${y1} C${x1},${my} ${x2},${my} ${x2},${y2}`;
      } else {
        const x1 = h.right - box.left, y1 = h.top + h.height * (0.36 + 0.14 * i) - box.top;
        const x2 = r.left - box.left, y2 = r.top + r.height / 2 - box.top;
        const mx = (x1 + x2) / 2;
        d = `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`;
      }
      const p = document.createElementNS(SVG, 'path');
      p.setAttribute('d', d);
      p.setAttribute('class', c.classList.contains('live') ? 'ln' : 'ln soon');
      lines.append(p);
      if (c.classList.contains('live')) cloudPath = d;
    });
  }

  function arrive(name, size) {
    const li = document.createElement('li');
    li.className = 'checking';
    li.innerHTML = `<span class="f-name"></span><span class="f-size"></span><span class="f-ok"></span>`;
    li.children[0].textContent = name;
    li.children[1].textContent = size;
    li.children[2].textContent = T.checking;
    list.prepend(li);
    while (list.children.length > 3) list.lastElementChild.remove();
    homeIcon.classList.add('got');
    setTimeout(() => homeIcon.classList.remove('got'), 350);
    setTimeout(() => {
      li.classList.remove('checking');
      li.lastElementChild.textContent = T.verified;
      upload(name);
    }, 900);
  }

  // A verified file continues from the Mac to the cloud; the storage card shows it, then the checksum.
  function upload(name) {
    if (!cloudPath) return;
    const live = clouds.find((c) => c.classList.contains('live'));
    fly(cloudPath, 1100, () => {
      live.classList.add('got');
      cloudStat.classList.add('busy');
      cloudStat.textContent = `↑ ${name}`;
      setTimeout(() => live.classList.remove('got'), 400);
      setTimeout(() => { cloudStat.classList.remove('busy'); cloudStat.textContent = 'sha256 ✓'; }, 1000);
    });
  }

  // Moves a glowing dot along a path, then calls done.
  function fly(d, dur, done) {
    const dot = document.createElementNS(SVG, 'circle');
    dot.setAttribute('r', '4');
    dot.setAttribute('class', 'packet');
    const trail = document.createElementNS(SVG, 'path');
    trail.setAttribute('d', d);
    trail.setAttribute('class', 'ln-glow');
    lines.append(trail, dot);
    const len = trail.getTotalLength();
    const t0 = performance.now();
    const step = (t) => {
      const k = Math.min((t - t0) / dur, 1);
      const e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      const pt = trail.getPointAtLength(e * len);
      dot.setAttribute('cx', pt.x);
      dot.setAttribute('cy', pt.y);
      trail.style.opacity = String(Math.sin(k * Math.PI) * 0.9);
      trail.style.strokeDasharray = `${e * len} ${len}`;
      if (k < 1) requestAnimationFrame(step);
      else { dot.remove(); trail.remove(); done(); }
    };
    requestAnimationFrame(step);
  }

  function send(i) {
    const s = servers[i];
    const files = JSON.parse(s.dataset.files);
    const [name, size] = files[Math.floor(Math.random() * files.length)];
    s.classList.add('sending');
    fly(paths[i], 1500, () => { s.classList.remove('sending'); arrive(name, size); });
  }

  layout();
  addEventListener('resize', layout);
  if (document.fonts) document.fonts.ready.then(layout);

  // Packets only fly while the hero is on screen and the tab is visible.
  let flowVisible = true;
  new IntersectionObserver((es) => {
    flowVisible = es[0].isIntersecting;
    flow.classList.toggle('paused', !flowVisible);
  }).observe(flow);
  if (!reduced) {
    let n = 0;
    const order = [0, 1, 2, 0, 2, 1];
    setTimeout(() => send(order[n++ % order.length]), 900);
    setInterval(() => { if (!document.hidden && flowVisible) send(order[n++ % order.length]); }, 2300);
  }

  // ---------- chart ----------
  const chart = document.getElementById('chart');
  const sizes = [58, 60, 59, 63, 62, 66, 65, 68, 70, 69, 73, 75, 74, 80];
  const times = [44, 52, 40, 58, 49, 55, 46, 61, 54, 50, 63, 57, 53, 66];
  const W = 400, H = 130, gap = 6, bw = (W - gap * (sizes.length - 1)) / sizes.length;
  const ty = (t) => H - 18 - (t / 70) * (H - 30);
  const pts = times.map((t, i) => [i * (bw + gap) + bw / 2, ty(t)]);
  chart.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
    ${[0.25, 0.5, 0.75].map((k) => `<line class="grid" x1="0" x2="${W}" y1="${H * k}" y2="${H * k}" vector-effect="non-scaling-stroke"/>`).join('')}
    ${sizes.map((s, i) => `<rect class="bar${i === sizes.length - 1 ? ' last' : ''}" x="${i * (bw + gap)}" y="${H - s * 1.4}" width="${bw}" height="${s * 1.4}" rx="3" style="transition-delay:${i * 40}ms"/>`).join('')}
    <polyline class="time" points="${pts.map((p) => p.join(',')).join(' ')}" vector-effect="non-scaling-stroke"/>
  </svg>`;
  new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { chart.classList.add('on'); o.disconnect(); } }, { threshold: .3 }).observe(chart);

  // ---------- terminal ----------
  const body = document.getElementById('term-body');
  let started = false;
  function runTerminal() {
    if (started) return;
    started = true;
    const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    const script = T.terminal;
    if (reduced) { body.innerHTML = script.map(([c, t]) => `<span class="${c}">${esc(t)}</span>`).join('\n'); return; }
    let li = 0, ci = 0, done = '';
    const tick = () => {
      if (li >= script.length) { body.innerHTML = done + '<span class="cur"></span>'; return; }
      const [cls, text] = script[li];
      ci += cls === 'c' || cls === '' ? 3 : 2;
      const part = text.slice(0, ci);
      body.innerHTML = done + `<span class="${cls}">${esc(part)}</span><span class="cur"></span>`;
      if (ci >= text.length) {
        done += `<span class="${cls}">${esc(text)}</span>\n`;
        li++; ci = 0;
        setTimeout(tick, cls === 'k' ? 420 : cls === 'ok' ? 260 : 160);
      } else setTimeout(tick, 14);
    };
    tick();
  }
})();
