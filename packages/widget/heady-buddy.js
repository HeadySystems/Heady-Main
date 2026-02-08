// HEADY_BRAND:BEGIN
// HEADY SYSTEMS :: SACRED GEOMETRY
// FILE: packages/widget/heady-buddy.js
// LAYER: root
// 
//         _   _  _____    _    ____   __   __
//        | | | || ____|  / \  |  _ \ \ \ / /
//        | |_| ||  _|   / _ \ | | | | \ V / 
//        |  _  || |___ / ___ \| |_| |  | |  
//        |_| |_||_____/_/   \_\____/   |_|  
// 
//    Sacred Geometry :: Organic Systems :: Breathing Interfaces
// HEADY_BRAND:END

/**
 * HEADY BUDDY WIDGET LOADER (HCFP_05)
 * 
 * Usage:
 * <script src="https://api.heady.systems/widget/heady-buddy.js" data-api-key="PUBLIC_KEY"></script>
 */

(function() {
  // Sacred Geometry Constants
  const PHI = 1.618;
  const WIDGET_WIDTH = 350;
  const WIDGET_HEIGHT = Math.round(WIDGET_WIDTH * PHI); // ~566px

  // Configuration
  const scriptTag = document.currentScript;
  const apiKey = scriptTag ? scriptTag.getAttribute('data-api-key') : 'anon';
  const backendUrl = scriptTag ? scriptTag.getAttribute('data-backend-url') : 'http://localhost:3300';

  // Create Container
  const container = document.createElement('div');
  container.id = 'heady-buddy-root';
  Object.assign(container.style, {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    zIndex: '9999',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  });

  // Create Toggle Button (The Anchor)
  const button = document.createElement('button');
  button.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>
  `;
  Object.assign(button.style, {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    backgroundColor: '#000',
    color: '#fff',
    border: 'none',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)'
  });

  // Create Iframe (The Portal)
  const iframe = document.createElement('iframe');
  iframe.src = `${backendUrl}/widget/chat.html?key=${apiKey}`;
  Object.assign(iframe.style, {
    width: `${WIDGET_WIDTH}px`,
    height: `${WIDGET_HEIGHT}px`,
    border: 'none',
    borderRadius: '12px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
    marginBottom: '16px',
    display: 'none', // Hidden by default
    backgroundColor: '#fff'
  });

  // State
  let isOpen = false;

  // Interactions
  button.onclick = () => {
    isOpen = !isOpen;
    iframe.style.display = isOpen ? 'block' : 'none';
    button.style.transform = isOpen ? 'rotate(90deg)' : 'rotate(0deg)';
  };

  // Mount
  container.appendChild(iframe);
  container.appendChild(button);
  document.body.appendChild(container);

  console.log('∞ HeadyBuddy Widget Loaded ∞');
})();
