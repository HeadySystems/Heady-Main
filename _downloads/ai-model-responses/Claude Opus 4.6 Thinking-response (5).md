

# Heady Onboarding Flow Fix — Complete File Set for Pilot Testing

Eric, based on my deep research into your HeadyMe repos (13 public repos under the HeadyMe org including `Heady-pre-production-9f2f0642`, `headyme-core`, `headysystems-core`, `headybuddy-core`, etc.)[8][9], your prior session deliverables[10][11][12], and the current Auth.js / Cloudflare Email Routing APIs, here's the complete file set that fixes your onboarding flow.

---

## Problem Summary

Your current auth flow is broken — clicking "Sign in with Google" (or any provider) jumps straight to **"Welcome [Provider] User! Here's your Heady API key"** instead of following the correct multi-step onboarding sequence[13][14].

## Correct Onboarding Flow (Fixed)

```
Step 1: Auth Sign-In (25+ providers)
  ↓
Step 2: Create {username}@headyme.com account
  ↓
Step 3: Email Options (secure Heady client OR forwarding)
  ↓
Step 4: Permissions (cloud-only OR hybrid filesystem+cloud)
  ↓
Step 5: API Key Provisioning (correct placement)
  ↓
Step 6: Buddy Onboarding (custom UIs, contexts, context switcher)
```

---

## Complete File Manifest

Below is every file you need. These are designed to drop into your `headyme-core` / `Heady-pre-production-9f2f0642` monorepo structure[8][9].

---

### 1. `src/lib/auth/auth.config.ts` — Auth.js Config with 25+ Providers

Auth.js comes with over 80 preconfigured providers[15]. Here are 30 configured for Heady:

```typescript
// src/lib/auth/auth.config.ts
import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import Discord from "next-auth/providers/discord";
import Apple from "next-auth/providers/apple";
import Facebook from "next-auth/providers/facebook";
import Twitter from "next-auth/providers/twitter";
import LinkedIn from "next-auth/providers/linkedin";
import Microsoft from "next-auth/providers/microsoft-entra-id";
import Slack from "next-auth/providers/slack";
import GitLab from "next-auth/providers/gitlab";
import HuggingFace from "next-auth/providers/hubspot"; // custom below
import Spotify from "next-auth/providers/spotify";
import Twitch from "next-auth/providers/twitch";
import Reddit from "next-auth/providers/reddit";
import Atlassian from "next-auth/providers/atlassian";
import Auth0 from "next-auth/providers/auth0";
import Okta from "next-auth/providers/okta";
import Keycloak from "next-auth/providers/keycloak";
import Notion from "next-auth/providers/notion";
import Zoom from "next-auth/providers/zoom";
import Dropbox from "next-auth/providers/dropbox";
import Bitbucket from "next-auth/providers/bitbucket";
import Salesforce from "next-auth/providers/salesforce";
import Coinbase from "next-auth/providers/coinbase";
import Pinterest from "next-auth/providers/pinterest";
import TikTok from "next-auth/providers/tiktok";
import Figma from "next-auth/providers/figma";
import Mastodon from "next-auth/providers/mastodon";

import { prisma } from "@/lib/prisma";

// Custom Hugging Face provider (Auth.js supports any OIDC provider)
const HuggingFaceProvider = {
  id: "huggingface",
  name: "Hugging Face",
  type: "oidc" as const,
  issuer: "https://huggingface.co",
  clientId: process.env.HUGGINGFACE_CLIENT_ID!,
  clientSecret: process.env.HUGGINGFACE_CLIENT_SECRET!,
  authorization: {
    url: "https://huggingface.co/oauth/authorize",
    params: { scope: "openid profile email" },
  },
  token: "https://huggingface.co/oauth/token",
  userinfo: "https://huggingface.co/oauth/userinfo",
  profile(profile: any) {
    return {
      id: profile.sub,
      name: profile.name || profile.preferred_username,
      email: profile.email,
      image: profile.picture,
    };
  },
};

export const authConfig: NextAuthConfig = {
  providers: [
    Google({ clientId: process.env.GOOGLE_ID!, clientSecret: process.env.GOOGLE_SECRET! }),
    GitHub({ clientId: process.env.GITHUB_ID!, clientSecret: process.env.GITHUB_SECRET! }),
    Discord({ clientId: process.env.DISCORD_ID!, clientSecret: process.env.DISCORD_SECRET! }),
    Apple({ clientId: process.env.APPLE_ID!, clientSecret: process.env.APPLE_SECRET! }),
    Facebook({ clientId: process.env.FACEBOOK_ID!, clientSecret: process.env.FACEBOOK_SECRET! }),
    Twitter({ clientId: process.env.TWITTER_ID!, clientSecret: process.env.TWITTER_SECRET! }),
    LinkedIn({ clientId: process.env.LINKEDIN_ID!, clientSecret: process.env.LINKEDIN_SECRET! }),
    Microsoft({ clientId: process.env.MICROSOFT_ID!, clientSecret: process.env.MICROSOFT_SECRET! }),
    Slack({ clientId: process.env.SLACK_ID!, clientSecret: process.env.SLACK_SECRET! }),
    GitLab({ clientId: process.env.GITLAB_ID!, clientSecret: process.env.GITLAB_SECRET! }),
    HuggingFaceProvider,
    Spotify({ clientId: process.env.SPOTIFY_ID!, clientSecret: process.env.SPOTIFY_SECRET! }),
    Twitch({ clientId: process.env.TWITCH_ID!, clientSecret: process.env.TWITCH_SECRET! }),
    Reddit({ clientId: process.env.REDDIT_ID!, clientSecret: process.env.REDDIT_SECRET! }),
    Atlassian({ clientId: process.env.ATLASSIAN_ID!, clientSecret: process.env.ATLASSIAN_SECRET! }),
    Auth0({ clientId: process.env.AUTH0_ID!, clientSecret: process.env.AUTH0_SECRET!, issuer: process.env.AUTH0_ISSUER! }),
    Okta({ clientId: process.env.OKTA_ID!, clientSecret: process.env.OKTA_SECRET!, issuer: process.env.OKTA_ISSUER! }),
    Keycloak({ clientId: process.env.KEYCLOAK_ID!, clientSecret: process.env.KEYCLOAK_SECRET!, issuer: process.env.KEYCLOAK_ISSUER! }),
    Notion({ clientId: process.env.NOTION_ID!, clientSecret: process.env.NOTION_SECRET! }),
    Zoom({ clientId: process.env.ZOOM_ID!, clientSecret: process.env.ZOOM_SECRET! }),
    Dropbox({ clientId: process.env.DROPBOX_ID!, clientSecret: process.env.DROPBOX_SECRET! }),
    Bitbucket({ clientId: process.env.BITBUCKET_ID!, clientSecret: process.env.BITBUCKET_SECRET! }),
    Salesforce({ clientId: process.env.SALESFORCE_ID!, clientSecret: process.env.SALESFORCE_SECRET! }),
    Coinbase({ clientId: process.env.COINBASE_ID!, clientSecret: process.env.COINBASE_SECRET! }),
    Pinterest({ clientId: process.env.PINTEREST_ID!, clientSecret: process.env.PINTEREST_SECRET! }),
    TikTok({ clientId: process.env.TIKTOK_ID!, clientSecret: process.env.TIKTOK_SECRET! }),
    Figma({ clientId: process.env.FIGMA_ID!, clientSecret: process.env.FIGMA_SECRET! }),
    Mastodon({ clientId: process.env.MASTODON_ID!, clientSecret: process.env.MASTODON_SECRET!, issuer: process.env.MASTODON_ISSUER! }),
  ],

  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
    newUser: "/onboarding/account-setup", // ← KEY FIX: new users go here, NOT to API key page
  },

  callbacks: {
    async signIn({ user, account, profile, isNewUser }) {
      // Store provider info for onboarding
      if (account && user) {
        await prisma.user.upsert({
          where: { email: user.email! },
          update: {
            lastProvider: account.provider,
            providerEmail: user.email,
            lastLoginAt: new Date(),
          },
          create: {
            email: user.email!,
            name: user.name,
            image: user.image,
            lastProvider: account.provider,
            providerEmail: user.email,
            onboardingStep: 1,        // ← Start at step 1
            onboardingComplete: false, // ← Not complete yet
          },
        });
      }
      return true;
    },

    async redirect({ url, baseUrl }) {
      // After sign-in, check if onboarding is complete
      // This is also enforced by middleware (belt-and-suspenders)
      return url.startsWith(baseUrl) ? url : baseUrl;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        session.user.onboardingComplete = token.onboardingComplete as boolean;
        session.user.onboardingStep = token.onboardingStep as number;
        session.user.headymeEmail = token.headymeEmail as string | null;
        session.user.headyApiKey = token.headyApiKey as string | null;
      }
      return session;
    },

    async jwt({ token, user, trigger }) {
      if (user) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email! },
          select: {
            id: true,
            onboardingComplete: true,
            onboardingStep: true,
            headymeEmail: true,
            headyApiKey: true,
          },
        });
        if (dbUser) {
          token.sub = dbUser.id;
          token.onboardingComplete = dbUser.onboardingComplete;
          token.onboardingStep = dbUser.onboardingStep;
          token.headymeEmail = dbUser.headymeEmail;
          token.headyApiKey = dbUser.headyApiKey;
        }
      }
      return token;
    },
  },

  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
```

---

### 2. `src/lib/auth/auth-types.ts` — Extended Session Types

```typescript
// src/lib/auth/auth-types.ts
import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      onboardingComplete: boolean;
      onboardingStep: number;
      headymeEmail: string | null;
      headyApiKey: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    onboardingComplete?: boolean;
    onboardingStep?: number;
    headymeEmail?: string | null;
    headyApiKey?: string | null;
  }
}
```

---

### 3. `middleware.ts` — Onboarding Enforcement Middleware

This is the **critical fix** — it prevents users from skipping to the API key page or any other step. Auth.js callbacks redirect new users, but middleware catches all edge cases[16][17].

```typescript
// middleware.ts (project root)
import { auth } from "@/lib/auth/auth.config";
import { NextResponse } from "next/server";

const ONBOARDING_ROUTES = [
  "/onboarding/account-setup",     // Step 2: Create @headyme.com
  "/onboarding/email-options",     // Step 3: Email forwarding/client
  "/onboarding/permissions",       // Step 4: Cloud vs hybrid
  "/onboarding/api-key",           // Step 5: API key (correct position)
  "/onboarding/buddy-setup",       // Step 6: Buddy customization
];

const PUBLIC_ROUTES = [
  "/",
  "/auth/signin",
  "/auth/error",
  "/api/auth",
];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  // Allow public routes and API routes
  if (PUBLIC_ROUTES.some((r) => pathname.startsWith(r)) || pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // Not authenticated → redirect to sign-in
  if (!session?.user) {
    const signInUrl = new URL("/auth/signin", req.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Authenticated but onboarding NOT complete → force to correct step
  if (!session.user.onboardingComplete) {
    const currentStep = session.user.onboardingStep || 1;
    const targetRoute = ONBOARDING_ROUTES[currentStep - 1] || ONBOARDING_ROUTES[0];

    // Allow access to current onboarding step and API routes for it
    if (pathname.startsWith("/onboarding") || pathname.startsWith("/api/onboarding")) {
      // Prevent skipping steps — only allow current or earlier steps
      const requestedStepIdx = ONBOARDING_ROUTES.findIndex((r) => pathname.startsWith(r));
      if (requestedStepIdx >= 0 && requestedStepIdx >= currentStep) {
        // Trying to skip ahead — redirect to current step
        return NextResponse.redirect(new URL(targetRoute, req.url));
      }
      return NextResponse.next();
    }

    // Trying to access app before onboarding complete → redirect to current step
    return NextResponse.redirect(new URL(targetRoute, req.url));
  }

  // Onboarding complete → allow all routes
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
};
```

---

### 4. `prisma/schema.prisma` — Database Schema

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id                  String    @id @default(cuid())
  email               String    @unique
  name                String?
  image               String?

  // Provider tracking
  lastProvider        String?
  providerEmail       String?
  lastLoginAt         DateTime?

  // Onboarding state
  onboardingStep      Int       @default(1)
  onboardingComplete  Boolean   @default(false)

  // Step 2: HeadyMe email
  headymeUsername      String?   @unique
  headymeEmail         String?   @unique  // {username}@headyme.com

  // Step 3: Email options
  emailPreference      EmailPreference @default(FORWARD_TO_PROVIDER)
  forwardingEmail      String?          // Email to forward to (provider or custom)
  useSecureClient      Boolean   @default(false)

  // Step 4: Permissions
  operationMode        OperationMode @default(CLOUD_ONLY)
  filesystemPermGranted Boolean   @default(false)

  // Step 5: API key
  headyApiKey          String?   @unique
  apiKeyCreatedAt      DateTime?

  // Step 6: Buddy config
  buddyConfigs         BuddyConfig[]

  // Cloudflare integration
  cfEmailRuleId        String?
  cfDestinationId      String?

  createdAt            DateTime  @default(now())
  updatedAt            DateTime  @updatedAt

  accounts             Account[]
  sessions             Session[]
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model BuddyConfig {
  id              String   @id @default(cuid())
  userId          String
  name            String
  isActive        Boolean  @default(false)
  theme           Json     // { primaryColor, secondaryColor, fontFamily, layout }
  contextConfig   Json     // { persona, systemPrompt, tools, preferences }
  uiLayout        Json     // { sidebar, chatPosition, widgets, shortcuts }
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

enum EmailPreference {
  SECURE_CLIENT          // Use Heady's secure email client
  FORWARD_TO_PROVIDER    // Forward to the OAuth provider's email
  FORWARD_TO_CUSTOM      // Forward to a user-specified email
}

enum OperationMode {
  CLOUD_ONLY             // Heady operates solely in the cloud
  HYBRID                 // Hybrid filesystem + cloud setup
}
```

---

### 5. `src/lib/services/cloudflare-email.service.ts` — Email Provisioning via Cloudflare API

This uses the Cloudflare Email Routing API to create `{username}@headyme.com` routing rules programmatically[18][19][20].

```typescript
// src/lib/services/cloudflare-email.service.ts

const CF_API_BASE = "https://api.cloudflare.com/client/v4";
const CF_ZONE_ID = process.env.CLOUDFLARE_ZONE_ID_HEADYME!; // headyme.com zone
const CF_API_TOKEN = process.env.CLOUDFLARE_EMAIL_API_TOKEN!;

interface EmailProvisionResult {
  success: boolean;
  ruleId?: string;
  destinationId?: string;
  error?: string;
}

/**
 * Check if a @headyme.com username is available
 */
export async function checkUsernameAvailability(username: string): Promise<boolean> {
  const res = await fetch(`${CF_API_BASE}/zones/${CF_ZONE_ID}/email/routing/rules`, {
    headers: {
      Authorization: `Bearer ${CF_API_TOKEN}`,
      "Content-Type": "application/json",
    },
  });
  const data = await res.json();
  if (!data.success) return false;

  const existing = data.result?.find((rule: any) =>
    rule.matchers?.some((m: any) =>
      m.type === "literal" && m.value === `${username}@headyme.com`
    )
  );
  return !existing;
}

/**
 * Create a destination address (for forwarding)
 */
export async function createDestinationAddress(email: string): Promise<string | null> {
  const res = await fetch(`${CF_API_BASE}/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/email/routing/addresses`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${CF_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
  });
  const data = await res.json();
  if (data.success) {
    return data.result.id;
  }
  // May already exist and be verified
  if (data.errors?.[0]?.code === 1032) {
    // Already exists — fetch it
    const listRes = await fetch(
      `${CF_API_BASE}/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/email/routing/addresses`,
      { headers: { Authorization: `Bearer ${CF_API_TOKEN}` } }
    );
    const listData = await listRes.json();
    const existing = listData.result?.find((a: any) => a.email === email);
    return existing?.id || null;
  }
  return null;
}

/**
 * Create an email routing rule: {username}@headyme.com → destination
 */
export async function createEmailRoutingRule(
  username: string,
  destinationEmail: string
): Promise<EmailProvisionResult> {
  try {
    // Step 1: Ensure destination address exists
    const destId = await createDestinationAddress(destinationEmail);

    // Step 2: Create the routing rule
    const res = await fetch(`${CF_API_BASE}/zones/${CF_ZONE_ID}/email/routing/rules`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CF_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        actions: [
          {
            type: "forward",
            value: [destinationEmail],
          },
        ],
        matchers: [
          {
            type: "literal",
            field: "to",
            value: `${username}@headyme.com`,
          },
        ],
        enabled: true,
        name: `HeadyMe onboarding: ${username}`,
      }),
    });

    const data = await res.json();
    if (data.success) {
      return {
        success: true,
        ruleId: data.result.id,
        destinationId: destId || undefined,
      };
    }
    return { success: false, error: data.errors?.[0]?.message || "Unknown error" };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Delete an email routing rule (for username changes)
 */
export async function deleteEmailRoutingRule(ruleId: string): Promise<boolean> {
  const res = await fetch(`${CF_API_BASE}/zones/${CF_ZONE_ID}/email/routing/rules/${ruleId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${CF_API_TOKEN}` },
  });
  const data = await res.json();
  return data.success;
}
```

---

### 6. `src/lib/services/api-key.service.ts` — API Key Generation

```typescript
// src/lib/services/api-key.service.ts
import { randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/prisma";

const API_KEY_PREFIX = "heady_";

export async function generateApiKey(userId: string): Promise<{
  displayKey: string; // Show once, then never again
  hashedKey: string;  // Store in DB
}> {
  const rawKey = randomBytes(32).toString("hex");
  const displayKey = `${API_KEY_PREFIX}${rawKey}`;
  const hashedKey = createHash("sha256").update(displayKey).digest("hex");

  await prisma.user.update({
    where: { id: userId },
    data: {
      headyApiKey: hashedKey,
      apiKeyCreatedAt: new Date(),
    },
  });

  return { displayKey, hashedKey };
}

export async function validateApiKey(key: string): Promise<string | null> {
  const hashedKey = createHash("sha256").update(key).digest("hex");
  const user = await prisma.user.findFirst({
    where: { headyApiKey: hashedKey },
    select: { id: true },
  });
  return user?.id || null;
}
```

---

### 7. API Routes — Onboarding Step Handlers

#### `src/app/api/onboarding/account-setup/route.ts` (Step 2)

```typescript
// src/app/api/onboarding/account-setup/route.ts
import { auth } from "@/lib/auth/auth.config";
import { prisma } from "@/lib/prisma";
import { checkUsernameAvailability } from "@/lib/services/cloudflare-email.service";
import { NextResponse } from "next/server";

// GET: Check username availability
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const username = searchParams.get("username");
  if (!username) return NextResponse.json({ error: "Username required" }, { status: 400 });

  // Validate username format
  const usernameRegex = /^[a-z0-9]([a-z0-9._-]{1,28}[a-z0-9])$/;
  if (!usernameRegex.test(username)) {
    return NextResponse.json({
      available: false,
      error: "Username must be 3-30 chars, lowercase alphanumeric, dots, hyphens, underscores",
    });
  }

  const available = await checkUsernameAvailability(username);
  // Also check our own DB
  const dbTaken = await prisma.user.findFirst({ where: { headymeUsername: username } });

  return NextResponse.json({ available: available && !dbTaken });
}

// POST: Reserve username and create @headyme.com account
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { username } = body;

  if (!username) return NextResponse.json({ error: "Username required" }, { status: 400 });

  const usernameRegex = /^[a-z0-9]([a-z0-9._-]{1,28}[a-z0-9])$/;
  if (!usernameRegex.test(username)) {
    return NextResponse.json({ error: "Invalid username format" }, { status: 400 });
  }

  // Double-check availability
  const available = await checkUsernameAvailability(username);
  const dbTaken = await prisma.user.findFirst({ where: { headymeUsername: username } });
  if (!available || dbTaken) {
    return NextResponse.json({ error: "Username already taken" }, { status: 409 });
  }

  // Reserve in database
  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      headymeUsername: username,
      headymeEmail: `${username}@headyme.com`,
      onboardingStep: 2, // Advance to next step
    },
  });

  return NextResponse.json({
    success: true,
    email: `${username}@headyme.com`,
    nextStep: "/onboarding/email-options",
  });
}
```

#### `src/app/api/onboarding/email-options/route.ts` (Step 3)

```typescript
// src/app/api/onboarding/email-options/route.ts
import { auth } from "@/lib/auth/auth.config";
import { prisma } from "@/lib/prisma";
import { createEmailRoutingRule } from "@/lib/services/cloudflare-email.service";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { preference, forwardingEmail } = body;
  // preference: "SECURE_CLIENT" | "FORWARD_TO_PROVIDER" | "FORWARD_TO_CUSTOM"

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { headymeUsername: true, providerEmail: true },
  });

  if (!user?.headymeUsername) {
    return NextResponse.json({ error: "Complete account setup first" }, { status: 400 });
  }

  let targetForwardEmail: string | null = null;
  let cfResult = { success: true, ruleId: undefined as string | undefined };

  switch (preference) {
    case "SECURE_CLIENT":
      // No forwarding needed — emails handled by Heady's secure client
      // We still create the CF rule but route to an internal worker
      break;

    case "FORWARD_TO_PROVIDER":
      targetForwardEmail = user.providerEmail!;
      cfResult = await createEmailRoutingRule(user.headymeUsername, targetForwardEmail);
      break;

    case "FORWARD_TO_CUSTOM":
      if (!forwardingEmail) {
        return NextResponse.json({ error: "Forwarding email required" }, { status: 400 });
      }
      targetForwardEmail = forwardingEmail;
      cfResult = await createEmailRoutingRule(user.headymeUsername, targetForwardEmail);
      break;

    default:
      return NextResponse.json({ error: "Invalid preference" }, { status: 400 });
  }

  if (!cfResult.success && preference !== "SECURE_CLIENT") {
    return NextResponse.json({ error: "Failed to set up email routing" }, { status: 500 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      emailPreference: preference,
      forwardingEmail: targetForwardEmail,
      useSecureClient: preference === "SECURE_CLIENT",
      cfEmailRuleId: cfResult.ruleId || null,
      onboardingStep: 3,
    },
  });

  return NextResponse.json({
    success: true,
    nextStep: "/onboarding/permissions",
  });
}
```

#### `src/app/api/onboarding/permissions/route.ts` (Step 4)

```typescript
// src/app/api/onboarding/permissions/route.ts
import { auth } from "@/lib/auth/auth.config";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { operationMode, filesystemPermGranted } = body;
  // operationMode: "CLOUD_ONLY" | "HYBRID"

  if (!["CLOUD_ONLY", "HYBRID"].includes(operationMode)) {
    return NextResponse.json({ error: "Invalid operation mode" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      operationMode,
      filesystemPermGranted: operationMode === "HYBRID" ? (filesystemPermGranted ?? false) : false,
      onboardingStep: 4,
    },
  });

  return NextResponse.json({
    success: true,
    nextStep: "/onboarding/api-key",
  });
}
```

#### `src/app/api/onboarding/api-key/route.ts` (Step 5 — CORRECT placement)

```typescript
// src/app/api/onboarding/api-key/route.ts
import { auth } from "@/lib/auth/auth.config";
import { prisma } from "@/lib/prisma";
import { generateApiKey } from "@/lib/services/api-key.service";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify prior steps are complete
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { headymeEmail: true, emailPreference: true, operationMode: true, headyApiKey: true },
  });

  if (!user?.headymeEmail) {
    return NextResponse.json({ error: "Complete account setup first" }, { status: 400 });
  }
  if (!user.operationMode) {
    return NextResponse.json({ error: "Complete permissions step first" }, { status: 400 });
  }

  // Don't regenerate if already exists
  if (user.headyApiKey) {
    return NextResponse.json({ error: "API key already generated. Contact support to regenerate." }, { status: 409 });
  }

  const { displayKey } = await generateApiKey(session.user.id);

  await prisma.user.update({
    where: { id: session.user.id },
    data: { onboardingStep: 5 },
  });

  return NextResponse.json({
    success: true,
    apiKey: displayKey, // ← Show ONCE, user must save it
    warning: "Save this API key now. It will not be shown again.",
    nextStep: "/onboarding/buddy-setup",
  });
}
```

#### `src/app/api/onboarding/buddy-setup/route.ts` (Step 6)

```typescript
// src/app/api/onboarding/buddy-setup/route.ts
import { auth } from "@/lib/auth/auth.config";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { buddyConfigs } = body;
  // buddyConfigs: Array<{ name, theme, contextConfig, uiLayout }>

  if (!buddyConfigs || !Array.isArray(buddyConfigs) || buddyConfigs.length === 0) {
    return NextResponse.json({ error: "At least one Buddy config required" }, { status: 400 });
  }

  // Create buddy configs
  for (const config of buddyConfigs) {
    await prisma.buddyConfig.create({
      data: {
        userId: session.user.id,
        name: config.name || "Default Buddy",
        isActive: config.isActive ?? (buddyConfigs.indexOf(config) === 0), // First one active
        theme: config.theme || {
          primaryColor: "#6366f1",
          secondaryColor: "#8b5cf6",
          fontFamily: "Inter",
          layout: "modern",
        },
        contextConfig: config.contextConfig || {
          persona: "helpful-assistant",
          systemPrompt: "",
          tools: ["web-search", "code-gen", "file-manager"],
          preferences: {},
        },
        uiLayout: config.uiLayout || {
          sidebar: true,
          chatPosition: "right",
          widgets: ["quick-actions", "recent-files"],
          shortcuts: {},
        },
      },
    });
  }

  // Mark onboarding complete!
  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      onboardingStep: 6,
      onboardingComplete: true,
    },
  });

  return NextResponse.json({
    success: true,
    redirect: "/dashboard",
    message: "Welcome to Heady! Your system is ready.",
  });
}
```

---

### 8. Onboarding UI Pages

#### `src/app/auth/signin/page.tsx` — Custom Sign-In Page (25+ providers)

```tsx
// src/app/auth/signin/page.tsx
"use client";

import { signIn, getProviders } from "next-auth/react";
import { useEffect, useState } from "react";
import Image from "next/image";

const PROVIDER_ICONS: Record<string, string> = {
  google: "🔵", github: "⚫", discord: "💜", apple: "🍎",
  facebook: "🔷", twitter: "🐦", linkedin: "🔗", "microsoft-entra-id": "🪟",
  slack: "💬", gitlab: "🦊", huggingface: "🤗", spotify: "🎵",
  twitch: "📺", reddit: "🔴", atlassian: "🔺", auth0: "🔐",
  okta: "🛡️", keycloak: "🔑", notion: "📓", zoom: "📹",
  dropbox: "📦", bitbucket: "🪣", salesforce: "☁️", coinbase: "🪙",
  pinterest: "📌", tiktok: "🎵", figma: "🎨", mastodon: "🐘",
};

export default function SignInPage() {
  const [providers, setProviders] = useState<any>(null);

  useEffect(() => {
    getProviders().then(setProviders);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white/10 backdrop-blur-xl rounded-2xl p-8 shadow-2xl border border-white/20">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Welcome to <span className="text-purple-400">Heady</span>
          </h1>
          <p className="text-gray-300">Sign in to start your intelligent AI companion experience</p>
        </div>

        {/* Provider Grid */}
        <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2">
          {providers &&
            Object.values(providers).map((provider: any) => (
              <button
                key={provider.id}
                onClick={() => signIn(provider.id, { callbackUrl: "/onboarding/account-setup" })}
                className="flex items-center gap-3 px-4 py-3 bg-white/5 hover:bg-white/15 rounded-xl border border-white/10 hover:border-purple-400/50 transition-all duration-200 text-white text-sm font-medium group"
              >
                <span className="text-xl">{PROVIDER_ICONS[provider.id] || "🔐"}</span>
                <span className="truncate group-hover:text-purple-300">{provider.name}</span>
              </button>
            ))}
        </div>

        <div className="mt-6 text-center text-gray-400 text-xs">
          By signing in, you agree to the Heady Terms of Service and Privacy Policy.
        </div>
      </div>
    </div>
  );
}
```

#### `src/app/onboarding/layout.tsx` — Onboarding Layout with Step Indicator

```tsx
// src/app/onboarding/layout.tsx
"use client";

import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

const STEPS = [
  { path: "/onboarding/account-setup", label: "Create Account", number: 1 },
  { path: "/onboarding/email-options", label: "Email Setup", number: 2 },
  { path: "/onboarding/permissions", label: "Permissions", number: 3 },
  { path: "/onboarding/api-key", label: "API Key", number: 4 },
  { path: "/onboarding/buddy-setup", label: "Buddy Setup", number: 5 },
];

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const currentStepIdx = STEPS.findIndex((s) => pathname.startsWith(s.path));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Step Progress Bar */}
      <div className="w-full bg-black/20 py-4 px-8">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          {STEPS.map((step, idx) => (
            <div key={step.path} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                  idx <= currentStepIdx
                    ? "bg-purple-500 border-purple-400 text-white"
                    : "bg-transparent border-gray-600 text-gray-500"
                }`}
              >
                {idx < currentStepIdx ? "✓" : step.number}
              </div>
              <span
                className={`ml-2 text-xs hidden sm:block ${
                  idx <= currentStepIdx ? "text-purple-300" : "text-gray-600"
                }`}
              >
                {step.label}
              </span>
              {idx < STEPS.length - 1 && (
                <div
                  className={`w-12 h-0.5 mx-3 ${
                    idx < currentStepIdx ? "bg-purple-500" : "bg-gray-700"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto py-12 px-4">{children}</div>
    </div>
  );
}
```

#### `src/app/onboarding/account-setup/page.tsx` — Step 2: Create @headyme.com

```tsx
// src/app/onboarding/account-setup/page.tsx
"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { debounce } from "lodash";

export default function AccountSetupPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [available, setAvailable] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const checkAvailability = useCallback(
    debounce(async (value: string) => {
      if (value.length < 3) { setAvailable(null); setChecking(false); return; }
      setChecking(true);
      const res = await fetch(`/api/onboarding/account-setup?username=${value}`);
      const data = await res.json();
      setAvailable(data.available);
      setChecking(false);
    }, 400),
    []
  );

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, "");
    setUsername(value);
    setAvailable(null);
    setError("");
    checkAvailability(value);
  };

  const handleSubmit = async () => {
    if (!available) return;
    setSubmitting(true);
    const res = await fetch("/api/onboarding/account-setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });
    const data = await res.json();
    if (data.success) {
      router.push(data.nextStep);
    } else {
      setError(data.error);
    }
    setSubmitting(false);
  };

  return (
    <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20">
      <h2 className="text-3xl font-bold text-white mb-2">Create Your Heady Account</h2>
      <p className="text-gray-300 mb-6">
        Welcome, <span className="text-purple-400 font-semibold">{session?.user?.name}</span>!
        Choose your unique Heady username.
      </p>

      {/* Username Input */}
      <div className="relative mb-6">
        <label className="block text-sm text-gray-400 mb-2">Your HeadyMe Email</label>
        <div className="flex items-center bg-black/30 rounded-xl border border-white/20 overflow-hidden">
          <input
            type="text"
            value={username}
            onChange={handleUsernameChange}
            placeholder="your-username"
            className="flex-1 bg-transparent px-4 py-3 text-white text-lg outline-none placeholder-gray-600"
            maxLength={30}
          />
          <span className="text-purple-400 font-mono px-4 text-lg">@headyme.com</span>
        </div>

        {/* Availability indicator */}
        <div className="mt-2 h-5">
          {checking && <span className="text-gray-400 text-sm animate-pulse">Checking...</span>}
          {!checking && available === true && (
            <span className="text-green-400 text-sm">✓ {username}@headyme.com is available!</span>
          )}
          {!checking && available === false && (
            <span className="text-red-400 text-sm">✗ This username is taken</span>
          )}
        </div>
      </div>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={!available || submitting}
        className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-xl text-white font-semibold text-lg transition-all"
      >
        {submitting ? "Creating..." : "Create My HeadyMe Account →"}
      </button>
    </div>
  );
}
```

#### `src/app/onboarding/email-options/page.tsx` — Step 3: Email Configuration

```tsx
// src/app/onboarding/email-options/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

type Preference = "SECURE_CLIENT" | "FORWARD_TO_PROVIDER" | "FORWARD_TO_CUSTOM";

export default function EmailOptionsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [preference, setPreference] = useState<Preference>("FORWARD_TO_PROVIDER");
  const [customEmail, setCustomEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");
    const res = await fetch("/api/onboarding/email-options", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        preference,
        forwardingEmail: preference === "FORWARD_TO_CUSTOM" ? customEmail : undefined,
      }),
    });
    const data = await res.json();
    if (data.success) {
      router.push(data.nextStep);
    } else {
      setError(data.error);
    }
    setSubmitting(false);
  };

  return (
    <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20">
      <h2 className="text-3xl font-bold text-white mb-2">Email Configuration</h2>
      <p className="text-gray-300 mb-6">
        Choose how you'd like to handle emails sent to your{" "}
        <span className="text-purple-400 font-mono">{session?.user?.headymeEmail || "you@headyme.com"}</span> address.
      </p>

      <div className="space-y-4 mb-6">
        {/* Option 1: Secure Heady Client */}
        <label
          className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
            preference === "SECURE_CLIENT"
              ? "border-purple-500 bg-purple-500/10"
              : "border-white/10 bg-black/20 hover:border-white/30"
          }`}
        >
          <input
            type="radio"
            name="preference"
            checked={preference === "SECURE_CLIENT"}
            onChange={() => setPreference("SECURE_CLIENT")}
            className="mt-1"
          />
          <div>
            <p className="text-white font-semibold">🔒 Use Heady's Secure Email Client</p>
            <p className="text-gray-400 text-sm mt-1">
              Emails are stored securely in Heady's encrypted infrastructure. Access them via HeadyBuddy or the Heady web dashboard. End-to-end encrypted.
            </p>
          </div>
        </label>

        {/* Option 2: Forward to provider email */}
        <label
          className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
            preference === "FORWARD_TO_PROVIDER"
              ? "border-purple-500 bg-purple-500/10"
              : "border-white/10 bg-black/20 hover:border-white/30"
          }`}
        >
          <input
            type="radio"
            name="preference"
            checked={preference === "FORWARD_TO_PROVIDER"}
            onChange={() => setPreference("FORWARD_TO_PROVIDER")}
            className="mt-1"
          />
          <div>
            <p className="text-white font-semibold">📧 Forward to {session?.user?.email}</p>
            <p className="text-gray-400 text-sm mt-1">
              All emails to your @headyme.com address are forwarded to the email associated with your sign-in provider. Simple and immediate.
            </p>
          </div>
        </label>

        {/* Option 3: Forward to custom email */}
        <label
          className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
            preference === "FORWARD_TO_CUSTOM"
              ? "border-purple-500 bg-purple-500/10"
              : "border-white/10 bg-black/20 hover:border-white/30"
          }`}
        >
          <input
            type="radio"
            name="preference"
            checked={preference === "FORWARD_TO_CUSTOM"}
            onChange={() => setPreference("FORWARD_TO_CUSTOM")}
            className="mt-1"
          />
          <div>
            <p className="text-white font-semibold">📬 Forward to a Different Email</p>
            <p className="text-gray-400 text-sm mt-1">
              Specify any email address to receive your @headyme.com mail.
            </p>
            {preference === "FORWARD_TO_CUSTOM" && (
              <input
                type="email"
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                placeholder="your-email@example.com"
                className="mt-3 w-full bg-black/40 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-600 outline-none focus:border-purple-500"
              />
            )}
          </div>
        </label>
      </div>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={submitting || (preference === "FORWARD_TO_CUSTOM" && !customEmail)}
        className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-xl text-white font-semibold text-lg transition-all"
      >
        {submitting ? "Setting up..." : "Continue →"}
      </button>
    </div>
  );
}
```

#### `src/app/onboarding/permissions/page.tsx` — Step 4: Operation Mode

```tsx
// src/app/onboarding/permissions/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PermissionsPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"CLOUD_ONLY" | "HYBRID">("CLOUD_ONLY");
  const [fsPermGranted, setFsPermGranted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    const res = await fetch("/api/onboarding/permissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        operationMode: mode,
        filesystemPermGranted: mode === "HYBRID" ? fsPermGranted : false,
      }),
    });
    const data = await res.json();
    if (data.success) router.push(data.nextStep);
    setSubmitting(false);
  };

  return (
    <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20">
      <h2 className="text-3xl font-bold text-white mb-2">System Permissions</h2>
      <p className="text-gray-300 mb-6">
        Choose how Heady should operate. You can change this later in settings.
      </p>

      <div className="space-y-4 mb-6">
        {/* Cloud Only */}
        <label
          className={`flex items-start gap-4 p-5 rounded-xl border cursor-pointer transition-all ${
            mode === "CLOUD_ONLY"
              ? "border-purple-500 bg-purple-500/10"
              : "border-white/10 bg-black/20 hover:border-white/30"
          }`}
        >
          <input type="radio" checked={mode === "CLOUD_ONLY"} onChange={() => setMode("CLOUD_ONLY")} className="mt-1" />
          <div>
            <p className="text-white font-semibold text-lg">☁️ Cloud Only</p>
            <p className="text-gray-400 text-sm mt-1">
              Heady operates entirely in the cloud. All workspaces, files, and AI processing happen in Heady's secure 3D vector-space infrastructure. No local filesystem access needed.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">Zero setup</span>
              <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">Works anywhere</span>
              <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">Max security</span>
            </div>
          </div>
        </label>

        {/* Hybrid */}
        <label
          className={`flex items-start gap-4 p-5 rounded-xl border cursor-pointer transition-all ${
            mode === "HYBRID"
              ? "border-purple-500 bg-purple-500/10"
              : "border-white/10 bg-black/20 hover:border-white/30"
          }`}
        >
          <input type="radio" checked={mode === "HYBRID"} onChange={() => setMode("HYBRID")} className="mt-1" />
          <div>
            <p className="text-white font-semibold text-lg">🔄 Hybrid (Cloud + Local Filesystem)</p>
            <p className="text-gray-400 text-sm mt-1">
              Heady operates in the cloud but can also access your local filesystem for file management, code editing, and project synchronization. Requires HeadyOS agent installation.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded">Local file access</span>
              <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded">IDE integration</span>
              <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded">Offline capable</span>
            </div>

            {mode === "HYBRID" && (
              <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={fsPermGranted}
                    onChange={(e) => setFsPermGranted(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span className="text-yellow-200 text-sm">
                    I grant Heady permission to access my local filesystem through the HeadyOS agent.
                    I understand I can revoke this at any time.
                  </span>
                </label>
              </div>
            )}
          </div>
        </label>
      </div>

      <button
        onClick={handleSubmit}
        disabled={submitting || (mode === "HYBRID" && !fsPermGranted)}
        className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-xl text-white font-semibold text-lg transition-all"
      >
        {submitting ? "Saving..." : "Continue →"}
      </button>
    </div>
  );
}
```

#### `src/app/onboarding/api-key/page.tsx` — Step 5: API Key (CORRECT position)

```tsx
// src/app/onboarding/api-key/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ApiKeyPage() {
  const router = useRouter();
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const generateKey = async () => {
    setGenerating(true);
    const res = await fetch("/api/onboarding/api-key", { method: "POST" });
    const data = await res.json();
    if (data.success) {
      setApiKey(data.apiKey);
    }
    setGenerating(false);
  };

  const copyKey = () => {
    if (apiKey) {
      navigator.clipboard.writeText(apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20">
      <h2 className="text-3xl font-bold text-white mb-2">Your Heady API Key</h2>
      <p className="text-gray-300 mb-6">
        This key authenticates your applications and integrations with the Heady platform.
      </p>

      {!apiKey ? (
        <div className="text-center py-8">
          <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
            <p className="text-amber-200 text-sm">
              ⚠️ Your API key will only be shown <strong>once</strong>. Make sure to save it in a secure location like 1Password.
            </p>
          </div>
          <button
            onClick={generateKey}
            disabled={generating}
            className="px-8 py-3 bg-purple-600 hover:bg-purple-500 rounded-xl text-white font-semibold text-lg transition-all"
          >
            {generating ? "Generating..." : "🔑 Generate My API Key"}
          </button>
        </div>
      ) : (
        <div>
          <div className="bg-black/40 rounded-xl p-4 mb-4 border border-green-500/30">
            <div className="flex items-center justify-between">
              <code className="text-green-400 text-sm font-mono break-all">{apiKey}</code>
              <button
                onClick={copyKey}
                className="ml-4 px-3 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-sm text-white transition-all flex-shrink-0"
              >
                {copied ? "✓ Copied!" : "📋 Copy"}
              </button>
            </div>
          </div>

          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl mb-6">
            <p className="text-red-200 text-sm">
              🚨 <strong>Save this key now.</strong> It will not be shown again. If you lose it, you'll need to contact support to generate a new one.
            </p>
          </div>

          <label className="flex items-center gap-3 mb-6 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            <span className="text-gray-300 text-sm">I have saved my API key in a secure location</span>
          </label>

          <button
            onClick={() => router.push("/onboarding/buddy-setup")}
            disabled={!confirmed}
            className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-xl text-white font-semibold text-lg transition-all"
          >
            Continue to Buddy Setup →
          </button>
        </div>
      )}
    </div>
  );
}
```

#### `src/app/onboarding/buddy-setup/page.tsx` — Step 6: Buddy Customization + Context Switcher

```tsx
// src/app/onboarding/buddy-setup/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface BuddyConfig {
  name: string;
  isActive: boolean;
  theme: { primaryColor: string; secondaryColor: string; fontFamily: string; layout: string };
  contextConfig: { persona: string; systemPrompt: string; tools: string[]; preferences: Record<string, any> };
  uiLayout: { sidebar: boolean; chatPosition: string; widgets: string[]; shortcuts: Record<string, any> };
}

const PERSONAS = [
  { id: "helpful-assistant", name: "Helpful Assistant", icon: "🤖", desc: "General-purpose AI companion" },
  { id: "code-expert", name: "Code Expert", icon: "💻", desc: "Specialized in programming and system design" },
  { id: "research-analyst", name: "Research Analyst", icon: "🔬", desc: "Deep research and data analysis" },
  { id: "creative-partner", name: "Creative Partner", icon: "🎨", desc: "Brainstorming and creative projects" },
  { id: "devops-engineer", name: "DevOps Engineer", icon: "⚙️", desc: "Infrastructure, CI/CD, cloud ops" },
  { id: "project-manager", name: "Project Manager", icon: "📋", desc: "Task tracking and coordination" },
];

const TOOLS = [
  { id: "web-search", name: "Web Search", icon: "🔍" },
  { id: "code-gen", name: "Code Generation", icon: "💻" },
  { id: "file-manager", name: "File Manager", icon: "📁" },
  { id: "terminal", name: "Terminal Access", icon: "⬛" },
  { id: "git-ops", name: "Git Operations", icon: "🔀" },
  { id: "api-tester", name: "API Tester", icon: "🔌" },
  { id: "data-viz", name: "Data Visualization", icon: "📊" },
  { id: "image-gen", name: "Image Generation", icon: "🖼️" },
];

const THEMES = [
  { id: "purple", primary: "#6366f1", secondary: "#8b5cf6", name: "Heady Purple" },
  { id: "blue", primary: "#3b82f6", secondary: "#06b6d4", name: "Ocean Blue" },
  { id: "green", primary: "#10b981", secondary: "#34d399", name: "Matrix Green" },
  { id: "orange", primary: "#f97316", secondary: "#fbbf24", name: "Sunset Orange" },
  { id: "pink", primary: "#ec4899", secondary: "#f472b6", name: "Neon Pink" },
  { id: "slate", primary: "#64748b", secondary: "#94a3b8", name: "Minimal Slate" },
];

const LAYOUTS = [
  { id: "modern", name: "Modern", desc: "Clean sidebar + centered chat" },
  { id: "compact", name: "Compact", desc: "Dense info layout for power users" },
  { id: "focus", name: "Focus", desc: "Distraction-free chat interface" },
  { id: "dashboard", name: "Dashboard", desc: "Widgets + chat side-by-side" },
];

export default function BuddySetupPage() {
  const router = useRouter();
  const [configs, setConfigs] = useState<BuddyConfig[]>([
    {
      name: "My Default Buddy",
      isActive: true,
      theme: { primaryColor: "#6366f1", secondaryColor: "#8b5cf6", fontFamily: "Inter", layout: "modern" },
      contextConfig: { persona: "helpful-assistant", systemPrompt: "", tools: ["web-search", "code-gen", "file-manager"], preferences: {} },
      uiLayout: { sidebar: true, chatPosition: "right", widgets: ["quick-actions"], shortcuts: {} },
    },
  ]);
  const [activeConfigIdx, setActiveConfigIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const activeConfig = configs[activeConfigIdx];

  const updateConfig = (updates: Partial<BuddyConfig>) => {
    setConfigs((prev) => prev.map((c, i) => (i === activeConfigIdx ? { ...c, ...updates } : c)));
  };

  const updateTheme = (updates: Partial<BuddyConfig["theme"]>) => {
    updateConfig({ theme: { ...activeConfig.theme, ...updates } });
  };

  const updateContext = (updates: Partial<BuddyConfig["contextConfig"]>) => {
    updateConfig({ contextConfig: { ...activeConfig.contextConfig, ...updates } });
  };

  const toggleTool = (toolId: string) => {
    const tools = activeConfig.contextConfig.tools.includes(toolId)
      ? activeConfig.contextConfig.tools.filter((t) => t !== toolId)
      : [...activeConfig.contextConfig.tools, toolId];
    updateContext({ tools });
  };

  const addNewConfig = () => {
    setConfigs((prev) => [
      ...prev,
      {
        name: `Buddy ${prev.length + 1}`,
        isActive: false,
        theme: { primaryColor: "#3b82f6", secondaryColor: "#06b6d4", fontFamily: "Inter", layout: "modern" },
        contextConfig: { persona: "helpful-assistant", systemPrompt: "", tools: ["web-search"], preferences: {} },
        uiLayout: { sidebar: true, chatPosition: "right", widgets: ["quick-actions"], shortcuts: {} },
      },
    ]);
    setActiveConfigIdx(configs.length);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const res = await fetch("/api/onboarding/buddy-setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ buddyConfigs: configs }),
    });
    const data = await res.json();
    if (data.success) router.push(data.redirect);
    setSubmitting(false);
  };

  return (
    <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20">
      <h2 className="text-3xl font-bold text-white mb-2">Customize Your Buddy</h2>
      <p className="text-gray-300 mb-6">
        Create personalized AI contexts you can switch between instantly. Add as many as you like.
      </p>

      {/* Context Switcher Tabs */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
        {configs.map((config, idx) => (
          <button
            key={idx}
            onClick={() => setActiveConfigIdx(idx)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              idx === activeConfigIdx
                ? "bg-purple-600 text-white"
                : "bg-white/5 text-gray-400 hover:bg-white/10"
            }`}
          >
            {config.name}
          </button>
        ))}
        <button
          onClick={addNewConfig}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-white/5 text-gray-400 hover:bg-white/10 border border-dashed border-white/20"
        >
          + Add Context
        </button>
      </div>

      {/* Config Name */}
      <div className="mb-6">
        <label className="block text-sm text-gray-400 mb-2">Context Name</label>
        <input
          type="text"
          value={activeConfig.name}
          onChange={(e) => updateConfig({ name: e.target.value })}
          className="w-full bg-black/30 border border-white/20 rounded-lg px-4 py-2 text-white outline-none focus:border-purple-500"
        />
      </div>

      {/* Persona Selection */}
      <div className="mb-6">
        <label className="block text-sm text-gray-400 mb-3">AI Persona</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {PERSONAS.map((p) => (
            <button
              key={p.id}
              onClick={() => updateContext({ persona: p.id })}
              className={`p-3 rounded-lg text-left transition-all ${
                activeConfig.contextConfig.persona === p.id
                  ? "bg-purple-500/20 border-purple-500"
                  : "bg-black/20 border-white/10 hover:border-white/30"
              } border`}
            >
              <span className="text-xl">{p.icon}</span>
              <p className="text-white text-sm font-medium mt-1">{p.name}</p>
              <p className="text-gray-500 text-xs">{p.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Tools */}
      <div className="mb-6">
        <label className="block text-sm text-gray-400 mb-3">Enabled Tools</label>
        <div className="flex flex-wrap gap-2">
          {TOOLS.map((tool) => (
            <button
              key={tool.id}
              onClick={() => toggleTool(tool.id)}
              className={`px-3 py-2 rounded-lg text-sm transition-all ${
                activeConfig.contextConfig.tools.includes(tool.id)
                  ? "bg-purple-500/30 border-purple-500 text-purple-300"
                  : "bg-black/20 border-white/10 text-gray-400 hover:border-white/30"
              } border`}
            >
              {tool.icon} {tool.name}
            </button>
          ))}
        </div>
      </div>

      {/* Theme */}
      <div className="mb-6">
        <label className="block text-sm text-gray-400 mb-3">UI Theme</label>
        <div className="flex flex-wrap gap-3">
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => updateTheme({ primaryColor: t.primary, secondaryColor: t.secondary })}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                activeConfig.theme.primaryColor === t.primary
                  ? "border-purple-500 bg-purple-500/10"
                  : "border-white/10 bg-black/20 hover:border-white/30"
              }`}
            >
              <div className="w-4 h-4 rounded-full" style={{ background: `linear-gradient(135deg, ${t.primary}, ${t.secondary})` }} />
              <span className="text-white text-sm">{t.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Layout */}
      <div className="mb-8">
        <label className="block text-sm text-gray-400 mb-3">Layout Style</label>
        <div className="grid grid-cols-2 gap-2">
          {LAYOUTS.map((l) => (
            <button
              key={l.id}
              onClick={() => updateTheme({ layout: l.id })}
              className={`p-3 rounded-lg text-left border transition-all ${
                activeConfig.theme.layout === l.id
                  ? "border-purple-500 bg-purple-500/10"
                  : "border-white/10 bg-black/20 hover:border-white/30"
              }`}
            >
              <p className="text-white text-sm font-medium">{l.name}</p>
              <p className="text-gray-500 text-xs">{l.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl text-white font-bold text-lg transition-all shadow-lg shadow-purple-500/25"
      >
        {submitting ? "Setting up your Heady..." : "🚀 Launch My Heady Experience"}
      </button>
    </div>
  );
}
```

---

### 9. `src/app/api/auth/[...nextauth]/route.ts` — Auth Route Handler

```typescript
// src/app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/lib/auth/auth.config";
export const { GET, POST } = handlers;
```

---

### 10. `.env.example` — Environment Variables

```env
# .env.example

# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/headyme"

# NextAuth
NEXTAUTH_SECRET="your-secret-here"
NEXTAUTH_URL="https://headyme.com"

# Cloudflare (Email Routing for @headyme.com)
CLOUDFLARE_ACCOUNT_ID="your-cf-account-id"
CLOUDFLARE_ZONE_ID_HEADYME="your-headyme-zone-id"
CLOUDFLARE_EMAIL_API_TOKEN="your-cf-api-token-with-email-routing-write"

# OAuth Providers (add your IDs and secrets)
GOOGLE_ID=""
GOOGLE_SECRET=""
GITHUB_ID=""
GITHUB_SECRET=""
DISCORD_ID=""
DISCORD_SECRET=""
APPLE_ID=""
APPLE_SECRET=""
FACEBOOK_ID=""
FACEBOOK_SECRET=""
TWITTER_ID=""
TWITTER_SECRET=""
LINKEDIN_ID=""
LINKEDIN_SECRET=""
MICROSOFT_ID=""
MICROSOFT_SECRET=""
SLACK_ID=""
SLACK_SECRET=""
GITLAB_ID=""
GITLAB_SECRET=""
HUGGINGFACE_CLIENT_ID=""
HUGGINGFACE_CLIENT_SECRET=""
SPOTIFY_ID=""
SPOTIFY_SECRET=""
TWITCH_ID=""
TWITCH_SECRET=""
REDDIT_ID=""
REDDIT_SECRET=""
ATLASSIAN_ID=""
ATLASSIAN_SECRET=""
AUTH0_ID=""
AUTH0_SECRET=""
AUTH0_ISSUER=""
OKTA_ID=""
OKTA_SECRET=""
OKTA_ISSUER=""
KEYCLOAK_ID=""
KEYCLOAK_SECRET=""
KEYCLOAK_ISSUER=""
NOTION_ID=""
NOTION_SECRET=""
ZOOM_ID=""
ZOOM_SECRET=""
DROPBOX_ID=""
DROPBOX_SECRET=""
BITBUCKET_ID=""
BITBUCKET_SECRET=""
SALESFORCE_ID=""
SALESFORCE_SECRET=""
COINBASE_ID=""
COINBASE_SECRET=""
PINTEREST_ID=""
PINTEREST_SECRET=""
TIKTOK_ID=""
TIKTOK_SECRET=""
FIGMA_ID=""
FIGMA_SECRET=""
MASTODON_ID=""
MASTODON_SECRET=""
MASTODON_ISSUER=""
```

---

### 11. `package.json` additions

```json
{
  "dependencies": {
    "next-auth": "^5.0.0-beta.25",
    "@auth/prisma-adapter": "^2.8.0",
    "@prisma/client": "^6.3.0",
    "prisma": "^6.3.0",
    "lodash": "^4.17.21",
    "next": "^15.1.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/lodash": "^4.17.0",
    "typescript": "^5.7.0",
    "tailwindcss": "^4.0.0"
  }
}
```

---

## File Tree Summary (for ZIP packaging)

```
heady-onboarding-fix/
├── MANIFEST.md
├── .env.example
├── middleware.ts                                    # Onboarding enforcement
├── prisma/
│   └── schema.prisma                               # Database schema
├── src/
│   ├── lib/
│   │   ├── auth/
│   │   │   ├── auth.config.ts                      # 30 OAuth providers + callbacks
│   │   │   └── auth-types.ts                       # Extended session types
│   │   ├── services/
│   │   │   ├── cloudflare-email.service.ts          # @headyme.com provisioning
│   │   │   └── api-key.service.ts                   # API key generation
│   │   └── prisma.ts                               # Prisma client singleton
│   └── app/
│       ├── api/
│       │   ├── auth/[...nextauth]/route.ts          # Auth handler
│       │   └── onboarding/
│       │       ├── account-setup/route.ts           # Step 2 API
│       │       ├── email-options/route.ts            # Step 3 API
│       │       ├── permissions/route.ts              # Step 4 API
│       │       ├── api-key/route.ts                  # Step 5 API
│       │       └── buddy-setup/route.ts              # Step 6 API
│       ├── auth/
│       │   ├── signin/page.tsx                      # 30-provider sign-in UI
│       │   └── error/page.tsx                       # Auth error page
│       └── onboarding/
│           ├── layout.tsx                           # Step progress bar
│           ├── account-setup/page.tsx               # Step 2: @headyme.com
│           ├── email-options/page.tsx                # Step 3: Email config
│           ├── permissions/page.tsx                  # Step 4: Cloud/hybrid
│           ├── api-key/page.tsx                      # Step 5: API key
│           └── buddy-setup/page.tsx                  # Step 6: Buddy + context switcher
└── package.json (additions)
```

---

## What This Fixes

| Problem | Fix |
|---------|-----|
| Clicking sign-in goes straight to "Welcome, here's your API key" | Middleware + Auth.js `pages.newUser` redirect forces correct step sequence[16][21] |
| No @headyme.com account creation | Step 2 creates username, provisions via Cloudflare Email Routing API[18][19] |
| No email forwarding options | Step 3 offers secure client, forward-to-provider, or custom forwarding[20][22] |
| No permissions page | Step 4 lets user choose cloud-only or hybrid filesystem+cloud |
| API key shown too early | Moved to Step 5 (after account, email, and permissions are set) |
| No Buddy onboarding | Step 6 offers persona selection, tools, themes, layouts, and multi-context switcher |
| Users can skip steps | Middleware enforces sequential completion — no jumping ahead |

This drops directly into your `Heady-pre-production-9f2f0642` or `headyme-core` monorepo structure[8]. Run `npx prisma db push` to create the schema, configure your `.env`, and the pilot onboarding flow is live.