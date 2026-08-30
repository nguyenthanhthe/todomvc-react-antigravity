import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../src/App';

describe('Tier 3: Cross-Feature Combinations Suite', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    localStorage.clear();
    window.location.hash = '';
  });

  async function createTodo(text: string) {
    const input = screen.getByPlaceholderText('What needs to be done?');
    await user.type(input, `${text}{enter}`);
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
  // 1. Inline Editing in Filtered Views
  // =========================================================================
  describe('1. Inline Editing in Filtered Views', () => {
    it('allows editing an active item while on #/active route and keeps it visible', async () => {
      const { container } = render(<App />);
      await createTodo('Task 1');
      await createTodo('Task 2');

      // Go to #/active
      await user.click(screen.getByRole('link', { name: 'Active' }));

      const item1 = getItemByTitle(container, 'Task 1')!;
      await user.dblClick(item1.querySelector('label')!);

      const editInput = item1.querySelector('.edit') as HTMLInputElement;
      await user.clear(editInput);
      await user.type(editInput, 'Task 1 Modified{enter}');

      expect(getItemByTitle(container, 'Task 1 Modified')).not.toBeNull();
      expect(getTodoListItems(container)).toHaveLength(2);
    });

    it('destroys item via empty string edit in #/active view and decrements active count', async () => {
      const { container } = render(<App />);
      await createTodo('Active Keep');
      await createTodo('Active Delete');

      await user.click(screen.getByRole('link', { name: 'Active' }));

      const itemToDelete = getItemByTitle(container, 'Active Delete')!;
      await user.dblClick(itemToDelete.querySelector('label')!);

      const editInput = itemToDelete.querySelector('.edit') as HTMLInputElement;
      await user.clear(editInput);
      await user.type(editInput, '{enter}');

      expect(getTodoListItems(container)).toHaveLength(1);
      expect(getItemByTitle(container, 'Active Keep')).not.toBeNull();
      expect(container.querySelector('.todo-count')).toHaveTextContent('1 item left');
    });

    it('allows editing a completed item in #/completed view and keeps it completed', async () => {
      const { container } = render(<App />);
      await createTodo('Completed Item');

      const item = getItemByTitle(container, 'Completed Item')!;
      await user.click(item.querySelector('.toggle') as HTMLInputElement);

      await user.click(screen.getByRole('link', { name: 'Completed' }));

      const compItem = getItemByTitle(container, 'Completed Item')!;
      await user.dblClick(compItem.querySelector('label')!);

      const editInput = compItem.querySelector('.edit') as HTMLInputElement;
      await user.clear(editInput);
      await user.type(editInput, 'Renamed Done Task{enter}');

      expect(getItemByTitle(container, 'Renamed Done Task')).toHaveClass('completed');
      expect(getTodoListItems(container)).toHaveLength(1);
    });
  });

  // =========================================================================
  // 2. Toggling Items in Filtered Views
  // =========================================================================
  describe('2. Item Toggling in Filtered Views', () => {
    it('immediately removes item from #/active view upon marking it completed', async () => {
      const { container } = render(<App />);
      await createTodo('Task 1');
      await createTodo('Task 2');

      await user.click(screen.getByRole('link', { name: 'Active' }));
      expect(getTodoListItems(container)).toHaveLength(2);

      const item1 = getItemByTitle(container, 'Task 1')!;
      await user.click(item1.querySelector('.toggle') as HTMLInputElement);

      // Task 1 should immediately disappear from active view
      expect(getTodoListItems(container)).toHaveLength(1);
      expect(getItemByTitle(container, 'Task 2')).not.toBeNull();
      expect(getItemByTitle(container, 'Task 1')).toBeNull();
      expect(container.querySelector('.todo-count')).toHaveTextContent('1 item left');
    });

    it('immediately removes item from #/completed view upon marking it active', async () => {
      const { container } = render(<App />);
      await createTodo('Done 1');
      await createTodo('Done 2');

      await user.click(getItemByTitle(container, 'Done 1')!.querySelector('.toggle') as HTMLInputElement);
      await user.click(getItemByTitle(container, 'Done 2')!.querySelector('.toggle') as HTMLInputElement);

      await user.click(screen.getByRole('link', { name: 'Completed' }));
      expect(getTodoListItems(container)).toHaveLength(2);

      const done1 = getItemByTitle(container, 'Done 1')!;
      await user.click(done1.querySelector('.toggle') as HTMLInputElement);

      // Done 1 should disappear from completed view
      expect(getTodoListItems(container)).toHaveLength(1);
      expect(getItemByTitle(container, 'Done 2')).not.toBeNull();
      expect(getItemByTitle(container, 'Done 1')).toBeNull();
      expect(container.querySelector('.todo-count')).toHaveTextContent('1 item left');
    });
  });

  // =========================================================================
  // 3. Toggle-All Interactions in Filtered Views
  // =========================================================================
  describe('3. Toggle-All in Filtered Views', () => {
    it('marks all items completed when toggle-all is clicked from #/active view (clearing active list view)', async () => {
      const { container } = render(<App />);
      await createTodo('Task 1');
      await createTodo('Task 2');

      await user.click(screen.getByRole('link', { name: 'Active' }));
      expect(getTodoListItems(container)).toHaveLength(2);

      const toggleAll = screen.getByLabelText('Mark all as complete');
      await user.click(toggleAll);

      // In active view, all are completed now, so active view is empty
      expect(getTodoListItems(container)).toHaveLength(0);
      expect(container.querySelector('.todo-count')).toHaveTextContent('0 items left');

      // Switch to All view to confirm all 2 exist and are completed
      await user.click(screen.getByRole('link', { name: 'All' }));
      expect(getTodoListItems(container)).toHaveLength(2);
      expect(getTodoListItems(container)[0]).toHaveClass('completed');
      expect(getTodoListItems(container)[1]).toHaveClass('completed');
    });

    it('marks all items active when toggle-all is clicked from #/completed view', async () => {
      const { container } = render(<App />);
      await createTodo('Task 1');
      await createTodo('Task 2');

      const toggleAll = screen.getByLabelText('Mark all as complete');
      await user.click(toggleAll); // complete all

      await user.click(screen.getByRole('link', { name: 'Completed' }));
      expect(getTodoListItems(container)).toHaveLength(2);

      await user.click(toggleAll); // mark all active

      // Completed view should now be empty
      expect(getTodoListItems(container)).toHaveLength(0);
      expect(container.querySelector('.todo-count')).toHaveTextContent('2 items left');
    });
  });

  // =========================================================================
  // 4. Clear Completed in Filtered Views
  // =========================================================================
  describe('4. Clear Completed in Filtered Views', () => {
    it('clears completed items while in #/active view without removing active items', async () => {
      const { container } = render(<App />);
      await createTodo('Active 1');
      await createTodo('Completed 1');

      await user.click(getItemByTitle(container, 'Completed 1')!.querySelector('.toggle') as HTMLInputElement);

      await user.click(screen.getByRole('link', { name: 'Active' }));
      expect(getTodoListItems(container)).toHaveLength(1);

      // Click clear completed in footer
      const clearBtn = screen.getByRole('button', { name: 'Clear completed' });
      await user.click(clearBtn);

      expect(getTodoListItems(container)).toHaveLength(1);
      expect(getItemByTitle(container, 'Active 1')).not.toBeNull();
      expect(screen.queryByRole('button', { name: 'Clear completed' })).not.toBeInTheDocument();

      // Check All view to verify completed item was truly removed from state
      await user.click(screen.getByRole('link', { name: 'All' }));
      expect(getTodoListItems(container)).toHaveLength(1);
    });

    it('clears all items in #/completed view when all items were completed, returning app to empty state', async () => {
      const { container } = render(<App />);
      await createTodo('Done 1');
      await createTodo('Done 2');

      await user.click(screen.getByLabelText('Mark all as complete'));
      await user.click(screen.getByRole('link', { name: 'Completed' }));

      const clearBtn = screen.getByRole('button', { name: 'Clear completed' });
      await user.click(clearBtn);

      expect(container.querySelector('.main')).not.toBeInTheDocument();
      expect(container.querySelector('.footer')).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // 5. Complex Multi-Step State Transitions
  // =========================================================================
  describe('5. Complex Multi-Step State Machine Sequences', () => {
    it('executes full sequence: create -> toggle -> filter -> edit -> clear -> delete -> storage rehydrate', async () => {
      const { unmount, container } = render(<App />);

      // Step 1: Create 4 items
      await createTodo('Alpha');
      await createTodo('Beta');
      await createTodo('Gamma');
      await createTodo('Delta');
      expect(container.querySelector('.todo-count')).toHaveTextContent('4 items left');

      // Step 2: Toggle Alpha and Gamma to completed
      await user.click(getItemByTitle(container, 'Alpha')!.querySelector('.toggle') as HTMLInputElement);
      await user.click(getItemByTitle(container, 'Gamma')!.querySelector('.toggle') as HTMLInputElement);
      expect(container.querySelector('.todo-count')).toHaveTextContent('2 items left');

      // Step 3: Switch to Active filter
      await user.click(screen.getByRole('link', { name: 'Active' }));
      expect(getTodoListItems(container)).toHaveLength(2);

      // Step 4: Edit Beta to Beta-Prime
      const beta = getItemByTitle(container, 'Beta')!;
      await user.dblClick(beta.querySelector('label')!);
      const editInput = beta.querySelector('.edit') as HTMLInputElement;
      await user.clear(editInput);
      await user.type(editInput, 'Beta-Prime{enter}');
      expect(getItemByTitle(container, 'Beta-Prime')).not.toBeNull();

      // Step 5: Switch to Completed filter and Clear Completed
      await user.click(screen.getByRole('link', { name: 'Completed' }));
      expect(getTodoListItems(container)).toHaveLength(2);
      await user.click(screen.getByRole('button', { name: 'Clear completed' }));
      expect(getTodoListItems(container)).toHaveLength(0);

      // Step 6: Switch to All view and Delete Delta
      await user.click(screen.getByRole('link', { name: 'All' }));
      expect(getTodoListItems(container)).toHaveLength(2); // Beta-Prime, Delta
      const delta = getItemByTitle(container, 'Delta')!;
      await user.click(delta.querySelector('.destroy') as HTMLButtonElement);

      expect(getTodoListItems(container)).toHaveLength(1);
      expect(getItemByTitle(container, 'Beta-Prime')).not.toBeNull();
      expect(container.querySelector('.todo-count')).toHaveTextContent('1 item left');

      // Step 7: Simulate page refresh & rehydration
      unmount();
      const { container: reloaded } = render(<App />);
      expect(getTodoListItems(reloaded)).toHaveLength(1);
      expect(getItemByTitle(reloaded, 'Beta-Prime')).not.toBeNull();
      expect(reloaded.querySelector('.todo-count')).toHaveTextContent('1 item left');
    });
  });
});
