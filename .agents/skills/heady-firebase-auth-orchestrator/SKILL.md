---
name: heady-firebase-auth-orchestrator
description: Designs, implements, and troubleshoots Firebase Authentication flows for the Heady platform including user registration, login, role-based access, custom claims, token management, and integration with Drupal and other services. Use when the user asks about user authentication, login flows, Firebase Auth setup, custom claims, role management, token refresh, or auth integration. Triggers on phrases like "set up Firebase Auth", "user login flow", "custom claims", "auth integration", "token expired", "role-based access", "user management", or "Firebase authentication".
license: MIT
metadata:
  author: heady-connection
  version: '1.0'
  platform: heady
  category: auth-security
---

# Heady Firebase Auth Orchestrator

## When to Use This Skill

Use this skill when the user asks to:

- Design or implement Firebase Authentication flows for Heady web or mobile apps
- Set up email/password, Google, or other OAuth provider login
- Implement custom claims for role-based access control
- Integrate Firebase Auth tokens with Drupal's access control system
- Manage user lifecycle: registration, verification, password reset, deletion
- Troubleshoot auth errors, token expiry, or permission denied issues
- Audit security rules for Firestore tied to authenticated user identity
- Set up multi-factor authentication (MFA)

## Auth Architecture for Heady

```
[User Browser/App]
     |
     | Firebase SDK (client-side)
     v
[Firebase Authentication]
     |
     |-- ID Token (JWT) issued
     |
     +-- [Firestore] ← security rules check auth.uid / custom claims
     |
     +-- [Cloud Functions] ← verify ID token server-side
     |
     +-- [Drupal Backend] ← custom auth bridge validates Firebase JWT
```

## Supported Auth Providers

| Provider | Use Case |
|---|---|
| Email/Password | Primary account creation |
| Google | Social login |
| Facebook | Social login (if enabled) |
| Custom Token | Drupal-to-Firebase SSO |
| Anonymous | Guest/pre-login experience |
| Phone (SMS) | MFA second factor |

## Custom Claims Architecture

Heady uses Firebase Custom Claims for role-based access:

| Claim | Value | Description |
|---|---|---|
| `role` | `"customer"` | Standard registered user |
| `role` | `"vip"` | VIP collector tier |
| `role` | `"artist"` | Artist/vendor with upload privileges |
| `role` | `"admin"` | Platform administrator |
| `drupal_uid` | integer | Linked Drupal user ID |
| `heady_tier` | `"bronze"/"silver"/"gold"` | Loyalty tier |

## Instructions

### 1. New Auth Flow Design

When designing a new auth flow:
1. Map the user journey: anonymous → registered → verified → role-assigned.
2. Identify required providers (email+password minimum; OAuth as optional enhancement).
3. Determine custom claims requirements: what roles and attributes must be available client-side?
4. Plan token refresh strategy: Firebase tokens expire after 1 hour; identify pages requiring fresh tokens.
5. Design error states for each step: invalid email, weak password, unverified email, account disabled.

### 2. Firebase Auth Implementation

**Initialize Firebase:**
```javascript
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
```

**Email/Password Registration:**
```javascript
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';

async function registerUser(email, password) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  await sendEmailVerification(userCredential.user);
  return userCredential.user;
}
```

**Google Sign-In:**
```javascript
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  return result.user;
}
```

**Get ID Token:**
```javascript
const idToken = await auth.currentUser.getIdToken(/* forceRefresh */ true);
// Attach to API requests as: Authorization: Bearer {idToken}
```

### 3. Custom Claims via Cloud Functions

**Set claims on registration (Cloud Function):**
```javascript
exports.onUserCreate = functions.auth.user().onCreate(async (user) => {
  await admin.auth().setCustomUserClaims(user.uid, {
    role: 'customer',
    heady_tier: 'bronze',
    drupal_uid: null
  });
});
```

**Promote user to artist role:**
```javascript
exports.promoteToArtist = functions.https.onCall(async (data, context) => {
  if (!context.auth?.token?.role === 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Admin only');
  }
  await admin.auth().setCustomUserClaims(data.uid, {
    ...existingClaims,
    role: 'artist'
  });
  // Force client token refresh
  await admin.auth().revokeRefreshTokens(data.uid);
});
```

**Read claims client-side:**
```javascript
const tokenResult = await auth.currentUser.getIdTokenResult();
const role = tokenResult.claims.role; // "customer", "artist", etc.
```

### 4. Drupal Integration — Firebase JWT Bridge

To authenticate Firebase users in Drupal:

1. Install `firebase_auth` Drupal module or implement custom JWT validation.
2. Drupal middleware validates Firebase ID token on each API request:

```php
// In Drupal authentication provider
public function authenticate(Request $request): ?AccountInterface {
  $authHeader = $request->headers->get('Authorization');
  $idToken = substr($authHeader, 7); // Remove "Bearer "
  
  $verifiedToken = $this->firebaseJwt->verifyIdToken($idToken);
  $firebaseUid = $verifiedToken->claims()->get('sub');
  $drupalUid = $verifiedToken->claims()->get('drupal_uid');
  
  return $this->entityTypeManager
    ->getStorage('user')
    ->load($drupalUid);
}
```

3. Link accounts on first login: create or find Drupal user by email; store `drupal_uid` back as custom claim.

### 5. Firestore Security Rules (Auth-Based)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users can only read/write their own profile
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Products: public read, admin write only
    match /products/{productId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.token.role == 'admin';
    }
    
    // Artist portfolios: artist can edit own, public read
    match /portfolios/{artistId} {
      allow read: if true;
      allow write: if request.auth != null && 
        (request.auth.uid == artistId || request.auth.token.role == 'admin');
    }
    
    // Orders: user reads own orders only
    match /orders/{orderId} {
      allow read: if request.auth != null && 
        request.auth.uid == resource.data.userId;
      allow create: if request.auth != null;
      allow update, delete: if request.auth.token.role == 'admin';
    }
  }
}
```

### 6. MFA Setup

```javascript
import { multiFactor, PhoneAuthProvider, PhoneMultiFactorGenerator } from 'firebase/auth';

// Enroll phone as second factor
async function enrollMFA(phoneNumber, recaptchaVerifier) {
  const multiFactorSession = await multiFactor(auth.currentUser).getSession();
  const phoneInfoOptions = { phoneNumber, session: multiFactorSession };
  const provider = new PhoneAuthProvider(auth);
  const verificationId = await provider.verifyPhoneNumber(phoneInfoOptions, recaptchaVerifier);
  // Prompt user for SMS code, then:
  const cred = PhoneMultiFactorGenerator.assertion(
    PhoneAuthProvider.credential(verificationId, smsCode)
  );
  await multiFactor(auth.currentUser).enroll(cred, 'Phone');
}
```

### 7. Troubleshooting Guide

| Error | Cause | Fix |
|---|---|---|
| `auth/invalid-email` | Malformed email | Validate email format before submission |
| `auth/email-already-in-use` | Duplicate registration | Show "sign in instead" option; check providers |
| `auth/wrong-password` | Incorrect credentials | Rate-limit and show generic error after 3 tries |
| `auth/id-token-expired` | Token not refreshed | Call `getIdToken(true)` before API request |
| `auth/insufficient-permission` | Custom claim not set | Verify Cloud Function set claims; revoke+refresh token |
| `PERMISSION_DENIED` (Firestore) | Rule mismatch | Check rule condition vs. actual token claims |

### 8. Auth Security Checklist

- [ ] Email verification required before account is fully activated
- [ ] Password minimum 10 characters enforced
- [ ] Rate limiting on login endpoint (Firebase default: 100 failed attempts/IP)
- [ ] Custom claims set server-side only (never from client)
- [ ] ID tokens validated server-side on every privileged API call
- [ ] Refresh tokens revoked when role is changed
- [ ] Audit log of role changes stored in Firestore `audit_log` collection
- [ ] MFA enforced for admin and artist roles
