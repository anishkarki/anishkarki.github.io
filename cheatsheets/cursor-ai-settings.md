# Cursor AI & Prompt Engineering (Principal Edition)

A comprehensive guide for maximizing productivity with the Cursor IDE. Designed for senior and principal engineers managing large-scale, complex repositories, orchestrating multi-file agents, and configuring custom team-wide rules.

---

## 🟢 Quick Navigation

| Section | Level | Focus |
|:---|:---|:---|
| [Essential Shortcuts](#essential-shortcuts) | 🟢 Basic | Core key mappings |
| [Vector Index & Privacy](#vector-index--privacy) | 🟢 Basic | Privacy settings, indexing exclusions |
| [Context Orchestration (@ Symbols)](#context-orchestration--symbols) | 🟡 Intermediate | Scoping AI context precisely |
| [Composer (Agent Mode) Orchestration](#composer-agent-mode-orchestration) | 🟠 Advanced | Multi-file codebase generation |
| [.cursorrules System Architecture](#cursorrules-system-architecture) | 🟠 Advanced | Team guidelines, architecture prompts |
| [Advanced Prompting Frameworks](#advanced-prompting-frameworks) | 💡 Setup | Code generation prompt engineering |

---

## 🟢 Essential Shortcuts

Learn the four pillars of Cursor's AI engine.

| Shortcut | Name | Target | Mnemonic |
|:---|:---|:---|:---|
| **`Ctrl + K`** | Inline Generate / Edit | Targeted line/block generation | **K**ode edit inline |
| **`Ctrl + L`** | Chat Sidebar | Multi-turn reasoning, query logs, explainers | **L**isten / Chat |
| **`Ctrl + I`** | Composer | Multi-file agent capable of rewriting directory structures | **I**nvent / Orchestrate |
| **`@`** | Context Trigger | Opens resource selector inside any prompt box | **A**dd context |

---

## 🟢 Vector Index & Privacy

### 🔒 Enterprise Privacy & Local Compliance
1.  **Privacy Mode:** Go to `Cursor Settings > General > Privacy Mode` and toggle **ON**. This ensures your code is never stored or used to train public models.
2.  **API Routing:** Configure local or corporate gateway API endpoints under `Cursor Settings > Models > OpenAI/Anthropic API Key`.

### Excluding Vectors with `.cursorignore`
Create a `.cursorignore` file in your root workspace directory. This stops Cursor from wasting search context tokens on large directories or build outputs:

```gitignore
# .cursorignore
node_modules/
.git/
dist/
build/
package-lock.json
*.log
# Exclude proprietary large datasets
data/
secrets/
```

---

## 🟡 Context Orchestration (@ Symbols)

Adding context is the single most important factor for high-quality code generation.

### Context Options
*   **`@Files`** — **Precision targeting.** Reference exact source code (e.g., `@UserService.ts`, `@authMiddleware.js`). Use this when you know exactly which files need to change.
*   **`@Codebase`** — **Semantic search.** Automatically parses the local index vector database to find relevant code snippets. Use for open-ended queries (e.g., "How do we handle error routing?").
*   **`@Docs`** — **Third-party frameworks.** Instantly pulls documentation from standard libraries or custom links configured in `Settings > Features > Docs` (e.g., `@Next.js 14`, `@Tailwind`).
*   **`@Git`** — **Commit checks.** References recent commits, stash items, or branch diffs (e.g., "Find the bugs in the changes from `@Git (Working Copy)`").
*   **`@Folders`** — **Scoped generation.** Limits the AI's search context to a subdirectory (e.g., `@/src/api`).

---

## 🟠 Composer (Agent Mode) Orchestration

Composer (`Ctrl + I`) is a multi-file autonomous agent. It does not just generate snippets; it writes and edits files directly in your workspace.

### Orchestration Patterns
1.  **Scaffolding Workflow:**
    > "Create a new microservice module `UserBilling`.
    > 1. Create a schema in `@billingSchema.ts`.
    > 2. Implement the controller in `@billingController.ts`.
    > 3. Register the route endpoints in `@routes.ts`.
    > Follow the architecture and imports style of `@UserModule`."
2.  **Mass Migration Workflow:**
    > "Migrate the frontend components inside `@/src/components` from class-based components to React functional components. Use hooks and ensure type definitions match `@types.d.ts`."
3.  **Test Coverage Booster:**
    > "Analyze the logic of `@paymentService.ts`. Identify code branch gaps, and write a comprehensive unit test suite targeting 100% coverage using Jest. Save to `paymentService.test.ts`."

---

## 🟠 .cursorrules System Architecture

The `.cursorrules` file defines a workspace-wide system prompt for all developers on the project.

### Template: TypeScript Backend Monorepo
```markdown
# .cursorrules (TypeScript Backend)

You are a Principal Backend Architect. Follow these coding constraints strictly:

## 1. Technical Stack
- Node.js (v20+), TypeScript (Strict Mode), Fastify, Prisma.
- Testing: Vitest.

## 2. Coding Patterns
- Use functional programming paradigms. Prefer pure functions over classes.
- Ensure all API endpoints validate input schemas using Zod.
- Avoid 'any' type cast; use unknown and type guards where necessary.

## 3. Database & Performance
- Always use Prisma's `select` filter to fetch only necessary database fields.
- Prevent N+1 query issues by batching database reads via dataloaders.

## 4. Error Handling
- Never throw raw Errors. Return a Result type wrapper: `type Result<T, E> = { ok: true, data: T } | { ok: false, error: E }`.
```

---

## 💡 Advanced Prompting Frameworks

Use the **CO-STAR** framework inside Chat (`Ctrl + L`) or Composer (`Ctrl + I`) for high-fidelity code.

### The CO-STAR Structure
*   **Context (C):** Establish the background. (e.g., "We are building a latency-critical Go API running on Kubernetes.")
*   **Objective (O):** State the explicit task. (e.g., "Implement a connection pool wrapper for Redis client.")
*   **Style (S):** Define the formatting and coding patterns. (e.g., "Write idiomatic Go. Prefer standard library imports, minimize external dependencies.")
*   **Tone (T):** Define explanation limits. (e.g., "Provide clear inline comments for complex algorithms. Do not explain standard language features.")
*   **Audience (A):** Align on expertise. (e.g., "Written for Principal Engineers; assume familiarity with concurrency primitives.")
*   **Response (R):** Define output format. (e.g., "Return only the compilable code block. No yapping.")
