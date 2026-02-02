# Cursor AI & Prompt Engineering (Enterprise Edition)

A comprehensive guide for maximizing productivity with Cursor AI in an enterprise environment. Covers context management, security best practices, advanced prompt engineering, and unified team configuration.

---

## 🟢 Essentials & Security

### Key Shortcuts
| Shortcut | Name | Description |
| :--- | :--- | :--- |
| **`Ctrl` + `K`** | **Generate / Edit** | In-line code generation. High speed, aimed at single blocks/files. |
| **`Ctrl` + `L`** | **Chat** | Sidebar chat for Q&A, debugging, and exploration. |
| **`Ctrl` + `I`** | **Composer** | **The Power Tool**. Multi-file agent that creates/edits files across the repo. |
| **`Ctrl` + `P`** | **File Search** | Quickly open files (standard VS Code). |
| **`@`** | **Context Menu** | The most important key. Opens context selector (`@File`, `@Web`, etc.). |

### 🔒 Enterprise Privacy & Security
Before pasting proprietary code, ensure your settings are correct:
1.  **Privacy Mode**: Go to `Settings > General > Privacy Mode` and set to **"Codebase Indexing only"** or **"Local"** if available. Ensure "Allow data training" is **OFF**.
2.  **API Keys**: If using own API keys (BYOK), ensure they are scoped correctly.
3.  **`.cursorignore`**: Create this file in root to prevent Cursor from indexing sensitive files (like `.env`, `secrets.json`, or massive data dumps).
    ```gitignore
    # .cursorignore
    .env
    **/*.csv
    secrets/
    legacy_module_do_not_touch/
    ```

---

## 🟡 Context Management Strategy

In large enterprise repos (monorepos), adding **correct** context is 80% of the battle.

| Symbol | Context | When to use |
| :--- | :--- | :--- |
| **`@Files`** | Specific File(s) | **Precision Work**. "Fix the bug in `@UserService.ts` and `@UserController.ts`". Always prefer this over `@Codebase` if you know where the code is. |
| **`@Codebase`** | Global Index | **Exploration**. "Where is the authentication logic defined?" or "How do we handle logging in this repo?". *Warning: Can be noisy.* |
| **`@Web`** | Live Internet | **Research**. "What is the latest breaking change in Next.js 14?" |
| **`@Docs`** | Custom Docs | **Libraries**. "How do I use the Table component? `@MUI Docs`". (Configure in Settings > Features > Docs). |
| **`@Git`** | Git History | **Review**. "What changed in the last commit? `@Git`". |
| **`@Folders`** | Sub-directories | **Scoped Context**. "Refactor the logic in `@/services/auth` module". |

### � Pro Tip: Pinning Context
You can **pin** frequently used documentation or files in the Chat usage so they persist across messages.

---

## 🔴 Enterprise Prompt Engineering (CO-STAR)

Use the **CO-STAR** framework for reliable, production-grade outputs.

### 1. Context (C)
**Don't say:** "Fix this."
**Say:** "I am an enterprise Java developer working on a Spring Boot microservice. We use Lombok and JUnit 5."

### 2. Objective (O)
**Don't say:** "Write a test."
**Say:** "Write a parameterized unit test for the `calculateTax` method. Cover edge cases like negative input and null values."

### 3. Style (S)
**Define your stack strictly.**
"Use strict TypeScript. Prefer functional programming patterns. Use `zod` for validation."

### 4. Tone (T)
"Be professional. adding explanatory comments only for complex logic. No yapping."

### 5. Audience (A)
"For a Senior DevOps Engineer." (implied: assumes knowledge of Docker/K8s, skips basics).

### 6. Response (R)
"Return the code in a single block. Do not explain the imports."

### 🏢 Real-World Enterprise Example
> "Using `@Codebase`, I need to refactor the `OrderProcessing` class.
> **Context**: We are moving from a synchronous REST call to an event-driven Kafka approach.
> **Objective**: Replace the direct HTTP call to InventoryService with a Kafka Producer message.
> **Style**: Use our existing `EventBus` wrapper found in `@EventBus.java`. Follow the logic patterns in `@PaymentService.java`.
> **Constraint**: Do not break existing unit tests. Return the updated Class and the new Test."

---

## � Advanced Configuration (.cursorrules)

The **`.cursorrules`** file acts as a permanent "System Prompt" for your project. Commit this file so the whole team shares the AI instructions.

### Template: Enterprise TypeScript/Node
```markdown
# .cursorrules

You are a Senior Full Stack Engineer at [Company].

## 1. Code Style
- **TypeScript**: Use strict typing. No `any`. Use `interface` over `type` for public APIs.
- **Naming**: camelCase for vars, PascalCase for components/classes, UPPER_CASE for constants.
- **Async**: Prefer `async/await` over `.then()`.

## 2. Testing (Vital)
- All new logic MUST have a corresponding Unit Test (`.test.ts`).
- Use `vitest` syntax.
- Mock external calls using `vi.mock()`.

## 3. Libraries
- Date handling: Use `date-fns` (NOT moment.js).
- Styling: Tailwind CSS.
- Validation: Zod.

## 4. Security
- NEVER hardcode secrets or API keys. Use `process.env`.
- Sanitize all user inputs using the provided `sanitize()` helper.
```

### Template: Python/Django
```markdown
# .cursorrules

You are a Django Backend Expert.

## 1. Architecture
- Follow the "Fat Models, Thin Views" philosophy.
- Services should be placed in `services.py`, not views.

## 2. Style
- Follow PEP8 explicitly.
- Use Type Hints for all function arguments and returns.

## 3. Database
- Use Django ORM methods (`select_related`, `prefetch_related`) to avoid N+1 queries.
- Do not use raw SQL unless explicitly asked.
```

---

## 🚀 "Composer" (Ctrl+I) Workflows

Composer (Agent Mode) can edit multiple files. Use it for:

### 1. The "Scaffold" Workflow
"Create a new feature 'UserPromotions'.
1. Create a Mongoose model in `models/Promotion.ts`.
2. Create a service `services/promotionService.ts`.
3. Create a controller `controllers/promotionController.ts`.
4. Add the route in `routes.ts`.
Follow the pattern used in `@UserFeature`."

### 2. The "Migration" Workflow
"We are migrating from `axios` to `fetch`. Find all instances of `axios.post` in `@/frontend` folder and replace them with our custom `fetchClient`. Ensure error handling is preserved."

### 3. The "Test Coverage" Workflow
"Analyze `@paymentHelpers.ts`. It currently has 0 tests. Create a test file `paymentHelpers.test.ts` and add tests to achieve 100% branch coverage."
