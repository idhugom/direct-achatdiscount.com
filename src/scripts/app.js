// Interactions légères — aucune dépendance. ~2 Ko.
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Reveal on scroll */
function initReveal() {
  const els = document.querySelectorAll('.reveal');
  if (reduce || !('IntersectionObserver' in window)) {
    els.forEach((e) => e.classList.add('is-in'));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.12 }
  );
  els.forEach((e) => io.observe(e));
}

/* Barre de progression de lecture */
function initReadingBar() {
  const bar = document.querySelector('.reading-bar');
  if (!bar) return;
  const onScroll = () => {
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    bar.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + '%';
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* Menu mobile */
function initMenu() {
  const btn = document.querySelector('[data-menu-toggle]');
  const nav = document.querySelector('[data-menu]');
  if (!btn || !nav) return;
  btn.addEventListener('click', () => {
    const open = document.body.classList.toggle('menu-open');
    btn.setAttribute('aria-expanded', String(open));
  });
  nav.querySelectorAll('a').forEach((a) =>
    a.addEventListener('click', () => {
      document.body.classList.remove('menu-open');
      btn.setAttribute('aria-expanded', 'false');
    })
  );
}

/* Accordéons FAQ */
function initFaq() {
  document.querySelectorAll('[data-faq-q]').forEach((q) => {
    q.addEventListener('click', () => {
      const item = q.closest('[data-faq-item]');
      item?.classList.toggle('is-open');
      const exp = item?.classList.contains('is-open');
      q.setAttribute('aria-expanded', String(!!exp));
    });
  });
}

/* Effet tilt sur les cartes marquées data-tilt */
function initTilt() {
  if (reduce || matchMedia('(pointer: coarse)').matches) return;
  document.querySelectorAll('[data-tilt]').forEach((el) => {
    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      el.style.transform = `perspective(900px) rotateX(${(-y * 5).toFixed(2)}deg) rotateY(${(x * 6).toFixed(2)}deg) translateY(-4px)`;
    });
    el.addEventListener('mouseleave', () => { el.style.transform = ''; });
  });
}

/* Header : masque au scroll vers le bas, réapparaît vers le haut */
function initHeader() {
  const header = document.querySelector('[data-header]');
  if (!header) return;
  let last = 0;
  addEventListener(
    'scroll',
    () => {
      const y = scrollY;
      header.classList.toggle('is-scrolled', y > 40);
      if (y > last && y > 320) header.classList.add('is-hidden');
      else header.classList.remove('is-hidden');
      last = y;
    },
    { passive: true }
  );
}

function init() {
  initReveal();
  initReadingBar();
  initMenu();
  initFaq();
  initTilt();
  initHeader();
}
if (document.readyState !== 'loading') init();
else document.addEventListener('DOMContentLoaded', init);
