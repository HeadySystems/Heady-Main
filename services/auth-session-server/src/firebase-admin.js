import * as admin from 'firebase-admin';
import pino from 'pino';

const PHI = 1.618033988749895;
const PSI = 1 / PHI;

const logger = pino();

let firebaseApp = null;
let firebaseAuth = null;

export function initializeFirebase() {
  try {
    const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const projectId = process.env.GCP_PROJECT || 'gen-lang-client-0920560496';

    if (!credentialsPath && !process.env.FIREBASE_CONFIG) {
      throw new Error(
        'GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_CONFIG environment variable is required',
      );
    }

    if (admin.apps.length > 0) {
      firebaseApp = admin.app();
    } else {
      const initConfig = {
        projectId,
      };

      if (credentialsPath) {
        const credentialModule = await import(`file://${credentialsPath}`, {
          assert: { type: 'json' },
        });
        initConfig.credential = admin.credential.cert(credentialModule.default);
      } else {
        initConfig.credential = admin.credential.applicationDefault();
      }

      firebaseApp = admin.initializeApp(initConfig);
    }

    firebaseAuth = admin.auth(firebaseApp);

    logger.info('Firebase Admin SDK initialized', {
      projectId,
      credentialsPath: credentialsPath ? 'configured' : 'using application default',
    });

    return firebaseApp;
  } catch (error) {
    logger.error('Failed to initialize Firebase Admin SDK:', error);
    throw error;
  }
}

export async function verifyIdToken(idToken) {
  try {
    if (!firebaseAuth) {
      throw new Error('Firebase not initialized. Call initializeFirebase() first.');
    }

    const decodedToken = await firebaseAuth.verifyIdToken(idToken, true);

    return {
      uid: decodedToken.uid,
      email: decodedToken.email || null,
      emailVerified: decodedToken.email_verified || false,
      displayName: decodedToken.name || null,
    };
  } catch (error) {
    logger.warn('Token verification failed:', {
      error: error.message,
      code: error.code,
    });
    throw error;
  }
}

export async function createSessionCookie(idToken, expirationMs) {
  try {
    if (!firebaseAuth) {
      throw new Error('Firebase not initialized. Call initializeFirebase() first.');
    }

    const sessionCookie = await firebaseAuth.createSessionCookie(idToken, {
      expiresIn: expirationMs,
    });

    return sessionCookie;
  } catch (error) {
    logger.error('Failed to create session cookie:', error);
    throw error;
  }
}

export async function verifySessionCookie(sessionCookie, checkRevoked = true) {
  try {
    if (!firebaseAuth) {
      throw new Error('Firebase not initialized. Call initializeFirebase() first.');
    }

    const decodedClaims = await firebaseAuth.verifySessionCookie(sessionCookie, checkRevoked);

    return {
      uid: decodedClaims.uid,
      email: decodedClaims.email || null,
      emailVerified: decodedClaims.email_verified || false,
      displayName: decodedClaims.name || null,
    };
  } catch (error) {
    logger.warn('Session cookie verification failed:', {
      error: error.message,
      code: error.code,
    });
    throw error;
  }
}

export async function revokeToken(uid) {
  try {
    if (!firebaseAuth) {
      throw new Error('Firebase not initialized. Call initializeFirebase() first.');
    }

    await firebaseAuth.revokeRefreshTokens(uid);

    logger.info('Tokens revoked', { uid });
  } catch (error) {
    logger.error('Failed to revoke tokens:', error);
    throw error;
  }
}

export async function getUserInfo(uid) {
  try {
    if (!firebaseAuth) {
      throw new Error('Firebase not initialized. Call initializeFirebase() first.');
    }

    const user = await firebaseAuth.getUser(uid);

    return {
      uid: user.uid,
      email: user.email || null,
      emailVerified: user.emailVerified,
      displayName: user.displayName || null,
      photoURL: user.photoURL || null,
      disabled: user.disabled,
      createdAt: user.metadata?.createdAt?.toISOString() || null,
      lastSignInTime: user.metadata?.lastSignInTime?.toISOString() || null,
    };
  } catch (error) {
    logger.warn('Failed to get user info:', error);
    throw error;
  }
}

export function getFirebaseAuth() {
  return firebaseAuth;
}

export function getFirebaseApp() {
  return firebaseApp;
}
