# TodoMVC E2E Test Infrastructure & Methodology Specification

## 1. Overview & Testing Philosophy

The TodoMVC React TypeScript application is tested using an opaque-box, behavior-driven end-to-end (E2E) testing strategy. The tests treat the application from the user's perspective, rendering the top-level `<App />` component in a simulated browser DOM environment (JSDOM with Vitest and `@testing-library/react` + `@testing-library/user-event`).

### Core Principles
1. **Opaque-Box User-Centric Verification**: Tests interact strictly through user-observable interfaces—typing into inputs, clicking buttons/checkboxes, double-clicking labels, pressing keyboard shortcuts (`Enter`, `Escape`), clicking filter navigation links, and inspecting rendered DOM structures and CSS class states.
2. **Standard TodoMVC Semantic DOM & CSS Fidelity**: Assertions target standard TodoMVC CSS class names (`.todoapp`, `.header`, `.new-todo`, `.main`, `.toggle-all`, `.todo-list`, `li`, `li.completed`, `li.editing`, `.view`, `.toggle`, `label`, `.destroy`, `.edit`, `.footer`, `.todo-count`, `.filters`, `.clear-completed`, `.info`).
3. **Deterministic State & Test Isolation**: Each test is fully self-contained. The test environment (`localStorage`, `window.location.hash`, DOM container) is cleared before and after each test case, ensuring zero test pollution or execution-order dependency.
4. **Authoritative Expected Output Derivation**: Every assertion is derived from the official TodoMVC specification (`tastejs/todomvc/app-spec.md`), DOM/CSS specs (`tastejs/todomvc-app-css`), and project specifications (`PROJECT.md`, `ORIGINAL_REQUEST.md`).

---

## 2. Four-Tier Testing Methodology

The E2E test suite is organized into four distinct tiers of depth and complexity:

```
┌────────────────────────────────────────────────────────┐
│  Tier 4: Realistic Workloads & Complete User Sessions  │
├────────────────────────────────────────────────────────┤
│  Tier 3: Combinations & Cross-Feature Interactions     │
├────────────────────────────────────────────────────────┤
│  Tier 2: Boundary Conditions & Edge Cases              │
├────────────────────────────────────────────────────────┤
│  Tier 1: Feature Coverage (Core Requirements)          │
└────────────────────────────────────────────────────────┘
```

### Tier 1: Feature Coverage (`tests/e2e/tier1_features.test.tsx`)
Verifies primary happy paths and core functional capabilities across all 10 standard functional categories (>=5 test cases per category):
- **Empty State**: Hiding `#main` and `#footer` when list is empty, rendering header, autofocus.
- **Creation & Trimming**: Adding items on Enter, resetting input, stripping leading/trailing spaces, rejecting empty/whitespace inputs.
- **Item Display & Toggle**: Unchecked active state, checked `.completed` state, strikethrough styling, independent toggling.
- **Inline Editing**: Double-click activation (`li.editing`), autofocusing `.edit`, Enter/blur commit, Escape cancellation, empty-string deletion.
- **Item Deletion**: Individual `.destroy` button click, deleting from head/middle/tail of list.
- **Toggle-All**: Marking all completed, marking all active, sync with item completion states.
- **Active Counter & Pluralization**: "0 items left", "1 item left", "N items left", dynamic updates.
- **Routing & Filtering**: Hash routes `#/`, `#/active`, `#/completed`, `.selected` active link styling, view projection.
- **Clear Completed**: Button visibility conditioned on `completedCount > 0`, batch deletion of completed items.
- **LocalStorage Persistence**: Rehydration from storage, serialization on mutations, state reload preservation.

### Tier 2: Boundary & Corner Cases (`tests/e2e/tier2_boundaries.test.tsx`)
Adversarial edge cases, input extremes, and error recovery:
- **Whitespace Boundaries**: Input with tabs, newlines, non-breaking spaces, multi-space sequences.
- **Edit Escape/Blur Interaction**: Escape cancels title edit followed immediately by blur—verifying blur does NOT commit discarded text.
- **Rapid Interactions**: Successive rapid typing, rapid toggle clicks, rapid toggle-all clicks without state corruption.
- **Special Characters & XSS**: HTML/script injection strings (`<script>alert(1)</script>`, `<b>bold</b>`), Unicode, emoji, RTL characters, quotes.
- **Extreme Lengths**: Ultra-long unbroken strings (500+ chars) and single-character titles.
- **Corrupt Storage Recovery**: Handling corrupt JSON (`"{bad"`), non-array storage, malformed item structures without crashing.
- **Malformed & Unknown Routes**: Fallbacks for `#/unknown`, `#invalid`, non-standard hash paths.

### Tier 3: Combinations & Cross-Feature Interactions (`tests/e2e/tier3_combinations.test.tsx`)
Multi-feature state matrix and concurrent interactions:
- **Editing in Filtered Views**: Editing active item in `#/active`, destroying item via empty edit in `#/active` or `#/completed`.
- **Toggling in Filtered Views**: Toggling item in `#/active` causes instant disappearance from view while updating global counter.
- **Toggle-All in Filtered Views**: Triggering toggle-all while in `#/active` or `#/completed`.
- **Route Changes During Edit**: Route navigation while an item is in inline edit mode.
- **Clear Completed in Filtered Views**: Clearing completed while viewing `#/active` or `#/completed`.
- **Multi-Step State Machines**: Complex interleaved sequences of add -> toggle -> filter -> edit -> clear -> delete -> rehydrate.

### Tier 4: Realistic Workloads & Lifecycle Sessions (`tests/e2e/tier4_workloads.test.tsx`)
End-to-end real-world user workflows and multi-phase productivity sessions:
- **Daily Task Planning & Execution Session**: Creating morning todo backlog, completing items, filtering pending items, renaming tasks, clearing completed tasks, page reload rehydration.
- **Sprint Backlog Bulk Cleanup**: Bulk toggle-all, selective unchecking, batch clearing, list depletion to empty state.
- **Adversarial Multitasking Workflow**: Rapid interleaved additions, Unicode tasks, cancellation, filtering, and cross-tab storage sync simulation.

---

## 3. Test Runner & Execution Commands

### Running All Tests
```bash
npm test
```
Or with Vitest CLI directly:
```bash
npx vitest run
```

### Running Specific Tiers
```bash
# Run Tier 1 Feature Suite
npx vitest run tests/e2e/tier1_features.test.tsx

# Run Tier 2 Boundaries Suite
npx vitest run tests/e2e/tier2_boundaries.test.tsx

# Run Tier 3 Combinations Suite
npx vitest run tests/e2e/tier3_combinations.test.tsx

# Run Tier 4 Workloads Suite
npx vitest run tests/e2e/tier4_workloads.test.tsx
```

### Running in Watch Mode
```bash
npm run test:watch
```

---

## 4. Feature Coverage Mapping Matrix

| Category | Specification Requirement | Tier 1 Test Suite | Tier 2 Boundary Suite | Tier 3 Combinations Suite | Tier 4 Workloads Suite |
|---|---|:---:|:---:|:---:|:---:|
| Empty State | Hide `#main` & `#footer` when list is empty | `tier1_features.test.tsx` (5 tests) | `tier2_boundaries.test.tsx` | `tier3_combinations.test.tsx` | `tier4_workloads.test.tsx` |
| New Todo | Enter commits trimmed title; ignore empty | `tier1_features.test.tsx` (6 tests) | `tier2_boundaries.test.tsx` | `tier3_combinations.test.tsx` | `tier4_workloads.test.tsx` |
| Item Toggle | Flip `completed` state; toggle checkbox | `tier1_features.test.tsx` (5 tests) | `tier2_boundaries.test.tsx` | `tier3_combinations.test.tsx` | `tier4_workloads.test.tsx` |
| Inline Edit | Double-click, Enter/Blur save, Escape cancel, empty destroy | `tier1_features.test.tsx` (6 tests) | `tier2_boundaries.test.tsx` | `tier3_combinations.test.tsx` | `tier4_workloads.test.tsx` |
| Item Destroy | Click `.destroy` removes todo | `tier1_features.test.tsx` (5 tests) | `tier2_boundaries.test.tsx` | `tier3_combinations.test.tsx` | `tier4_workloads.test.tsx` |
| Toggle All | `#toggle-all` dual sync and mass toggle | `tier1_features.test.tsx` (5 tests) | `tier2_boundaries.test.tsx` | `tier3_combinations.test.tsx` | `tier4_workloads.test.tsx` |
| Active Count | `<strong>N</strong> item(s) left` | `tier1_features.test.tsx` (5 tests) | `tier2_boundaries.test.tsx` | `tier3_combinations.test.tsx` | `tier4_workloads.test.tsx` |
| Routing | `#/`, `#/active`, `#/completed`, `.selected` | `tier1_features.test.tsx` (5 tests) | `tier2_boundaries.test.tsx` | `tier3_combinations.test.tsx` | `tier4_workloads.test.tsx` |
| Clear Completed | Button visible when completed > 0; deletes completed | `tier1_features.test.tsx` (5 tests) | `tier2_boundaries.test.tsx` | `tier3_combinations.test.tsx` | `tier4_workloads.test.tsx` |
| LocalStorage | Key `todos-react`, rehydrate & persist | `tier1_features.test.tsx` (6 tests) | `tier2_boundaries.test.tsx` | `tier3_combinations.test.tsx` | `tier4_workloads.test.tsx` |
