# Medly Web Monorepo

[Unit Tests](https://github.com/medlyai/medly-web/actions/workflows/unit-tests.yml)
[E2E Tests](https://github.com/medlyai/medly-web/actions/workflows/e2e-tests.yml)

Turborepo monorepo containing Medly's Next.js applications.

## Repository Structure

```
medly-web/
├── apps/
│   ├── exams/          # Main app - app.medlyai.com
│   └── open/           # Open platform - uses Drizzle + Postgres
├── packages/           # Shared packages (future)
├── turbo.json          # Turborepo task configuration
└── package.json        # Root workspace configuration
```

## Getting Started

### Prerequisites

- Node.js 20.x
- npm 11.x (specified in `packageManager`)

### Installation

Install dependencies for all workspaces from the root:

```bash
npm install
```

This installs dependencies for the root and all apps in one command via npm workspaces.

### Environment Setup

Each app requires its own `.env.local` file. Get these from a team member:

- `apps/exams/.env.local`
- `apps/open/.env.local`

---

## Working with Turborepo

Turborepo manages task orchestration across the monorepo. All commands can be run from the **root directory**.

### Run All Apps

```bash
# Start all apps in development (Exams on 3000, Open on 3001)
npm run dev

# Build all apps
npm run build

# Run all linters
npm run lint

# Run all tests
npm run test
```

### Working on a Single App

Use `--filter` to target a specific app:

```bash
# Development
turbo dev --filter=exams
turbo dev --filter=open

# Build
turbo build --filter=exams
turbo build --filter=open

# Tests
turbo test --filter=exams
turbo test --filter=open

# Type checking
turbo check-types --filter=exams
```

**Shorthand scripts** are available for common workflows:

```bash
# Exams app
npm run dev:exams     # turbo dev --filter=exams
npm run build:exams   # turbo build --filter=exams

# Open app
npm run dev:open      # turbo dev --filter=open
npm run build:open    # turbo build --filter=open
```

### Running App-Specific Commands

For commands not defined in Turborepo (like `test:e2e:ui`), you have two options:

**Option 1: Use `-w` flag from root**

```bash
npm run test:e2e -w exams
npm run test:e2e:ui -w open
npm run db:studio -w open
```

**Option 2: Run from the app directory**

```bash
cd apps/exams
npm run test:e2e:ui
```

---

## Development Workflow

### Typical Day-to-Day

1. **Start the app you're working on:**

```bash
 turbo dev --filter=exams
```

1. **Run checks before committing:**

```bash
 turbo lint check-types test --filter=exams
```

1. **Full repo checks (CI simulation):**

```bash
 npm run lint && npm run check-types && npm run test
```

### Task Caching

Turborepo caches task outputs. If you run `turbo build` twice without changes, the second run is instant.

To force a fresh run:

```bash
turbo build --force
```

### Viewing Task Graph

See what Turborepo will execute:

```bash
turbo build --filter=exams --dry-run
turbo build --graph              # Opens visual dependency graph
```

---

## Available Tasks

| Task          | Description              | Cached |
| ------------- | ------------------------ | ------ |
| `dev`         | Start development server | No     |
| `build`       | Production build         | Yes    |
| `start`       | Start production server  | No     |
| `lint`        | Run ESLint               | Yes    |
| `test`        | Run unit tests (Vitest)  | Yes    |
| `check-types` | TypeScript type checking | Yes    |

---

## Apps Overview

### `exams`

Main Medly application serving [app.medlyai.com](https://app.medlyai.com).

- **Tech:** Next.js 15, React 19, Firebase, NextAuth v5
- **Port:** 3000
- **README:** `apps/exams/README.md`

### `open`

Open platform application, serving [open.medlyai.com](http://open.medlyai.com)

- **Tech:** Next.js 15, React 19, Drizzle ORM + Postgres
- **Port:** 3001 (when running alongside exams)
- **README:** `apps/open/README.md`
- **Special:** Has Drizzle database commands (`npm run db:`)

---

## Adding a New App

1. Create the app in `apps/`:

```bash
 cd apps
 npx create-next-app@latest new-app
```

1. Ensure `package.json` has a unique `name` field
2. Add standard scripts to match existing apps:

```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "check-types": "tsc --noEmit",
    "test": "vitest run"
  }
}
```

1. Run `npm install` from root to link the new workspace

---

## Deployment

Heroku deployment uses `APP_NAME` to determine which app to build and run:

```bash
heroku config:set APP_NAME=exams   # or "open"
```

### How It Works

The `heroku-postbuild` script handles everything:

```bash
turbo build --filter=${APP_NAME:-exams} && cp apps/${APP_NAME:-exams}/Procfile .
```

1. Builds the specified app with Turborepo
2. Copies the app's `Procfile` to the root so Heroku uses it for the start command

Each app has its own `Procfile` in its directory (e.g., `apps/exams/Procfile`) that specifies how to run the production server.

---

## Additional Resources

- [Turborepo Documentation](https://turbo.build/repo/docs)
- [npm Workspaces](https://docs.npmjs.com/cli/using-npm/workspaces)
- `AGENTS.md` - Coding guidelines and best practices
