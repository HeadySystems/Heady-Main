/**
 * Heady Documentation Hub — Client Logic
 * Navigation, search, theme toggle, mobile menu
 */

(function () {
  'use strict';

  // ── Theme Toggle ──
  const toggle = document.querySelector('[data-theme-toggle]');
  const root = document.documentElement;
  let theme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  root.setAttribute('data-theme', theme);

  if (toggle) {
    updateToggleIcon();
    toggle.addEventListener('click', () => {
      theme = theme === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', theme);
      updateToggleIcon();
    });
  }

  function updateToggleIcon() {
    if (!toggle) return;
    toggle.innerHTML = theme === 'dark'
      ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>'
      : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
    toggle.setAttribute('aria-label', 'Switch to ' + (theme === 'dark' ? 'light' : 'dark') + ' mode');
  }

  // ── Page Navigation ──
  const pages = document.querySelectorAll('.page');
  const navLinks = document.querySelectorAll('.nav-link');
  const breadcrumbPage = document.getElementById('breadcrumbPage');

  window.navigateTo = function (pageId) {
    // Hide all pages
    pages.forEach(p => p.style.display = 'none');

    // Show target page
    const target = document.getElementById('page-' + pageId);
    if (target) {
      target.style.display = 'block';
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // Update nav active state
    navLinks.forEach(l => l.classList.remove('active'));
    const activeLink = document.querySelector(`.nav-link[data-page="${pageId}"]`);
    if (activeLink) activeLink.classList.add('active');

    // Update breadcrumb
    if (breadcrumbPage && activeLink) {
      breadcrumbPage.textContent = activeLink.textContent.trim();
    }

    // Close mobile sidebar
    closeSidebar();

    // Update URL hash
    history.pushState(null, '', '#' + pageId);
  };

  // Nav link clicks
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const pageId = link.getAttribute('data-page');
      navigateTo(pageId);
    });
  });

  // Handle hash on load
  function loadFromHash() {
    const hash = location.hash.slice(1);
    if (hash) {
      navigateTo(hash);
    }
  }
  loadFromHash();
  window.addEventListener('hashchange', loadFromHash);

  // ── Mobile Menu ──
  const menuToggle = document.getElementById('menuToggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');

  function openSidebar() {
    sidebar.classList.add('open');
    overlay.classList.add('visible');
  }

  function closeSidebar() {
    sidebar.classList.remove('open');
    overlay.classList.remove('visible');
  }

  if (menuToggle) {
    menuToggle.addEventListener('click', () => {
      sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
    });
  }

  if (overlay) {
    overlay.addEventListener('click', closeSidebar);
  }

  // ── Search ──
  const searchInput = document.getElementById('searchInput');
  const sidebarNav = document.getElementById('sidebarNav');

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const query = searchInput.value.toLowerCase().trim();
      const links = sidebarNav.querySelectorAll('.nav-link');

      links.forEach(link => {
        const text = link.textContent.toLowerCase();
        link.style.display = query === '' || text.includes(query) ? '' : 'none';
      });

      // Show/hide section titles based on visible children
      const sections = sidebarNav.querySelectorAll('.nav-section');
      sections.forEach(section => {
        const visibleLinks = section.querySelectorAll('.nav-link:not([style*="display: none"])');
        const title = section.querySelector('.nav-section-title');
        if (title) {
          title.style.display = visibleLinks.length > 0 ? '' : 'none';
        }
      });
    });
  }

  // ── Tab Component ──
  document.querySelectorAll('.tabs').forEach(tabContainer => {
    const tabs = tabContainer.querySelectorAll('.tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetId = tab.getAttribute('data-tab');
        const parent = tabContainer.parentElement;

        // Update tabs
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        // Update panels
        parent.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        const targetPanel = parent.querySelector(`#${targetId}`);
        if (targetPanel) targetPanel.classList.add('active');
      });
    });
  });

})();
