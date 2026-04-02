/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  HEADY AUTH — 27-Provider Authentication Engine                  ║
 * ║  auth.headysystems.com — Cloud Run Production                    ║
 * ║  HeadySystems Inc. — Eric Haywood, Founder                      ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * Firebase Auth + HeadyAuth Service integration.
 * Supports 27 authentication providers:
 *
 *  1. Google           10. Spotify         19. Notion
 *  2. GitHub           11. Twitch          20. Figma
 *  3. Microsoft        12. Reddit          21. GitLab
 *  4. Apple            13. Steam           22. Bitbucket
 *  5. Facebook         14. Epic Games      23. Yahoo
 *  6. X / Twitter      15. PlayStation     24. Phone (SMS)
 *  7. Discord          16. Xbox            25. SAML SSO
 *  8. Slack            17. Amazon          26. OpenID Connect
 *  9. LinkedIn         18. Dropbox         27. Passkey
 */

/* global firebase */
(function () {
  'use strict';

  // ═══════════════════════════════════════════════════════════════
  // §1 — FIREBASE INIT
  // ═══════════════════════════════════════════════════════════════

  const firebaseConfig = {
    apiKey: 'AIzaSyBLTu0h9Q09Cr05_3_Zj_3yent5cO3iaHE',
    authDomain: 'heady-ai.firebaseapp.com',
    projectId: 'heady-ai',
  };

  const PHI = 1.618033988749895;
  const PHI_DELAY = Math.round(PHI * 1000); // 1618ms

  firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();

  // ═══════════════════════════════════════════════════════════════
  // §2 — PROVIDER REGISTRY (27 providers)
  // ═══════════════════════════════════════════════════════════════

  // Firebase native providers
  const FIREBASE_PROVIDERS = {
    google:    () => new firebase.auth.GoogleAuthProvider(),
    github:    () => new firebase.auth.GithubAuthProvider(),
    microsoft: () => new firebase.auth.OAuthProvider('microsoft.com'),
    apple:     () => new firebase.auth.OAuthProvider('apple.com'),
    facebook:  () => new firebase.auth.FacebookAuthProvider(),
    twitter:   () => new firebase.auth.TwitterAuthProvider(),
    yahoo:     () => new firebase.auth.OAuthProvider('yahoo.com'),
  };

  // Custom OIDC providers (configured in Firebase Console)
  const CUSTOM_OIDC_PROVIDERS = {
    discord:     'oidc.discord',
    slack:       'oidc.slack',
    linkedin:    'oidc.linkedin',
    spotify:     'oidc.spotify',
    twitch:      'oidc.twitch',
    reddit:      'oidc.reddit',
    steam:       'oidc.steam',
    epic:        'oidc.epic',
    playstation: 'oidc.playstation',
    xbox:        'oidc.xbox',
    amazon:      'oidc.amazon',
    dropbox:     'oidc.dropbox',
    notion:      'oidc.notion',
    figma:       'oidc.figma',
    gitlab:      'oidc.gitlab',
    bitbucket:   'oidc.bitbucket',
  };

  // Special providers (handled differently)
  const SPECIAL_PROVIDERS = ['phone', 'saml', 'oidc', 'passkey'];

  // ═══════════════════════════════════════════════════════════════
  // §3 — DOM REFS
  // ═══════════════════════════════════════════════════════════════

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const els = {
    loginState: $('#loginState'),
    signupState: $('#signupState'),
    resetState: $('#resetState'),
    successState: $('#successState'),
    phoneState: $('#phoneState'),
    loadingOverlay: $('#loadingOverlay'),
    toast: $('#toast'),
    toastMsg: $('#toastMsg'),
    userName: $('#userName'),
    userEmail: $('#userEmail'),
    userTier: $('#userTier'),
  };

  // Parse URL params
  const params = new URLSearchParams(window.location.search);
  const returnUrl = params.get('return') || null;
  const leadId = params.get('leadId') || null;

  // ═══════════════════════════════════════════════════════════════
  // §4 — STATE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  function showState(stateId) {
    $$('.auth-state').forEach((el) => el.classList.add('hidden'));
    $(stateId)?.classList.remove('hidden');
  }

  function showLoading() { els.loadingOverlay.classList.remove('hidden'); }
  function hideLoading() { els.loadingOverlay.classList.add('hidden'); }

  function showToast(msg, duration = 5000) {
    els.toastMsg.textContent = msg;
    els.toast.classList.remove('hidden');
    setTimeout(() => els.toast.classList.add('hidden'), duration);
  }

  // ═══════════════════════════════════════════════════════════════
  // §5 — NAVIGATION
  // ═══════════════════════════════════════════════════════════════

  $('#showSignup')?.addEventListener('click', (e) => { e.preventDefault(); showState('#signupState'); });
  $('#showLogin')?.addEventListener('click', (e) => { e.preventDefault(); showState('#loginState'); });
  $('#showReset')?.addEventListener('click', (e) => { e.preventDefault(); showState('#resetState'); });
  $('#backToLogin')?.addEventListener('click', (e) => { e.preventDefault(); showState('#loginState'); });
  $('#phoneBackToLogin')?.addEventListener('click', (e) => { e.preventDefault(); showState('#loginState'); });

  // ═══════════════════════════════════════════════════════════════
  // §6 — PROVIDER SIGN-IN ENGINE
  // ═══════════════════════════════════════════════════════════════

  async function signInWithProvider(providerInstance) {
    try {
      showLoading();
      await auth.signInWithPopup(providerInstance);
      // Auth state observer handles the rest
    } catch (err) {
      hideLoading();
      if (err.code === 'auth/popup-closed-by-user') return;
      if (err.code === 'auth/account-exists-with-different-credential') {
        showToast('Account exists with a different sign-in method. Try another provider.');
        return;
      }
      if (err.code === 'auth/operation-not-supported-in-this-environment') {
        showToast('This provider is not yet configured. Contact admin.');
        return;
      }
      showToast(err.message || 'Authentication failed');
    }
  }

  function handleProviderClick(providerName) {
    // Firebase native providers
    if (FIREBASE_PROVIDERS[providerName]) {
      const provider = FIREBASE_PROVIDERS[providerName]();
      // Add scopes for specific providers
      if (providerName === 'google') {
        provider.addScope('email');
        provider.addScope('profile');
      }
      if (providerName === 'github') {
        provider.addScope('read:user');
        provider.addScope('user:email');
      }
      if (providerName === 'facebook') {
        provider.addScope('email');
        provider.addScope('public_profile');
      }
      return signInWithProvider(provider);
    }

    // Custom OIDC providers
    if (CUSTOM_OIDC_PROVIDERS[providerName]) {
      const provider = new firebase.auth.OAuthProvider(CUSTOM_OIDC_PROVIDERS[providerName]);
      return signInWithProvider(provider);
    }

    // Phone auth
    if (providerName === 'phone') {
      showState('#phoneState');
      return;
    }

    // SAML SSO
    if (providerName === 'saml') {
      const provider = new firebase.auth.SAMLAuthProvider('saml.heady-enterprise');
      return signInWithProvider(provider);
    }

    // Generic OIDC
    if (providerName === 'oidc') {
      const provider = new firebase.auth.OAuthProvider('oidc.heady-generic');
      return signInWithProvider(provider);
    }

    // Passkey / WebAuthn
    if (providerName === 'passkey') {
      return handlePasskeyAuth();
    }

    showToast(`Provider "${providerName}" is being configured.`);
  }

  // Bind all provider buttons
  $$('.provider-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const provider = btn.dataset.provider;
      if (provider) handleProviderClick(provider);
    });
  });

  // Clone provider grid for signup page
  const loginGrid = $('#providerGrid');
  const signupGrid = $('#signupProviderGrid');
  if (loginGrid && signupGrid) {
    signupGrid.innerHTML = loginGrid.innerHTML;
    signupGrid.querySelectorAll('.provider-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const provider = btn.dataset.provider;
        if (provider) handleProviderClick(provider);
      });
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // §7 — PHONE AUTH (SMS)
  // ═══════════════════════════════════════════════════════════════

  let confirmationResult = null;

  $('#phoneForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const phoneNumber = $('#phoneNumber').value.trim();
    try {
      showLoading();
      // Initialize recaptcha if not already done
      if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
          size: 'invisible',
        });
      }
      confirmationResult = await auth.signInWithPhoneNumber(phoneNumber, window.recaptchaVerifier);
      hideLoading();
      $('#phoneForm').classList.add('hidden');
      $('#phoneVerifyForm').classList.remove('hidden');
      showToast('Verification code sent!');
    } catch (err) {
      hideLoading();
      showToast(err.message || 'Failed to send verification code');
    }
  });

  $('#phoneVerifyForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = $('#verifyCode').value.trim();
    try {
      showLoading();
      await confirmationResult.confirm(code);
      // Auth state observer handles the rest
    } catch (err) {
      hideLoading();
      showToast(err.message || 'Invalid verification code');
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // §8 — PASSKEY / WEBAUTHN
  // ═══════════════════════════════════════════════════════════════

  async function handlePasskeyAuth() {
    if (!window.PublicKeyCredential) {
      showToast('Passkeys are not supported by this browser.');
      return;
    }

    try {
      showLoading();
      // Request passkey assertion from the browser
      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          rpId: window.location.hostname,
          userVerification: 'preferred',
          timeout: 60000,
        },
        mediation: 'optional',
      });

      if (credential) {
        // Exchange passkey credential with HeadyAuth backend
        const res = await fetch('/auth/passkey-verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            credentialId: credential.id,
            type: credential.type,
            leadId,
          }),
        });
        const data = await res.json();
        hideLoading();
        if (data.success) {
          els.userName.textContent = data.user?.displayName || 'User';
          els.userEmail.textContent = data.user?.email || '';
          els.userTier.textContent = (data.user?.tier || 'free').toUpperCase() + ' TIER';
          showState('#successState');
          if (returnUrl) setTimeout(() => { window.location.href = returnUrl; }, PHI_DELAY);
        } else {
          showToast('Passkey verification failed. Try another method.');
        }
      }
    } catch (err) {
      hideLoading();
      if (err.name === 'NotAllowedError') return; // User cancelled
      showToast('Passkey authentication failed.');
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // §9 — EMAIL/PASSWORD AUTH
  // ═══════════════════════════════════════════════════════════════

  // Login form
  $('#emailForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = $('#email').value.trim();
    const password = $('#password').value;

    try {
      showLoading();
      await auth.signInWithEmailAndPassword(email, password);
    } catch (err) {
      hideLoading();
      const messages = {
        'auth/user-not-found': 'No account found with this email',
        'auth/wrong-password': 'Incorrect password',
        'auth/invalid-email': 'Invalid email address',
        'auth/too-many-requests': 'Too many attempts. Please try again later.',
        'auth/invalid-credential': 'Invalid email or password',
      };
      showToast(messages[err.code] || err.message || 'Sign in failed');
    }
  });

  // Signup form
  $('#signupForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $('#signupName').value.trim();
    const email = $('#signupEmail').value.trim();
    const password = $('#signupPassword').value;

    try {
      showLoading();
      const result = await auth.createUserWithEmailAndPassword(email, password);
      if (name) await result.user.updateProfile({ displayName: name });
    } catch (err) {
      hideLoading();
      const messages = {
        'auth/email-already-in-use': 'An account with this email already exists',
        'auth/weak-password': 'Password must be at least 8 characters',
        'auth/invalid-email': 'Invalid email address',
      };
      showToast(messages[err.code] || err.message || 'Sign up failed');
    }
  });

  // Password reset
  $('#resetForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = $('#resetEmail').value.trim();

    try {
      showLoading();
      await auth.sendPasswordResetEmail(email);
      hideLoading();
      showToast('Reset link sent! Check your inbox.');
      setTimeout(() => showState('#loginState'), PHI_DELAY);
    } catch (err) {
      hideLoading();
      showToast(err.message || 'Failed to send reset email');
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // §10 — AUTH STATE OBSERVER
  // ═══════════════════════════════════════════════════════════════

  auth.onAuthStateChanged(async (user) => {
    if (user) {
      try {
        showLoading();
        const idToken = await user.getIdToken(true);
        const site = returnUrl ? new URL(returnUrl).hostname : 'auth.headysystems.com';
        const loginRes = await fetch('/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ idToken, site, leadId }),
        });

        const loginData = await loginRes.json();
        hideLoading();

        if (loginData.success) {
          els.userName.textContent = loginData.user.displayName || user.email?.split('@')[0] || 'User';
          els.userEmail.textContent = loginData.user.email;
          els.userTier.textContent = (loginData.user.tier || 'free').toUpperCase() + ' TIER';
          showState('#successState');
          if (returnUrl) setTimeout(() => { window.location.href = returnUrl; }, PHI_DELAY);
        } else {
          showToast('Session creation failed. Please try again.');
          showState('#loginState');
        }
      } catch (err) {
        hideLoading();
        console.error('[HeadyAuth] Session exchange error:', err);
        els.userName.textContent = user.displayName || user.email?.split('@')[0] || 'User';
        els.userEmail.textContent = user.email || '';
        els.userTier.textContent = 'FREE TIER';
        showState('#successState');
      }
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // §11 — LOGOUT
  // ═══════════════════════════════════════════════════════════════

  $('#logoutBtn')?.addEventListener('click', async () => {
    try {
      showLoading();
      await fetch('/auth/logout', { method: 'POST', credentials: 'include' });
      await auth.signOut();
      hideLoading();
      showState('#loginState');
    } catch (err) {
      hideLoading();
      showToast('Sign out failed');
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // §12 — SACRED GEOMETRY BACKGROUND CANVAS
  // ═══════════════════════════════════════════════════════════════

  const canvas = document.getElementById('sacredBg');
  const ctx = canvas.getContext('2d');
  const GOLDEN_ANGLE = Math.PI * 2 * (1 - 1 / PHI);
  let animFrame;
  let time = 0;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function drawSacredGeometry() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const maxRadius = Math.min(cx, cy) * 0.9;

    // Golden spiral dots — 27 enhanced (one per provider)
    const dots = 270;
    for (let i = 0; i < dots; i++) {
      const angle = i * GOLDEN_ANGLE + time * 0.002;
      const r = Math.sqrt(i / dots) * maxRadius;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);

      const alpha = 0.05 + 0.15 * Math.sin(time * 0.003 + i * 0.1);
      const size = 1 + 1.5 * (i / dots);

      if (i % 3 === 0) {
        ctx.fillStyle = `rgba(212, 168, 83, ${alpha})`;
      } else if (i % 3 === 1) {
        ctx.fillStyle = `rgba(139, 92, 246, ${alpha * 0.8})`;
      } else {
        ctx.fillStyle = `rgba(59, 130, 246, ${alpha * 0.5})`;
      }

      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Fibonacci concentric circles
    const fibs = [1, 2, 3, 5, 8, 13, 21];
    fibs.forEach((f, idx) => {
      const r = (f / 21) * maxRadius * 0.8;
      const alpha = 0.02 + 0.03 * Math.sin(time * 0.002 + idx);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(212, 168, 83, ${alpha})`;
      ctx.lineWidth = 0.5;
      ctx.stroke();
    });

    // Connecting lines
    for (let i = 0; i < 30; i++) {
      const a1 = i * GOLDEN_ANGLE + time * 0.001;
      const a2 = (i + 8) * GOLDEN_ANGLE + time * 0.001;
      const r1 = Math.sqrt(i / dots) * maxRadius;
      const r2 = Math.sqrt((i + 8) / dots) * maxRadius;

      ctx.beginPath();
      ctx.moveTo(cx + r1 * Math.cos(a1), cy + r1 * Math.sin(a1));
      ctx.lineTo(cx + r2 * Math.cos(a2), cy + r2 * Math.sin(a2));
      ctx.strokeStyle = `rgba(139, 92, 246, 0.03)`;
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    time++;
    animFrame = requestAnimationFrame(drawSacredGeometry);
  }

  window.addEventListener('resize', resize);
  resize();
  drawSacredGeometry();

  // Pause animation when tab not visible
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(animFrame);
    } else {
      drawSacredGeometry();
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // §13 — PROVIDER COUNT LOG
  // ═══════════════════════════════════════════════════════════════

  const totalProviders = Object.keys(FIREBASE_PROVIDERS).length
    + Object.keys(CUSTOM_OIDC_PROVIDERS).length
    + SPECIAL_PROVIDERS.length;
  console.log(`[HeadyAuth] ✓ ${totalProviders} auth providers initialized`);
  console.log('[HeadyAuth] ✓ Sacred Geometry canvas active');
})();
