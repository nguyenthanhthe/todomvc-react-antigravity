# Project: TodoMVC React 18+ TypeScript Application

## Architecture
The application is structured as a client-side single-page application built with React 18+ (or React 19), TypeScript, Vite, and Vitest, adhering strictly to the official TodoMVC specification and styling standards.

### System Flow
1. **Hash Routing**: The browser URL hash (`#/`, `#/active`, `#/completed`) is monitored by `useHashLocation`, setting the active `filter`.
2. **State & Persistence**: `useTodos` orchestrates state operations (create, toggle, toggle-all, edit, delete, clear-completed), syncing automatically with `localStorage` under the key `todos-react`.
3. **Component Hierarchy**:
   - `App`: Main container (`.todoapp`) managing root state and conditional rendering.
     - `Header`: Contains `h1` and `.new-todo` input (autofocused, trims input, creates item on Enter).
     - `MainSection`: Rendered only when `todos.length > 0` (`#main` / `.main`).
       - `ToggleAll`: Checkbox (`#toggle-all`) & label reflecting complete state and toggling all items.
       - `TodoList`: Unordered list (`.todo-list`) rendering filtered `TodoItem` elements.
         - `TodoItem`: Manages view mode (`.view`, `.toggle`, `label`, `.destroy`) and edit mode (`.editing`, `.edit` input with Enter/blur commit, Escape cancel, empty-string destroy).
     - `Footer`: Rendered only when `todos.length > 0` (`.footer`).
       - `TodoCount`: Active count with pluralization ("1 item left" vs "0 items left" / "N items left").
       - `Filters`: Routing links (`All`, `Active`, `Completed`) applying `.selected` to active filter.
       - `ClearCompleted`: Rendered only when completed items > 0 (`.clear-completed`).
   - `InfoFooter`: Credits and instructions outside `.todoapp` (`.info`).

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | F1: Toolchain & Scaffolding | Vite, React 18/19, TypeScript, Vitest, Testing Library configuration | M1 | explorer_1 |
| 2 | F2: Styling & Assets | Complete TodoMVC CSS matching todomvc-app-css v2.4.3 & todomvc-common v1.0.5 | M1 | spec_miner_2 |
| 3 | F3: Types & Interfaces | TypeScript definitions for Todo, FilterType, Action, Storage schemas | M1 | explorer_1 |
| 4 | F4: LocalStorage Engine | Persistence hook storing/retrieving JSON under key `todos-react` | M2 | spec_miner_1 |
| 5 | F5: Hash Routing Hook | Client-side hash router handling `#/`, `#/active`, `#/completed` | M2 | spec_miner_1 |
| 6 | F6: Core State Management | Reducer and `useTodos` hook with deterministic transitions | M2 | explorer_1 |
| 7 | F7: App & Empty State | Root container hiding `#main` & `#footer` when list is empty | M3 | spec_miner_1 |
| 8 | F8: Header & New Todo | `.new-todo` input with autofocus, Enter commit, whitespace trimming | M3 | spec_miner_1 |
| 9 | F9: Item Display & Toggle | Checkbox toggling completed state with visual strike-through | M3 | spec_miner_1 |
| 10 | F10: Item Inline Editing | Double-click, autofocus `.edit`, Enter/blur save, Escape cancel, empty-string destroy | M3 | spec_miner_1 |
| 11 | F11: Item Deletion | Hover `.destroy` button removing single todo item | M3 | spec_miner_1 |
| 12 | F12: Toggle All | `#toggle-all` checkbox marking all active/complete and dual sync | M3 | spec_miner_1 |
| 13 | F13: Active Count Pluralization | `.todo-count` formatted as `<strong>{count}</strong> {item/items} left` | M3 | spec_miner_1 |
| 14 | F14: Filter Navigation | Hash route filter list with `.selected` class on active link | M3 | spec_miner_1 |
| 15 | F15: Clear Completed | Button visible when completed > 0, batch deletes completed items | M3 | spec_miner_1 |
| 16 | F16: Info Footer | Static info footer with double-click hint and TodoMVC credits | M3 | spec_miner_2 |
| 17 | F17: E2E Test Suite (Tiers 1-4) | Comprehensive opaque-box test suite passing 100% | M4 | E2E Testing Track |
| 18 | F18: Adversarial Coverage Hardening | White-box stress tests & edge-case hardening (Tier 5) | M4 | E2E Testing Track |
| 19 | F19: Production Build | Clean `npm run build` with zero TypeScript or bundling errors | M4 | ORIGINAL_REQUEST |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Toolchain & Scaffolding | package.json, configs, styles, core types | none | DONE |
| M2 | State Management & Hooks | useLocalStorage, useHashLocation, useTodos & reducer unit tests | M1 | DONE |
| M3 | UI Components & Integration | Header, MainSection, TodoList, TodoItem, Footer, InfoFooter, App | M1, M2 | DONE |
| M4 | E2E Verification & Hardening | Full test pass (Tiers 1-4), Tier 5 hardening, clean production build | M1, M2, M3, E2E-TEST | DONE |
| E2E | E2E Testing Track | Test harness, Tier 1-4 tests, TEST_INFRA.md, TEST_READY.md | M1 | DONE |

## Interface Contracts
### Types (`src/types/todo.ts`)
```typescript
export interface Todo {
  id: string;
  title: string;
  completed: boolean;
}

export type FilterType = 'all' | 'active' | 'completed';

export interface TodosState {
  todos: Todo[];
}

export type TodoAction =
  | { type: 'ADD'; title: string }
  | { type: 'TOGGLE'; id: string }
  | { type: 'TOGGLE_ALL'; completed: boolean }
  | { type: 'UPDATE'; id: string; title: string }
  | { type: 'DELETE'; id: string }
  | { type: 'CLEAR_COMPLETED' }
  | { type: 'SET_TODOS'; todos: Todo[] };
```

### Hooks (`src/hooks/`)
- `useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void]`
- `useHashLocation(): FilterType`
- `useTodos(): { todos: Todo[]; activeCount: number; completedCount: number; areAllCompleted: boolean; addTodo: (title: string) => void; toggleTodo: (id: string) => void; toggleAll: (completed: boolean) => void; updateTodo: (id: string, title: string) => void; deleteTodo: (id: string) => void; clearCompleted: () => void; }`

## Code Layout
```
valiant-volta/
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── vitest.config.ts
├── vitest.setup.ts
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── types/
│   │   └── todo.ts
│   ├── styles/
│   │   └── index.css
│   ├── hooks/
│   │   ├── useLocalStorage.ts
│   │   ├── useHashLocation.ts
│   │   └── useTodos.ts
│   └── components/
│       ├── Header.tsx
│       ├── MainSection.tsx
│       ├── TodoList.tsx
│       ├── TodoItem.tsx
│       ├── Footer.tsx
│       └── InfoFooter.tsx
└── tests/
    ├── unit/
    │   ├── hooks.test.ts
    │   └── components.test.tsx
    └── e2e/
        ├── tier1_features.test.tsx
        ├── tier2_boundaries.test.tsx
        ├── tier3_combinations.test.tsx
        ├── tier4_workloads.test.tsx
        └── tier5_adversarial.test.tsx
```
