import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../src/App';
import { parseHash } from '../../src/hooks/useHashLocation';

describe('Tier 5: White-Box Adversarial Coverage & Hardening Suite', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    localStorage.clear();
    window.location.hash = '';
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function createTodo(text: string) {
    const input = screen.getByPlaceholderText('What needs to be done?') as HTMLInputElement;
    if (
      text.includes('{') ||
      text.includes('[') ||
      text.length > 50 ||
      text.includes('\n') ||
      text.includes('\u00A0') ||
      text.includes('\u3000') ||
      text.includes('\u2000')
    ) {
      await user.click(input);
      await user.paste(text);
      await user.keyboard('{enter}');
    } else {
      await user.type(input, `${text}{enter}`);
    }
  }

  function getTodoListItems(container: HTMLElement): HTMLElement[] {
    return Array.from(container.querySelectorAll<HTMLElement>('.todo-list li'));
  }

  function getItemByTitle(container: HTMLElement, title: string): HTMLElement | null {
    const labels = Array.from(container.querySelectorAll<HTMLElement>('.todo-list li label'));
    const matched = labels.find((el) => el.textContent === title);
    return matched ? (matched.closest('li') as HTMLElement) : null;
  }

  // =========================================================================
  // 1. Adversarial Inline Edit State Machine & Race Conditions
  // =========================================================================
  describe('1. Adversarial Inline Edit State Machine & Race Conditions', () => {
    it('handles rapid Escape cancellation followed immediately by re-editing and saving', async () => {
      const { container } = render(<App />);
      await createTodo('Item 1');

      const item = getItemByTitle(container, 'Item 1')!;
      const label = item.querySelector('label')!;

      // 1st Edit: Enter edit mode, type change, cancel with Escape
      await user.dblClick(label);
      expect(item).toHaveClass('editing');
      const editInput1 = item.querySelector('.edit') as HTMLInputElement;
      await user.clear(editInput1);
      await user.type(editInput1, 'Aborted Edit{escape}');

      expect(item).not.toHaveClass('editing');
      expect(item.querySelector('label')?.textContent).toBe('Item 1');

      // 2nd Edit immediately: Enter edit mode again, type new text, save with Enter
      await user.dblClick(item.querySelector('label')!);
      expect(item).toHaveClass('editing');
      const editInput2 = item.querySelector('.edit') as HTMLInputElement;
      expect(editInput2.value).toBe('Item 1');
      await user.clear(editInput2);
      await user.type(editInput2, 'Confirmed Second Edit{enter}');

      expect(item).not.toHaveClass('editing');
      expect(item.querySelector('label')?.textContent).toBe('Confirmed Second Edit');

      // Confirm in storage
      const stored = JSON.parse(localStorage.getItem('todos-react')!);
      expect(stored[0].title).toBe('Confirmed Second Edit');
    });

    it('handles focus transition directly from editing Item 1 to editing Item 2 without state collision', async () => {
      const { container } = render(<App />);
      await createTodo('First Item');
      await createTodo('Second Item');

      const item1 = getItemByTitle(container, 'First Item')!;
      const item2 = getItemByTitle(container, 'Second Item')!;

      // Start editing Item 1
      await user.dblClick(item1.querySelector('label')!);
      expect(item1).toHaveClass('editing');
      const editInput1 = item1.querySelector('.edit') as HTMLInputElement;
      await user.clear(editInput1);
      await user.type(editInput1, 'First Item Updated');

      // Directly double-click Item 2 label (blurring Item 1 and opening Item 2)
      await user.dblClick(item2.querySelector('label')!);

      // Item 1 should have committed its blur edit
      expect(item1).not.toHaveClass('editing');
      expect(getItemByTitle(container, 'First Item Updated')).not.toBeNull();

      // Item 2 should now be in edit mode
      expect(item2).toHaveClass('editing');
      const editInput2 = item2.querySelector('.edit') as HTMLInputElement;
      expect(editInput2.value).toBe('Second Item');

      // Commit Item 2 with Enter
      await user.clear(editInput2);
      await user.type(editInput2, 'Second Item Updated{enter}');

      expect(item2).not.toHaveClass('editing');
      expect(getItemByTitle(container, 'Second Item Updated')).not.toBeNull();
      expect(getTodoListItems(container)).toHaveLength(2);
    });

    it('handles Escape cancellation followed immediately by pressing Enter without saving aborted text', async () => {
      const { container } = render(<App />);
      await createTodo('Original State');

      const item = getItemByTitle(container, 'Original State')!;
      await user.dblClick(item.querySelector('label')!);

      const editInput = item.querySelector('.edit') as HTMLInputElement;
      await user.clear(editInput);
      await user.type(editInput, 'Discarded Text{escape}');

      // Pressing enter on whatever element currently has focus
      await user.keyboard('{enter}');

      expect(item).not.toHaveClass('editing');
      expect(item.querySelector('label')?.textContent).toBe('Original State');
    });

    it('places cursor selection at the end of text when entering edit mode', async () => {
      const { container } = render(<App />);
      await createTodo('Check Cursor Position');

      const item = getItemByTitle(container, 'Check Cursor Position')!;
      await user.dblClick(item.querySelector('label')!);

      const editInput = item.querySelector('.edit') as HTMLInputElement;
      expect(editInput.selectionStart).toBe('Check Cursor Position'.length);
      expect(editInput.selectionEnd).toBe('Check Cursor Position'.length);
    });

    it('maintains both completed and editing classes when editing a completed todo item', async () => {
      const { container } = render(<App />);
      await createTodo('Done Item');

      const item = getItemByTitle(container, 'Done Item')!;
      const toggle = item.querySelector('.toggle') as HTMLInputElement;
      await user.click(toggle);

      expect(item).toHaveClass('completed');

      // Double-click into edit mode
      await user.dblClick(item.querySelector('label')!);
      expect(item).toHaveClass('completed');
      expect(item).toHaveClass('editing');

      // Edit and commit
      const editInput = item.querySelector('.edit') as HTMLInputElement;
      await user.clear(editInput);
      await user.type(editInput, 'Done Item Renamed{enter}');

      expect(item).not.toHaveClass('editing');
      expect(item).toHaveClass('completed');
      expect(item.querySelector('label')?.textContent).toBe('Done Item Renamed');
    });

    it('handles route change while an item is actively in edit mode', async () => {
      const { container } = render(<App />);
      await createTodo('Active Edit Item');
      await createTodo('Other Item');

      const item = getItemByTitle(container, 'Active Edit Item')!;
      await user.dblClick(item.querySelector('label')!);
      expect(item).toHaveClass('editing');

      // Navigate to #/completed while editing
      await user.click(screen.getByRole('link', { name: 'Completed' }));
      expect(getTodoListItems(container)).toHaveLength(0);

      // Return to #/active
      await user.click(screen.getByRole('link', { name: 'Active' }));
      expect(getTodoListItems(container)).toHaveLength(2);
      expect(getItemByTitle(container, 'Active Edit Item')).not.toBeNull();
    });
  });

  // =========================================================================
  // 2. Extreme Boundary Inputs & Character Set Hardening
  // =========================================================================
  describe('2. Extreme Boundary Inputs & Character Set Hardening', () => {
    it('handles multiline pasted text with embedded newlines and carriage returns', async () => {
      const { container } = render(<App />);
      const multilineText = 'Line 1\nLine 2\r\nLine 3';
      await createTodo(multilineText);

      // Should be created as single todo with multiline or trimmed text
      const items = getTodoListItems(container);
      expect(items).toHaveLength(1);
      expect(items[0].textContent).toContain('Line 1');
    });

    it('rejects input containing only ideographic and unicode whitespace characters', async () => {
      const { container } = render(<App />);
      // Ideographic space U+3000 and En quad U+2000
      const unicodeSpaces = '\u3000\u2000   \u3000';
      await createTodo(unicodeSpaces);

      expect(container.querySelector('.main')).not.toBeInTheDocument();
      expect(getTodoListItems(container)).toHaveLength(0);
    });

    it('handles zero-width characters, non-breaking spaces, and RTL bidirectional isolation', async () => {
      const { container } = render(<App />);
      const bidiAndZeroWidth = 'ZWS\u200B \u200C\u200D \u202E reversed text \u202C \u00A0 end';
      await createTodo(bidiAndZeroWidth);

      const items = getTodoListItems(container);
      expect(items).toHaveLength(1);
      expect(items[0].querySelector('label')?.textContent).toBe(bidiAndZeroWidth);

      // Verify toggle and edit work on special bidi item
      const toggle = items[0].querySelector('.toggle') as HTMLInputElement;
      await user.click(toggle);
      expect(items[0]).toHaveClass('completed');
    });

    it('handles a 5,000-character extreme length unbroken string without layout breakdown or state corruption', async () => {
      const { container } = render(<App />);
      const megaTitle = 'X'.repeat(5000);
      await createTodo(megaTitle);

      const item = getItemByTitle(container, megaTitle);
      expect(item).not.toBeNull();
      expect(item?.querySelector('label')?.textContent?.length).toBe(5000);

      // Verify persistence in localStorage
      const stored = JSON.parse(localStorage.getItem('todos-react')!);
      expect(stored[0].title.length).toBe(5000);

      // Edit the mega item down to normal size
      await user.dblClick(item!.querySelector('label')!);
      const editInput = item!.querySelector('.edit') as HTMLInputElement;
      await user.clear(editInput);
      await user.type(editInput, 'Normal Size{enter}');

      expect(getItemByTitle(container, 'Normal Size')).not.toBeNull();
    });

    it('resists prototype pollution and Javascript delimiter injection strings', async () => {
      const { container } = render(<App />);
      const injectionKeys = [
        '__proto__',
        'constructor',
        'prototype',
        'toString',
        'valueOf',
        '${7*7}',
        '{{constructor.constructor("alert(1)")()}}',
        '"><img src=x onerror=alert(1)>',
      ];

      for (const key of injectionKeys) {
        await createTodo(key);
      }

      expect(getTodoListItems(container)).toHaveLength(injectionKeys.length);
      expect(Object.prototype.hasOwnProperty('toString')).toBe(true);
      expect(typeof Object.prototype.toString).toBe('function');

      // Verify all items render strictly as literal strings
      for (const key of injectionKeys) {
        expect(getItemByTitle(container, key)).not.toBeNull();
      }
    });
  });

  // =========================================================================
  // 3. Storage Resilience, Quota Errors & Cross-Tab Synchronization
  // =========================================================================
  describe('3. Storage Resilience, Quota Errors & Cross-Tab Synchronization', () => {
    it('gracefully continues in-memory operations when localStorage.setItem throws QuotaExceededError', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const { container } = render(<App />);

      // Create first item normally
      await createTodo('Normal Item 1');
      expect(getTodoListItems(container)).toHaveLength(1);

      // Now mock setItem to throw QuotaExceededError
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        const error = new DOMException('The quota has been exceeded.', 'QuotaExceededError');
        throw error;
      });

      try {
        // Adding next todo should still succeed in React memory without throwing unhandled exceptions
        await createTodo('Memory Only Item 2');

        expect(getTodoListItems(container)).toHaveLength(2);
        expect(container.querySelector('.todo-count')).toHaveTextContent('2 items left');
        expect(warnSpy).toHaveBeenCalled();
      } finally {
        setItemSpy.mockRestore();
        warnSpy.mockRestore();
      }
    });

    it('synchronizes seamlessly when another browser tab updates localStorage via StorageEvent', () => {
      const { container } = render(<App />);
      expect(container.querySelector('.main')).not.toBeInTheDocument();

      // Simulate external tab adding 2 todos
      const externalTodos = [
        { id: 'ext-1', title: 'External Tab Task 1', completed: false },
        { id: 'ext-2', title: 'External Tab Task 2', completed: true },
      ];

      act(() => {
        window.dispatchEvent(
          new StorageEvent('storage', {
            key: 'todos-react',
            newValue: JSON.stringify(externalTodos),
          })
        );
      });

      expect(getTodoListItems(container)).toHaveLength(2);
      expect(getItemByTitle(container, 'External Tab Task 1')).not.toBeNull();
      expect(getItemByTitle(container, 'External Tab Task 2')).toHaveClass('completed');
      expect(container.querySelector('.todo-count')).toHaveTextContent('1 item left');
    });

    it('handles external tab clearing localStorage (newValue = null) via StorageEvent', async () => {
      const { container } = render(<App />);
      await createTodo('Local Task 1');
      expect(getTodoListItems(container)).toHaveLength(1);

      // External tab clears localStorage
      act(() => {
        window.dispatchEvent(
          new StorageEvent('storage', {
            key: 'todos-react',
            newValue: null,
          })
        );
      });

      // Should return to empty state
      expect(container.querySelector('.main')).not.toBeInTheDocument();
      expect(container.querySelector('.footer')).not.toBeInTheDocument();
    });

    it('ignores storage events with null or non-matching keys safely', () => {
      const { container } = render(<App />);

      act(() => {
        window.dispatchEvent(
          new StorageEvent('storage', {
            key: null,
            newValue: null,
          })
        );
      });

      expect(container.querySelector('.main')).not.toBeInTheDocument();
    });

    it('ignores storage events for irrelevant keys and survives corrupted storage events', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      try {
        const { container } = render(<App />);
        await createTodo('Stable Task');

        // Irrelevant key event
        act(() => {
          window.dispatchEvent(
            new StorageEvent('storage', {
              key: 'other-app-key',
              newValue: JSON.stringify([{ id: 'other', title: 'other', completed: false }]),
            })
          );
        });
        expect(getTodoListItems(container)).toHaveLength(1);

        // Corrupted JSON storage event for todos-react
        act(() => {
          window.dispatchEvent(
            new StorageEvent('storage', {
              key: 'todos-react',
              newValue: '{broken json',
            })
          );
        });
        // App should not crash and should log warning
        expect(getTodoListItems(container)).toHaveLength(1);
        expect(warnSpy).toHaveBeenCalled();
      } finally {
        warnSpy.mockRestore();
      }
    });

    it('cleans up malformed, null, and non-conforming objects in localStorage array during initial load', () => {
      const mixedBag = [
        null,
        undefined,
        123,
        'just a string',
        { onlyId: '123' },
        { id: 'valid-1', title: 'Resilient Valid Todo', completed: false },
        { id: 'invalid-2', title: 456, completed: false },
        { id: 'invalid-3', title: 'Missing completion' },
        { id: 'valid-2', title: 'Second Valid Todo', completed: true },
      ];
      localStorage.setItem('todos-react', JSON.stringify(mixedBag));

      const { container } = render(<App />);
      const items = getTodoListItems(container);

      // Exactly the 2 valid items should be parsed and rendered
      expect(items).toHaveLength(2);
      expect(getItemByTitle(container, 'Resilient Valid Todo')).not.toBeNull();
      expect(getItemByTitle(container, 'Second Valid Todo')).not.toBeNull();
      expect(container.querySelector('.todo-count')).toHaveTextContent('1 item left');
    });
  });

  // =========================================================================
  // 4. Route Navigation & Filter Edge Cases
  // =========================================================================
  describe('4. Route Navigation & Filter Edge Cases', () => {
    it('correctly parses complex, messy, and query-parameterized hash routes', () => {
      expect(parseHash('')).toBe('all');
      expect(parseHash('#')).toBe('all');
      expect(parseHash('#/')).toBe('all');
      expect(parseHash('#//')).toBe('all');
      expect(parseHash('#/all')).toBe('all');
      expect(parseHash('#/ACTIVE')).toBe('active');
      expect(parseHash('#/Completed')).toBe('completed');
      expect(parseHash('#active')).toBe('active');
      expect(parseHash('#completed')).toBe('completed');
      expect(parseHash('#/active///')).toBe('active');
      expect(parseHash('#/completed///')).toBe('completed');
      expect(parseHash('#/unknown/subpath')).toBe('all');
      expect(parseHash('#random-hash')).toBe('all');
    });

    it('survives rapid storm of hashchange and popstate events without desync', async () => {
      const { container } = render(<App />);
      await createTodo('Task 1');
      await createTodo('Task 2');

      const item2 = getItemByTitle(container, 'Task 2')!;
      await user.click(item2.querySelector('.toggle') as HTMLInputElement);

      // Fire 30 rapid alternating hash changes
      const routes = ['#/active', '#/completed', '#/', '#/unknown', '#/active', '#/completed'];
      for (let i = 0; i < 30; i++) {
        const route = routes[i % routes.length];
        act(() => {
          window.location.hash = route;
          window.dispatchEvent(new HashChangeEvent('hashchange'));
        });
      }

      // Final settled state: set to #/active
      act(() => {
        window.location.hash = '#/active';
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      });

      expect(screen.getByRole('link', { name: 'Active' })).toHaveClass('selected');
      expect(getTodoListItems(container)).toHaveLength(1);
      expect(getTodoListItems(container)[0]).toHaveTextContent('Task 1');
    });

    it('handles adding new todos while in #/completed filter without losing count or view integrity', async () => {
      const { container } = render(<App />);
      await createTodo('Initial Done');

      await user.click(getItemByTitle(container, 'Initial Done')!.querySelector('.toggle') as HTMLInputElement);

      // Go to completed view
      await user.click(screen.getByRole('link', { name: 'Completed' }));
      expect(getTodoListItems(container)).toHaveLength(1);

      // Add a new todo while in #/completed view
      await createTodo('Newly Added Active');

      // Newly added item is active, so it should NOT appear in #/completed view
      expect(getTodoListItems(container)).toHaveLength(1);
      expect(getItemByTitle(container, 'Initial Done')).not.toBeNull();
      expect(getItemByTitle(container, 'Newly Added Active')).toBeNull();

      // Active count should now reflect 1 item left
      expect(container.querySelector('.todo-count')).toHaveTextContent('1 item left');

      // Switch to All to see both
      await user.click(screen.getByRole('link', { name: 'All' }));
      expect(getTodoListItems(container)).toHaveLength(2);
    });
  });

  // =========================================================================
  // 5. High-Load Batch Operations & Identical Titles
  // =========================================================================
  describe('5. High-Load Batch Operations & Identical Titles', () => {
    it('manages 50 items with bulk toggle, selective uncheck, and bulk clear without performance degradation', async () => {
      // Fast seed 50 items via localStorage
      const seed = Array.from({ length: 50 }, (_, i) => ({
        id: `seed-${i}`,
        title: `Bulk Task ${i + 1}`,
        completed: false,
      }));
      localStorage.setItem('todos-react', JSON.stringify(seed));

      // Render to load 50 items
      const { container } = render(<App />);
      expect(getTodoListItems(container)).toHaveLength(50);
      expect(container.querySelector('.todo-count')).toHaveTextContent('50 items left');

      // Toggle all complete
      const toggleAll = screen.getAllByLabelText('Mark all as complete')[0] as HTMLInputElement;
      await user.click(toggleAll);

      expect(toggleAll.checked).toBe(true);
      expect(container.querySelector('.todo-count')).toHaveTextContent('0 items left');

      // Uncheck task 5 and task 25
      const task5 = getItemByTitle(container, 'Bulk Task 5')!;
      const task25 = getItemByTitle(container, 'Bulk Task 25')!;
      await user.click(task5.querySelector('.toggle') as HTMLInputElement);
      await user.click(task25.querySelector('.toggle') as HTMLInputElement);

      expect(toggleAll.checked).toBe(false);
      expect(container.querySelector('.todo-count')).toHaveTextContent('2 items left');

      // Clear all 48 completed items
      const clearBtn = screen.getByRole('button', { name: 'Clear completed' });
      await user.click(clearBtn);

      expect(getTodoListItems(container)).toHaveLength(2);
      expect(getItemByTitle(container, 'Bulk Task 5')).not.toBeNull();
      expect(getItemByTitle(container, 'Bulk Task 25')).not.toBeNull();
    });

    it('correctly isolates and handles multiple items with identical titles', async () => {
      const { container } = render(<App />);

      // Create 3 items with exact same name
      await createTodo('Duplicate Title');
      await createTodo('Duplicate Title');
      await createTodo('Duplicate Title');

      const items = getTodoListItems(container);
      expect(items).toHaveLength(3);

      // Toggle only the middle item
      const middleToggle = items[1].querySelector('.toggle') as HTMLInputElement;
      await user.click(middleToggle);

      expect(items[0]).not.toHaveClass('completed');
      expect(items[1]).toHaveClass('completed');
      expect(items[2]).not.toHaveClass('completed');
      expect(container.querySelector('.todo-count')).toHaveTextContent('2 items left');

      // Edit only the first item
      await user.dblClick(items[0].querySelector('label')!);
      const editInput = items[0].querySelector('.edit') as HTMLInputElement;
      await user.clear(editInput);
      await user.type(editInput, 'Unique First Title{enter}');

      expect(items[0].querySelector('label')?.textContent).toBe('Unique First Title');
      expect(items[1].querySelector('label')?.textContent).toBe('Duplicate Title');
      expect(items[2].querySelector('label')?.textContent).toBe('Duplicate Title');

      // Delete only the last item
      const destroyLast = items[2].querySelector('.destroy') as HTMLButtonElement;
      await user.click(destroyLast);

      const remaining = getTodoListItems(container);
      expect(remaining).toHaveLength(2);
      expect(remaining[0].querySelector('label')?.textContent).toBe('Unique First Title');
      expect(remaining[1].querySelector('label')?.textContent).toBe('Duplicate Title');
      expect(remaining[1]).toHaveClass('completed');
    });

    it('handles single item edge case through entire lifecycle in all views', async () => {
      const { container } = render(<App />);
      await createTodo('Solo Item');

      // 1. In #/active view: complete it -> disappears immediately
      await user.click(screen.getByRole('link', { name: 'Active' }));
      expect(getTodoListItems(container)).toHaveLength(1);
      const solo = getItemByTitle(container, 'Solo Item')!;
      await user.click(solo.querySelector('.toggle') as HTMLInputElement);
      expect(getTodoListItems(container)).toHaveLength(0);

      // 2. In #/completed view: reactivate it -> disappears immediately
      await user.click(screen.getByRole('link', { name: 'Completed' }));
      expect(getTodoListItems(container)).toHaveLength(1);
      const soloDone = getItemByTitle(container, 'Solo Item')!;
      await user.click(soloDone.querySelector('.toggle') as HTMLInputElement);
      expect(getTodoListItems(container)).toHaveLength(0);

      // 3. In #/all view: edit to empty -> destroys item and returns app to empty state
      await user.click(screen.getByRole('link', { name: 'All' }));
      expect(getTodoListItems(container)).toHaveLength(1);
      const soloActive = getItemByTitle(container, 'Solo Item')!;
      await user.dblClick(soloActive.querySelector('label')!);
      const edit = soloActive.querySelector('.edit') as HTMLInputElement;
      await user.clear(edit);
      await user.type(edit, '{enter}');

      expect(container.querySelector('.main')).not.toBeInTheDocument();
      expect(container.querySelector('.footer')).not.toBeInTheDocument();
    });

    it('handles rapid sequential toggle-all switching back and forth', async () => {
      const { container } = render(<App />);
      await createTodo('Task A');
      await createTodo('Task B');
      await createTodo('Task C');

      const toggleAll = screen.getByLabelText('Mark all as complete') as HTMLInputElement;

      for (let i = 0; i < 6; i++) {
        await user.click(toggleAll);
      }

      // After 6 toggles (even number), state should be back to all active
      expect(toggleAll.checked).toBe(false);
      expect(container.querySelector('.todo-count')).toHaveTextContent('3 items left');
      const items = getTodoListItems(container);
      expect(items[0]).not.toHaveClass('completed');
      expect(items[1]).not.toHaveClass('completed');
      expect(items[2]).not.toHaveClass('completed');
    });
  });
});
