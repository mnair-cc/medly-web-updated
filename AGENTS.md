# AGENTS.md - Medly Web

We work in 3 phases. Guidance is grouped by the phase where it is most actionable:

1. **Plan**: decide what to build and the right abstraction boundaries
2. **Code**: implement quickly and safely with local, checkable rules
3. **Review**: evaluate the finished solution holistically; refactor and harden

For project general reference, see README.md

---

## Phase 1: Plan

### Guideline: Minimize cognitive load

- Prefer small surfaces, obvious naming, and straightforward control flow.
- Avoid clever unnecessary abstractions that save a few lines but cost understanding.

### Guideline: Prefer explicitness over implicitness

- Use clear names for functions, variables, components, and props.
- Prefer designs a new dev can follow without tribal knowledge.

### Rule: Choose the correct abstraction boundary before adding features

Before writing code, answer:

- What is the smallest API surface that solves the problem?
- What should be shared vs specialized per use case?
- What will change next month, and what is stable?

### Rule: Don’t over-abstract early - prefer simplicity

Only introduce a shared abstraction when:

- The same concept appears in multiple places, and
- The boundary is stable (not just for this one change), or
- The user has explicitely asked to plan for a future use-case where this needs to support multiple

---

## Phase 2: Code

### Rule: No animations unless requested

- Do not add CSS animations, transitions, or motion effects unless explicitly asked.

### Rule: Open platform data access

- Do not call Firestore directly in any `/open` pages or APIs. Use Postgres via drizzle repositories instead.

Bad:

```ts
import { getFirestore } from "firebase-admin/firestore";

const db = getFirestore();
await db.collection("open").doc(userId).get();
```

Good:

```ts
import { documentRepo } from "@/db/repositories";

await documentRepo.findAllByUserId(userId);
```

### Rule: Don’t add another branch when the code is already “branchy”

Before adding logic, check:

- Function is > 50 lines
- Multiple nested `if`/`else` blocks
- Similar logic duplicated in 3+ places
- You’re adding a 3rd/4th special-case

If any are true, **extract first**, then implement (helper function, hook, or module). Do not grow the conditional tree.

### Rule: Prefer removal and reuse over new code paths

| Prefer                                             | Over                     |
| -------------------------------------------------- | ------------------------ |
| Small, composable functions and components         | Large multi-purpose ones |
| Pure functions (no side effects)                   | Hidden mutation          |
| Removing code                                      | Adding new branches      |
| Extracting shared logic (when duplicated 3+ times) | Copy/paste               |

### Rule: Avoid “god components”

Do not create components that:

- Switch behavior on `sessionType`, `mode`, etc. via large conditionals
- Have 30+ props
- Exceed ~500 lines
- Combine multiple distinct flows into one component “because they’re similar”

Bad:

```tsx
const SessionStructure = ({ sessionType, ...props }) => {
  if (sessionType === "mock") {
    /* 200 lines */
  }
  if (sessionType === "lesson") {
    /* 200 lines */
  }
};
```

Good:

```tsx
const MockSessionStructure = (props) => {
  /* focused */
};
const LessonSessionStructure = (props) => {
  /* focused */
};
```

### Rule: Use composition over configuration

Prefer composing specialized parts over adding more flags/options to one component:

1. Create specialized components per use case
2. Extract shared logic into hooks
3. Extract shared UI into reusable components
4. For building blocks and shared components, adopt open/closed standards
5. Compose

```tsx
const SatSessionStructure = () => {
  const aiState = useSessionAiState();
  const tools = useSessionTools();

  return (
    <>
      <SatHeader tools={tools} />
      <SatPageRenderer aiState={aiState} />
      <SatFooter />
    </>
  );
};
```

### Rule: Extract a custom hook when state/logic travels together

Extract a hook when any are true:

- 3+ `useState` calls always used together
- The same state pattern appears in 2+ components
- State + derived logic can be encapsulated behind a small API

### Rule: File organization

- Co-locate components/hooks with the feature where they are used.
  Good Example: `src/app/path/to/feature/page.tsx`, route specific hooks go on `src/app/path/to/feature/_hooks`
- Cross-cutting concerns → `src/app/_components/` or `src/app/_hooks/`, grouped by concern.

---

## Phase 3: Review

### Rule: Self-check the implementation against Phase 1 (Plan) rules

- Re-check the final code against Phase 1: cognitive load, explicitness, and the intended abstraction boundary.

### Review checklist: maintainability

- If you touched code near a “branchy” area, did you **extract** instead of adding more conditionals?
- Did this change create or grow a “god component”? If yes, split into specialized components + shared hooks.
- Did you introduce duplication that will likely repeat? If yes, extract shared logic/UI.

### Review checklist: safety

- If touching auth/session/middleware, prefer adding **targeted tests** for the flow you changed.
- Ensure new behavior is explicit in names (avoid “magic” booleans/flags where possible).
- When adding complex logic code (e.g. Debounced save with throttling), make the code isloated and testable, and add unit tests.

---

## Shell Commands & Package Installation

**Installing packages:** Always request `all` permissions on the first attempt when running `npm install` or similar package manager commands. Sandboxed shell commands block network access, causing npm to fail with misleading cache errors.

```bash
# Correct: Request full permissions immediately
npm install <package>  # with required_permissions: ["all"]
```

---
