# Medly Web

[![Unit Tests](https://github.com/medlyai/medly-web/actions/workflows/unit-tests.yml/badge.svg?branch=main)](https://github.com/medlyai/medly-web/actions/workflows/unit-tests.yml)
[![E2E Tests](https://github.com/medlyai/medly-web/actions/workflows/e2e-tests.yml/badge.svg?branch=main)](https://github.com/medlyai/medly-web/actions/workflows/e2e-tests.yml)

Next.js frontend for the Medly platform, serving [app.medlyai.com](https://app.medlyai.com).

> **Note:** The Next.js backend only serves the React app. The actual backend is handled by a separate FastAPI database API.

## Tech Stack

Next.js 15 (App Router) • React 19 • TypeScript • Firebase • NextAuth v5 • Tailwind CSS

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

Get `.env.local` from another team member. Required variables include Firebase config, NextAuth secrets, and API endpoints.

### 3. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command               | Description                  |
| --------------------- | ---------------------------- |
| `npm run dev`         | Start dev server (Turbopack) |
| `npm run build`       | Production build             |
| `npm run start`       | Start production server      |
| `npm run lint`        | Run ESLint                   |
| `npm run check-types` | TypeScript type check        |
| `npm run test`        | Run unit tests (Vitest)      |
| `npm run test:e2e`    | Run E2E tests (Playwright)   |

## Project Structure

```
src/
├── app/
│   ├── (protected)/     # Auth-required routes
│   ├── auth/            # Public auth pages
│   ├── api/             # API routes
│   ├── _components/     # Shared components
│   ├── _hooks/          # Custom hooks
│   └── _lib/            # Utilities & services
├── auth.ts              # NextAuth config
└── middleware.ts        # Route middleware
```

## Project Reference

### Critical: Auth System

**3-token system:**

1. **NextAuth JWT** → `src/auth.ts`
2. **Firebase ID tokens** → Firebase client/admin
3. **Database API tokens** → Curriculum API (stored in NextAuth session)

**Key files:**

- `src/auth.ts` - Token exchange/refresh
- `src/app/_lib/services/auth.ts` - DB API token management
- `src/app/_lib/utils/axiosHelper.ts` - Two axios instances: `axiosInstance` (internal) + `axiosCurriculumInstance` (curriculum API)

**Provider hierarchy:** `AuthProvider → UserProvider → PlanProvider`

**Middleware** (`src/middleware.ts`): Session → Onboarding → Subscription → Mock date validation

### Architecture

**Route Groups:**

- `(protected)/` - Auth required, wraps UserProvider + PlanProvider
- `(protected)/(with-sidebar)/` - Adds sidebar layout
- `auth/` - Public auth pages

**Firestore Schema:**

```
users/{userId}/subjectsWeb/{subjectId}/lessons/{lessonId}/{practice|learn}/{id}
users/{userId}/mocks/{mockId}
userIDs/{providerUserId}  # Provider ID → email/name
referrals2025/{userId}
```

See `AGENTS.md` for coding guidelines.
