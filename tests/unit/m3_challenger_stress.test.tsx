import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import App from '../../src/App';
import { TodoItem } from '../../src/components/TodoItem';
import { Todo } from '../../src/types/todo';

describe('M3 Adversarial Empirical Challenge Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';
  });

  // =========================================================================
  // Challenge 1: Rapid Typing & Input Boundary Stress
  // =========================================================================
  describe('1. Rapid Typing & Input Boundary Stress', () => {
    it('handles 50 rapid sequential Enter presses with empty/whitespace input without creating items', async () => {
      const { container } = render(<App />);
      const input = screen.getByPlaceholderText('What needs to be done?') as HTMLInputElement;

      for (let i = 0; i < 50; i++) {
        fireEvent.change(input, { target: { value: '   ' } });
        fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
      }

      expect(container.querySelector('.main')).not.toBeInTheDocument();
      expect(container.querySelector('.footer')).not.toBeInTheDocument();
      expect(input.value).toBe('   ');
    });

    it('handles rapid burst creation of 30 items via fireEvent change + keyDown in tight loop', () => {
      const { container } = render(<App />);
      const input = screen.getByPlaceholderText('What needs to be done?') as HTMLInputElement;

      for (let i = 1; i <= 30; i++) {
        fireEvent.change(input, { target: { value: `Burst Task ${i}` } });
        fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
      }

      const items = container.querySelectorAll('.todo-list li');
      expect(items).toHaveLength(30);
      expect(container.querySelector('.todo-count')).toHaveTextContent('30 items left');
      expect(input.value).toBe('');
    });

    it('handles massive payload input (10,000 characters) and special unicode/control characters', () => {
      const { container } = render(<App />);
      const input = screen.getByPlaceholderText('What needs to be done?') as HTMLInputElement;
      const massiveText = '🚀 ' + 'A'.repeat(5000) + ' <script>alert("xss")</script> ' + 'B'.repeat(5000) + ' 🏁';

      fireEvent.change(input, { target: { value: massiveText } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

      const items = container.querySelectorAll('.todo-list li');
      expect(items).toHaveLength(1);
      const label = container.querySelector('.todo-list li label')!;
      expect(label.textContent).toBe(massiveText.trim());
    });
  });

  // =========================================================================
  // Challenge 2: Rapid Toggling & Race Conditions with Filtering
  // =========================================================================
  describe('2. Rapid Toggling & State Transitions', () => {
    it('handles 100 rapid toggles on a single item without state drift or corruption', () => {
      const { container } = render(<App />);
      const input = screen.getByPlaceholderText('What needs to be done?') as HTMLInputElement;

      fireEvent.change(input, { target: { value: 'Toggle Stress Target' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

      const toggle = container.querySelector('.toggle') as HTMLInputElement;
      expect(toggle.checked).toBe(false);

      for (let i = 0; i < 100; i++) {
        fireEvent.click(toggle);
      }

      // After 100 toggles (even number), it should be back to false
      expect(toggle.checked).toBe(false);
      expect(container.querySelector('.todo-count')).toHaveTextContent('1 item left');
    });

    it('rapidly toggles item in Active filter view (item vanishes dynamically on toggle)', () => {
      window.location.hash = '#/active';
      const { container } = render(<App />);
      const input = screen.getByPlaceholderText('What needs to be done?') as HTMLInputElement;

      fireEvent.change(input, { target: { value: 'Active Task 1' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
      fireEvent.change(input, { target: { value: 'Active Task 2' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

      expect(container.querySelectorAll('.todo-list li')).toHaveLength(2);

      // Toggle Task 1 -> it becomes completed, so in Active view it must vanish immediately
      const firstToggle = container.querySelector('.toggle') as HTMLInputElement;
      fireEvent.click(firstToggle);

      expect(container.querySelectorAll('.todo-list li')).toHaveLength(1);
      expect(container.querySelector('.todo-count')).toHaveTextContent('1 item left');

      // Switch to Completed view -> Task 1 should appear
      act(() => {
        window.location.hash = '#/completed';
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      });

      expect(container.querySelectorAll('.todo-list li')).toHaveLength(1);
      const completedToggle = container.querySelector('.toggle') as HTMLInputElement;
      expect(completedToggle.checked).toBe(true);

      // Toggle it back to active from Completed view -> it should vanish from Completed view
      fireEvent.click(completedToggle);
      expect(container.querySelectorAll('.todo-list li')).toHaveLength(0);
      expect(container.querySelector('.todo-count')).toHaveTextContent('2 items left');
    });

    it('rapid toggle-all stress with 20 items preserves allChecked sync', () => {
      const { container } = render(<App />);
      const input = screen.getByPlaceholderText('What needs to be done?') as HTMLInputElement;

      for (let i = 1; i <= 20; i++) {
        fireEvent.change(input, { target: { value: `Item ${i}` } });
        fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
      }

      const toggleAll = container.querySelector('#toggle-all') as HTMLInputElement;
      expect(toggleAll.checked).toBe(false);

      // Toggle all to completed
      fireEvent.click(toggleAll);
      expect(toggleAll.checked).toBe(true);
      expect(container.querySelector('.todo-count')).toHaveTextContent('0 items left');

      // Toggle one individual item to active -> toggleAll must uncheck
      const firstItemToggle = container.querySelector('.toggle') as HTMLInputElement;
      fireEvent.click(firstItemToggle);
      expect(toggleAll.checked).toBe(false);
      expect(container.querySelector('.todo-count')).toHaveTextContent('1 item left');

      // Toggle all again -> should mark all completed
      fireEvent.click(toggleAll);
      expect(toggleAll.checked).toBe(true);
      expect(container.querySelector('.todo-count')).toHaveTextContent('0 items left');

      // Toggle all again -> should mark all active
      fireEvent.click(toggleAll);
      expect(toggleAll.checked).toBe(false);
      expect(container.querySelector('.todo-count')).toHaveTextContent('20 items left');
    });
  });

  // =========================================================================
  // Challenge 3: Inline Edit Blur/Escape Race Conditions & Deletion
  // =========================================================================
  describe('3. Inline Edit Blur/Escape Race Conditions', () => {
    it('suppresses blur commit when Escape keydown occurs before blur', () => {
      const onUpdate = vi.fn();
      const onDestroy = vi.fn();
      const todo: Todo = { id: 't1', title: 'Original Title', completed: false };

      const { container } = render(
        <TodoItem
          todo={todo}
          onToggle={vi.fn()}
          onDestroy={onDestroy}
          onUpdate={onUpdate}
        />
      );

      const label = container.querySelector('label')!;
      fireEvent.dblClick(label);

      const editInput = container.querySelector('.edit') as HTMLInputElement;
      fireEvent.change(editInput, { target: { value: 'Modified But Aborted' } });

      // Hit Escape
      fireEvent.keyDown(editInput, { key: 'Escape', code: 'Escape' });

      // Blur fires immediately after Escape
      fireEvent.blur(editInput);

      expect(onUpdate).not.toHaveBeenCalled();
      expect(onDestroy).not.toHaveBeenCalled();
      expect(container.querySelector('li')).not.toHaveClass('editing');
      expect(container.querySelector('label')).toHaveTextContent('Original Title');
    });

    it('double click on Item A, edit, then double click on Item B commits A and opens B', () => {
      const { container } = render(<App />);
      const input = screen.getByPlaceholderText('What needs to be done?') as HTMLInputElement;

      fireEvent.change(input, { target: { value: 'Item A' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
      fireEvent.change(input, { target: { value: 'Item B' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

      const labels = container.querySelectorAll('.todo-list li label');
      // Double click Item A
      fireEvent.dblClick(labels[0]);

      let items = container.querySelectorAll('.todo-list li');
      expect(items[0]).toHaveClass('editing');
      expect(items[1]).not.toHaveClass('editing');

      const editInputA = items[0].querySelector('.edit') as HTMLInputElement;
      fireEvent.change(editInputA, { target: { value: 'Item A Updated' } });

      // Now double click Item B -> this blurs Item A (saving it) and opens Item B
      fireEvent.blur(editInputA);
      const labelsAfter = container.querySelectorAll('.todo-list li label');
      fireEvent.dblClick(labelsAfter[1]);

      items = container.querySelectorAll('.todo-list li');
      expect(items[0].querySelector('label')).toHaveTextContent('Item A Updated');
      expect(items[0]).not.toHaveClass('editing');
      expect(items[1]).toHaveClass('editing');
    });

    it('deleting an item while it is currently in edit mode does not crash', () => {
      const { container } = render(<App />);
      const input = screen.getByPlaceholderText('What needs to be done?') as HTMLInputElement;

      fireEvent.change(input, { target: { value: 'Item To Edit and Destroy' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

      const label = container.querySelector('.todo-list li label')!;
      fireEvent.dblClick(label);

      const li = container.querySelector('li')!;
      expect(li).toHaveClass('editing');

      const destroyBtn = container.querySelector('.destroy') as HTMLButtonElement;
      fireEvent.click(destroyBtn);

      expect(container.querySelector('.main')).not.toBeInTheDocument();
      expect(container.querySelector('.footer')).not.toBeInTheDocument();
    });

    it('saving empty string via blur deletes item and updates empty state', () => {
      const { container } = render(<App />);
      const input = screen.getByPlaceholderText('What needs to be done?') as HTMLInputElement;

      fireEvent.change(input, { target: { value: 'Sole Item' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

      expect(container.querySelector('.main')).toBeInTheDocument();

      const label = container.querySelector('.todo-list li label')!;
      fireEvent.dblClick(label);

      const editInput = container.querySelector('.edit') as HTMLInputElement;
      fireEvent.change(editInput, { target: { value: '   ' } });
      fireEvent.blur(editInput);

      expect(container.querySelector('.main')).not.toBeInTheDocument();
      expect(container.querySelector('.footer')).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // Challenge 4: Rapid Hash Routing & State Transitions
  // =========================================================================
  describe('4. Rapid Hash Routing & State Transitions', () => {
    it('handles 100 rapid hash changes while maintaining correct filtering and selected class', () => {
      const { container } = render(<App />);
      const input = screen.getByPlaceholderText('What needs to be done?') as HTMLInputElement;

      fireEvent.change(input, { target: { value: 'Task 1 Active' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
      fireEvent.change(input, { target: { value: 'Task 2 Completed' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

      const toggles = container.querySelectorAll('.toggle');
      fireEvent.click(toggles[1]); // complete task 2

      const routes = ['#/', '#/active', '#/completed', '#/unknown', '#/active/extra', '#'];

      for (let i = 0; i < 100; i++) {
        const route = routes[i % routes.length];
        act(() => {
          window.location.hash = route;
          window.dispatchEvent(new HashChangeEvent('hashchange'));
        });
      }

      // Settle on #/active
      act(() => {
        window.location.hash = '#/active';
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      });

      expect(container.querySelectorAll('.todo-list li')).toHaveLength(1);
      expect(container.querySelector('.todo-list li label')).toHaveTextContent('Task 1 Active');
      expect(screen.getByRole('link', { name: 'Active' })).toHaveClass('selected');
      expect(screen.getByRole('link', { name: 'All' })).not.toHaveClass('selected');
      expect(screen.getByRole('link', { name: 'Completed' })).not.toHaveClass('selected');

      // Settle on #/completed
      act(() => {
        window.location.hash = '#/completed';
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      });

      expect(container.querySelectorAll('.todo-list li')).toHaveLength(1);
      expect(container.querySelector('.todo-list li label')).toHaveTextContent('Task 2 Completed');
      expect(screen.getByRole('link', { name: 'Completed' })).toHaveClass('selected');
      expect(screen.getByRole('link', { name: 'Active' })).not.toHaveClass('selected');

      // Settle on #/ (All)
      act(() => {
        window.location.hash = '#/';
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      });

      expect(container.querySelectorAll('.todo-list li')).toHaveLength(2);
      expect(screen.getByRole('link', { name: 'All' })).toHaveClass('selected');
    });
  });

  // =========================================================================
  // Challenge 5: Clear Completed & Toggle All Concurrent Operations
  // =========================================================================
  describe('5. Bulk Operations & Edge Conditions', () => {
    it('clicking Clear Completed while all items are completed resets to empty state', () => {
      const { container } = render(<App />);
      const input = screen.getByPlaceholderText('What needs to be done?') as HTMLInputElement;

      for (let i = 1; i <= 5; i++) {
        fireEvent.change(input, { target: { value: `Task ${i}` } });
        fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
      }

      const toggleAll = container.querySelector('#toggle-all') as HTMLInputElement;
      fireEvent.click(toggleAll);

      expect(container.querySelector('.todo-count')).toHaveTextContent('0 items left');
      const clearBtn = screen.getByRole('button', { name: 'Clear completed' });
      fireEvent.click(clearBtn);

      expect(container.querySelector('.main')).not.toBeInTheDocument();
      expect(container.querySelector('.footer')).not.toBeInTheDocument();
    });

    it('clicking Clear Completed removes only completed items and updates active count', () => {
      const { container } = render(<App />);
      const input = screen.getByPlaceholderText('What needs to be done?') as HTMLInputElement;

      fireEvent.change(input, { target: { value: 'Task 1' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
      fireEvent.change(input, { target: { value: 'Task 2' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
      fireEvent.change(input, { target: { value: 'Task 3' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

      const toggles = container.querySelectorAll('.toggle');
      fireEvent.click(toggles[0]); // Task 1 completed
      fireEvent.click(toggles[2]); // Task 3 completed

      expect(container.querySelector('.todo-count')).toHaveTextContent('1 item left');

      const clearBtn = screen.getByRole('button', { name: 'Clear completed' });
      fireEvent.click(clearBtn);

      expect(container.querySelectorAll('.todo-list li')).toHaveLength(1);
      expect(container.querySelector('.todo-list li label')).toHaveTextContent('Task 2');
      expect(container.querySelector('.todo-count')).toHaveTextContent('1 item left');
      expect(screen.queryByRole('button', { name: 'Clear completed' })).not.toBeInTheDocument();
    });

    it('clearing completed while in #/completed view clears all visible items and leaves active items intact', () => {
      const { container } = render(<App />);
      const input = screen.getByPlaceholderText('What needs to be done?') as HTMLInputElement;

      fireEvent.change(input, { target: { value: 'Active Item' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
      fireEvent.change(input, { target: { value: 'Completed Item 1' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
      fireEvent.change(input, { target: { value: 'Completed Item 2' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

      const toggles = container.querySelectorAll('.toggle');
      fireEvent.click(toggles[1]);
      fireEvent.click(toggles[2]);

      act(() => {
        window.location.hash = '#/completed';
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      });

      expect(container.querySelectorAll('.todo-list li')).toHaveLength(2);

      const clearBtn = screen.getByRole('button', { name: 'Clear completed' });
      fireEvent.click(clearBtn);

      // In completed view, list is now empty
      expect(container.querySelectorAll('.todo-list li')).toHaveLength(0);
      // Main section and Footer still exist because 1 active item remains
      expect(container.querySelector('.main')).toBeInTheDocument();
      expect(container.querySelector('.footer')).toBeInTheDocument();
      expect(container.querySelector('.todo-count')).toHaveTextContent('1 item left');
    });

    it('toggle-all in #/active view marks all items completed and clears active list', () => {
      const { container } = render(<App />);
      const input = screen.getByPlaceholderText('What needs to be done?') as HTMLInputElement;

      fireEvent.change(input, { target: { value: 'Task 1' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
      fireEvent.change(input, { target: { value: 'Task 2' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

      act(() => {
        window.location.hash = '#/active';
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      });

      expect(container.querySelectorAll('.todo-list li')).toHaveLength(2);

      const toggleAll = container.querySelector('#toggle-all') as HTMLInputElement;
      fireEvent.click(toggleAll);

      // Since all became completed, active list is empty
      expect(container.querySelectorAll('.todo-list li')).toHaveLength(0);
      expect(container.querySelector('.todo-count')).toHaveTextContent('0 items left');
      expect(toggleAll.checked).toBe(true);
    });

    it('Enter commit followed immediately by blur is idempotent and calls onUpdate only once', () => {
      const onUpdate = vi.fn();
      const onDestroy = vi.fn();
      const todo: Todo = { id: 'item-idem', title: 'Original', completed: false };

      const { container } = render(
        <TodoItem
          todo={todo}
          onToggle={vi.fn()}
          onDestroy={onDestroy}
          onUpdate={onUpdate}
        />
      );

      const label = container.querySelector('.todo-list li label, label')!;
      fireEvent.dblClick(label);

      const editInput = container.querySelector('.edit') as HTMLInputElement;
      fireEvent.change(editInput, { target: { value: 'New Value' } });

      // Hit Enter
      fireEvent.keyDown(editInput, { key: 'Enter', code: 'Enter' });
      // Immediately blur
      fireEvent.blur(editInput);

      expect(onUpdate).toHaveBeenCalledTimes(1);
      expect(onUpdate).toHaveBeenCalledWith('item-idem', 'New Value');
    });

    it('executes high-volume sequential lifecycle: 50 adds, 25 toggles, 10 edits, 5 deletes, clear completed', () => {
      const { container } = render(<App />);
      const input = screen.getByPlaceholderText('What needs to be done?') as HTMLInputElement;

      // 1. Add 50 items
      for (let i = 1; i <= 50; i++) {
        fireEvent.change(input, { target: { value: `Task #${i}` } });
        fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
      }
      expect(container.querySelectorAll('.todo-list li')).toHaveLength(50);
      expect(container.querySelector('.todo-count')).toHaveTextContent('50 items left');

      // 2. Toggle first 25 items
      const toggles = container.querySelectorAll('.toggle');
      for (let i = 0; i < 25; i++) {
        fireEvent.click(toggles[i]);
      }
      expect(container.querySelector('.todo-count')).toHaveTextContent('25 items left');

      // 3. Edit 10 items (items 26 to 35)
      const labels = container.querySelectorAll('.todo-list li label');
      for (let i = 25; i < 35; i++) {
        fireEvent.dblClick(labels[i]);
        const editInput = container.querySelectorAll('.todo-list li')[i].querySelector('.edit') as HTMLInputElement;
        fireEvent.change(editInput, { target: { value: `Edited Task #${i + 1}` } });
        fireEvent.keyDown(editInput, { key: 'Enter', code: 'Enter' });
      }

      // 4. Delete 5 items
      for (let i = 0; i < 5; i++) {
        const destroyBtns = container.querySelectorAll('.destroy');
        fireEvent.click(destroyBtns[0]);
      }
      expect(container.querySelectorAll('.todo-list li')).toHaveLength(45);

      // 5. Clear completed
      const clearBtn = screen.getByRole('button', { name: 'Clear completed' });
      fireEvent.click(clearBtn);

      // Originally 25 completed, 5 deleted (which were among the completed ones since they were at index 0-4) -> 20 remaining completed deleted
      // Total remaining should be 25 active items
      expect(container.querySelectorAll('.todo-list li')).toHaveLength(25);
      expect(container.querySelector('.todo-count')).toHaveTextContent('25 items left');
    });
  });
});

