# Original User Request

## Initial Request — 2026-08-30T10:26:59Z

Build a fully compliant, production-grade TodoMVC application in React 18+ with TypeScript, Vite, and Vitest, adhering strictly to the official TodoMVC specification and styling standards.

Working directory: c:/Users/Admin/Documents/antigravity/valiant-volta
Integrity mode: development

Reference: https://raw.githubusercontent.com/tastejs/todomvc/refs/heads/master/app-spec.md

## Requirements

### R1. Complete TodoMVC Functionality & State Management
Implement the full TodoMVC specification in React 18+ and TypeScript:
- **Empty State**: Hide `#main` and `#footer` sections when there are no todos in the list.
- **New Todo**: Text input (`.new-todo`) focused on initial render. Submitting with Enter creates a new todo item after trimming leading/trailing whitespace. Ignore empty/whitespace-only input.
- **Item Display & Toggle**: Display items with title and completion checkbox. Checking toggles completion state and applies `.completed` styling.
- **Item Editing**: Double-clicking an item title enters inline edit mode (`.editing` class applied, `.edit` input focused). Pressing Enter or triggering blur commits the trimmed title change. Pressing Escape cancels editing and discards changes. If trimmed input is empty upon commit, the item is removed.
- **Item Deletion**: Clicking the `.destroy` button removes the todo item.
- **Toggle All**: Provide `#toggle-all` checkbox that marks all items complete or active. The toggle-all checkbox reflects checked state only when all items are completed.
- **Counter**: Display remaining active (incomplete) items count in `.todo-count` with correct pluralization (`1 item left`, `2 items left`, `0 items left`).
- **Routing & Filtering**: Support client-side hash routing (`#/`, `#/active`, `#/completed`). Filter items accordingly and apply the `.selected` class to the active filter link.
- **Clear Completed**: Display `.clear-completed` button only when one or more items are completed. Clicking it deletes all completed items.
- **Persistence**: Persist todos in `localStorage` across page reloads.

### R2. Official TodoMVC Styling & Semantic DOM Structure
Follow the standard TodoMVC HTML structure and CSS classes matching `todomvc-app-css` and `todomvc-common`, ensuring pixel-accurate layout, font styles, toggle controls, and hover effects.

### R3. Automated Test Suite & Production Build
Provide a comprehensive test suite using Vitest and React Testing Library verifying every functional requirement and edge case (creation, editing, cancellation, empty-string deletion, toggle-all, routing, filtering, count pluralization, clear completed, and localStorage persistence). Ensure `npm run build` and `npm test` execute cleanly with zero errors or TypeScript warnings.

## Acceptance Criteria

### Core Functionality & State Transitions
- [ ] `#main` and `#footer` are hidden when todo list is empty, and visible when at least 1 todo exists
- [ ] Typing into `.new-todo` and pressing Enter adds a new active item with trimmed text, and resets the input
- [ ] Toggling an item's checkbox toggles its completed state and updates the active items counter
- [ ] Double-clicking `.view label` enters editing mode with `.editing` class on `li` and auto-focuses `.edit` input
- [ ] In edit mode, pressing Enter or blurring saves trimmed changes; pressing Escape discards changes
- [ ] In edit mode, saving an empty or all-whitespace string destroys the todo item
- [ ] Clicking `.destroy` removes the todo item
- [ ] `#toggle-all` checkbox toggles all items completed/active, and stays checked if and only if all items are completed
- [ ] `.clear-completed` button appears when >= 1 item is completed and removes all completed items when clicked
- [ ] Active items counter in `.todo-count` accurately reflects active count with correct grammar ("1 item left", "N items left")

### Routing & Persistence
- [ ] Visiting `#/` displays all items; `#/active` displays only active items; `#/completed` displays only completed items
- [ ] The matching route link in the footer receives the `.selected` CSS class
- [ ] All todo state changes persist to `localStorage` and correctly rehydrate on page reload

### Verification & Code Quality
- [ ] `npm test` runs automated test suite with 100% passing tests covering all specification behaviors
- [ ] `npm run build` succeeds without type or bundling errors
