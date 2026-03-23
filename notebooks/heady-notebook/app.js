/* ═══════════════════════════════════════════════════════════════
   HEADY NOTEBOOK — Interactive Logic
   ∞ Sacred Geometry :: Organic Systems :: Breathing Interfaces ∞
   ═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ── Scroll-spy: highlight active nav link ──────────────────
  const sections = document.querySelectorAll('.section[id]');
  const navLinks = document.querySelectorAll('.nav-link');

  function updateActiveNav() {
    const scrollY = window.scrollY + 120;
    let currentId = '';

    sections.forEach(section => {
      if (section.offsetTop <= scrollY) {
        currentId = section.id;
      }
    });

    navLinks.forEach(link => {
      link.classList.toggle('active', link.getAttribute('href') === '#' + currentId);
    });
  }

  window.addEventListener('scroll', updateActiveNav, { passive: true });
  updateActiveNav();

  // ── Smooth scroll for nav links ────────────────────────────
  navLinks.forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const target = document.querySelector(link.getAttribute('href'));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // close mobile sidebar
        sidebar.classList.remove('open');
        overlay.classList.remove('visible');
      }
    });
  });

  // ── Mobile sidebar toggle ──────────────────────────────────
  const sidebar = document.getElementById('sidebar');
  const toggle = document.getElementById('sidebarToggle');
  const overlay = document.getElementById('sidebarOverlay');

  if (toggle) {
    toggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('visible');
    });
  }

  if (overlay) {
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('visible');
    });
  }

  // ── Intersection Observer: reveal animations ───────────────
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          // Once visible, stop observing
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
  );

  document.querySelectorAll('.reveal, .reveal-left, .stagger').forEach(el => {
    revealObserver.observe(el);
  });

  // ── Animated counters ──────────────────────────────────────
  function animateCounter(el, target) {
    const duration = 1500;
    const startTime = performance.now();

    function tick(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(eased * target);
      el.textContent = current;

      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        el.textContent = target;
      }
    }

    requestAnimationFrame(tick);
  }

  const counterObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const target = parseInt(entry.target.getAttribute('data-count'), 10);
          if (!isNaN(target)) {
            animateCounter(entry.target, target);
          }
          counterObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.5 }
  );

  document.querySelectorAll('[data-count]').forEach(el => {
    counterObserver.observe(el);
  });

  // ── Progress bar animation ─────────────────────────────────
  const progressObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const width = entry.target.getAttribute('data-width');
          if (width) {
            // Small delay for visual effect
            setTimeout(() => {
              entry.target.style.width = width + '%';
            }, 200);
          }
          progressObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.3 }
  );

  document.querySelectorAll('.progress-fill[data-width]').forEach(el => {
    progressObserver.observe(el);
  });

  // ── Pipeline step animation ────────────────────────────────
  const pipelineSteps = document.querySelectorAll('.pipeline-step');
  let pipelineIndex = 0;

  function animatePipeline() {
    pipelineSteps.forEach(step => step.classList.remove('active'));
    if (pipelineSteps.length > 0) {
      pipelineSteps[pipelineIndex].classList.add('active');
      // Also activate the next step for a "moving" feel
      const nextIndex = (pipelineIndex + 1) % pipelineSteps.length;
      pipelineSteps[nextIndex].classList.add('active');
      pipelineIndex = (pipelineIndex + 1) % pipelineSteps.length;
    }
  }

  // Start pipeline animation when in view
  const pipelineEl = document.querySelector('.pipeline');
  if (pipelineEl) {
    const pipeObs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setInterval(animatePipeline, 1200);
          pipeObs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });
    pipeObs.observe(pipelineEl);
  }

  // ── Keyboard navigation (1–7 jumps to sections) ───────────
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    const num = parseInt(e.key, 10);
    if (num >= 1 && num <= 7) {
      const sectionIds = ['hero', 'business', 'tech', 'investor', 'user', 'success', 'financials'];
      const target = document.getElementById(sectionIds[num - 1]);
      if (target) target.scrollIntoView({ behavior: 'smooth' });
    }
  });

})();
