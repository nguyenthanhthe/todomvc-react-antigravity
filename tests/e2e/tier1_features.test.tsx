import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../src/App';

describe('Tier 1: Comprehensive Feature Coverage Suite', () => {
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
  // Category 1: Empty State (>=5 tests)
  // =========================================================================
  describe('1. Empty State', () => {
    it('hides main section and footer on initial empty load', () => {
      const { container } = render(<App />);
      expect(container.querySelector('.main')).not.toBeInTheDocument();
      expect(container.querySelector('.footer')).not.toBeInTheDocument();
    });

    it('always displays the header with title and new-todo input in empty state', () => {
      const { container } = render(<App />);
      expect(container.querySelector('.header')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('todos');
      expect(screen.getByPlaceholderText('What needs to be done?')).toBeInTheDocument();
    });

    it('displays static info footer outside todoapp in empty state', () => {
      const { container } = render(<App />);
      expect(container.querySelector('.info')).toBeInTheDocument();
      expect(container.querySelector('.info')).toHaveTextContent('Double-click to edit a todo');
    });

    it('returns to empty state (hiding main and footer) when the only todo is deleted', async () => {
      const { container } = render(<App />);
      await createTodo('Only item');
      expect(container.querySelector('.main')).toBeInTheDocument();
      expect(container.querySelector('.footer')).toBeInTheDocument();

      const item = getItemByTitle(container, 'Only item')!;
      const destroyBtn = item.querySelector('.destroy') as HTMLButtonElement;
      await user.click(destroyBtn);

      expect(container.querySelector('.main')).not.toBeInTheDocument();
      expect(container.querySelector('.footer')).not.toBeInTheDocument();
    });

    it('returns to empty state when all items are cleared via clear-completed', async () => {
      const { container } = render(<App />);
      await createTodo('Task 1');
      await createTodo('Task 2');

      const toggleAll = screen.getByLabelText('Mark all as complete');
      await user.click(toggleAll);

      const clearBtn = screen.getByRole('button', { name: 'Clear completed' });
      await user.click(clearBtn);

      expect(container.querySelector('.main')).not.toBeInTheDocument();
      expect(container.querySelector('.footer')).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // Category 2: Creation & Whitespace Trimming (>=5 tests)
  // =========================================================================
  describe('2. Creation & Trimming', () => {
    it('creates a new todo item upon pressing Enter', async () => {
      const { container } = render(<App />);
      await createTodo('Buy groceries');

      const items = getTodoListItems(container);
      expect(items).toHaveLength(1);
      expect(items[0]).toHaveTextContent('Buy groceries');
    });

    it('clears the new-todo input field after successful creation', async () => {
      render(<App />);
      const input = screen.getByPlaceholderText('What needs to be done?') as HTMLInputElement;
      await user.type(input, 'New task{enter}');

      expect(input.value).toBe('');
    });

    it('trims leading and trailing whitespace from submitted title', async () => {
      const { container } = render(<App />);
      await createTodo('   Learn Vitest and React   ');

      const item = getItemByTitle(container, 'Learn Vitest and React');
      expect(item).not.toBeNull();
      expect(item?.querySelector('label')?.textContent).toBe('Learn Vitest and React');
    });

    it('ignores submission when input contains only empty string', async () => {
      const { container } = render(<App />);
      const input = screen.getByPlaceholderText('What needs to be done?');
      await user.type(input, '{enter}');

      expect(container.querySelector('.main')).not.toBeInTheDocument();
      expect(getTodoListItems(container)).toHaveLength(0);
    });

    it('ignores submission when input contains only whitespace', async () => {
      const { container } = render(<App />);
      const input = screen.getByPlaceholderText('What needs to be done?');
      await user.type(input, '     {enter}');

      expect(container.querySelector('.main')).not.toBeInTheDocument();
      expect(getTodoListItems(container)).toHaveLength(0);
    });

    it('appends multiple todos sequentially in FIFO order', async () => {
      const { container } = render(<App />);
      await createTodo('First');
      await createTodo('Second');
      await createTodo('Third');

      const items = getTodoListItems(container);
      expect(items).toHaveLength(3);
      expect(items[0]).toHaveTextContent('First');
      expect(items[1]).toHaveTextContent('Second');
      expect(items[2]).toHaveTextContent('Third');
    });
  });

  // =========================================================================
  // Category 3: Item Display & Toggle (>=5 tests)
  // =========================================================================
  describe('3. Item Display & Toggle', () => {
    it('renders a new todo as active (unchecked and without completed class)', async () => {
      const { container } = render(<App />);
      await createTodo('Active Task');

      const item = getItemByTitle(container, 'Active Task')!;
      expect(item).not.toHaveClass('completed');
      const toggle = item.querySelector('.toggle') as HTMLInputElement;
      expect(toggle.checked).toBe(false);
    });

    it('toggles an item to completed upon clicking its checkbox', async () => {
      const { container } = render(<App />);
      await createTodo('Toggle Me');

      const item = getItemByTitle(container, 'Toggle Me')!;
      const toggle = item.querySelector('.toggle') as HTMLInputElement;
      await user.click(toggle);

      expect(item).toHaveClass('completed');
      expect(toggle.checked).toBe(true);
    });

    it('toggles a completed item back to active upon unchecking', async () => {
      const { container } = render(<App />);
      await createTodo('Reactivate Me');

      const item = getItemByTitle(container, 'Reactivate Me')!;
      const toggle = item.querySelector('.toggle') as HTMLInputElement;
      await user.click(toggle); // completed
      expect(item).toHaveClass('completed');

      await user.click(toggle); // active again
      expect(item).not.toHaveClass('completed');
      expect(toggle.checked).toBe(false);
    });

    it('renders label with item title and toggle checkbox inside .view container', async () => {
      const { container } = render(<App />);
      await createTodo('Check View');

      const item = getItemByTitle(container, 'Check View')!;
      const view = item.querySelector('.view');
      expect(view).toBeInTheDocument();
      expect(view?.querySelector('.toggle')).toBeInTheDocument();
      expect(view?.querySelector('label')).toHaveTextContent('Check View');
      expect(view?.querySelector('.destroy')).toBeInTheDocument();
    });

    it('allows toggling multiple items independently', async () => {
      const { container } = render(<App />);
      await createTodo('Item A');
      await createTodo('Item B');
      await createTodo('Item C');

      const itemB = getItemByTitle(container, 'Item B')!;
      await user.click(itemB.querySelector('.toggle') as HTMLInputElement);

      const itemA = getItemByTitle(container, 'Item A')!;
      const itemC = getItemByTitle(container, 'Item C')!;

      expect(itemA).not.toHaveClass('completed');
      expect(itemB).toHaveClass('completed');
      expect(itemC).not.toHaveClass('completed');
    });
  });

  // =========================================================================
  // Category 4: Inline Editing (>=5 tests)
  // =========================================================================
  describe('4. Inline Editing', () => {
    it('enters edit mode on label double-click (adds editing class and renders edit input)', async () => {
      const { container } = render(<App />);
      await createTodo('Editable Item');

      const item = getItemByTitle(container, 'Editable Item')!;
      const label = item.querySelector('label')!;
      await user.dblClick(label);

      expect(item).toHaveClass('editing');
      const editInput = item.querySelector('.edit') as HTMLInputElement;
      expect(editInput).toBeInTheDocument();
      expect(editInput.value).toBe('Editable Item');
    });

    it('commits edited title and exits edit mode on Enter key', async () => {
      const { container } = render(<App />);
      await createTodo('Original Title');

      const item = getItemByTitle(container, 'Original Title')!;
      await user.dblClick(item.querySelector('label')!);

      const editInput = item.querySelector('.edit') as HTMLInputElement;
      await user.clear(editInput);
      await user.type(editInput, 'Updated Title{enter}');

      expect(item).not.toHaveClass('editing');
      expect(item.querySelector('label')?.textContent).toBe('Updated Title');
    });

    it('commits edited title and exits edit mode on blur event', async () => {
      const { container } = render(<App />);
      await createTodo('Blur Test');

      const item = getItemByTitle(container, 'Blur Test')!;
      await user.dblClick(item.querySelector('label')!);

      const editInput = item.querySelector('.edit') as HTMLInputElement;
      await user.clear(editInput);
      await user.type(editInput, 'Saved via Blur');
      const outside = screen.getByRole('heading', { level: 1 });
      await user.click(outside);

      expect(item).not.toHaveClass('editing');
      expect(item.querySelector('label')?.textContent).toBe('Saved via Blur');
    });

    it('cancels edit mode and reverts title on Escape key', async () => {
      const { container } = render(<App />);
      await createTodo('Keep Me Intact');

      const item = getItemByTitle(container, 'Keep Me Intact')!;
      await user.dblClick(item.querySelector('label')!);

      const editInput = item.querySelector('.edit') as HTMLInputElement;
      await user.clear(editInput);
      await user.type(editInput, 'Discarded Changes{escape}');

      expect(item).not.toHaveClass('editing');
      expect(item.querySelector('label')?.textContent).toBe('Keep Me Intact');
    });

    it('destroys item if edited title is saved as an empty string', async () => {
      const { container } = render(<App />);
      await createTodo('Delete on Empty');

      const item = getItemByTitle(container, 'Delete on Empty')!;
      await user.dblClick(item.querySelector('label')!);

      const editInput = item.querySelector('.edit') as HTMLInputElement;
      await user.clear(editInput);
      await user.type(editInput, '{enter}');

      expect(getItemByTitle(container, 'Delete on Empty')).toBeNull();
      expect(getTodoListItems(container)).toHaveLength(0);
    });

    it('destroys item if edited title contains only whitespace on blur commit', async () => {
      const { container } = render(<App />);
      await createTodo('Delete on Space');

      const item = getItemByTitle(container, 'Delete on Space')!;
      await user.dblClick(item.querySelector('label')!);

      const editInput = item.querySelector('.edit') as HTMLInputElement;
      await user.clear(editInput);
      await user.type(editInput, '    ');
      await user.click(screen.getByRole('heading', { level: 1 }));

      expect(getItemByTitle(container, 'Delete on Space')).toBeNull();
      expect(getTodoListItems(container)).toHaveLength(0);
    });
  });

  // =========================================================================
  // Category 5: Item Deletion (>=5 tests)
  // =========================================================================
  describe('5. Item Deletion', () => {
    it('removes item when its destroy button is clicked', async () => {
      const { container } = render(<App />);
      await createTodo('Item to Destroy');

      const item = getItemByTitle(container, 'Item to Destroy')!;
      const destroyBtn = item.querySelector('.destroy') as HTMLButtonElement;
      await user.click(destroyBtn);

      expect(getTodoListItems(container)).toHaveLength(0);
    });

    it('removes only the target item leaving other items intact', async () => {
      const { container } = render(<App />);
      await createTodo('Item 1');
      await createTodo('Item 2');
      await createTodo('Item 3');

      const item2 = getItemByTitle(container, 'Item 2')!;
      await user.click(item2.querySelector('.destroy') as HTMLButtonElement);

      const items = getTodoListItems(container);
      expect(items).toHaveLength(2);
      expect(items[0]).toHaveTextContent('Item 1');
      expect(items[1]).toHaveTextContent('Item 3');
    });

    it('correctly deletes the first item in the list', async () => {
      const { container } = render(<App />);
      await createTodo('Head');
      await createTodo('Tail');

      const head = getItemByTitle(container, 'Head')!;
      await user.click(head.querySelector('.destroy') as HTMLButtonElement);

      const items = getTodoListItems(container);
      expect(items).toHaveLength(1);
      expect(items[0]).toHaveTextContent('Tail');
    });

    it('correctly deletes the last item in the list', async () => {
      const { container } = render(<App />);
      await createTodo('Head');
      await createTodo('Tail');

      const tail = getItemByTitle(container, 'Tail')!;
      await user.click(tail.querySelector('.destroy') as HTMLButtonElement);

      const items = getTodoListItems(container);
      expect(items).toHaveLength(1);
      expect(items[0]).toHaveTextContent('Head');
    });

    it('deletes a completed item and updates completed counts', async () => {
      const { container } = render(<App />);
      await createTodo('Active Task');
      await createTodo('Completed Task');

      const completedItem = getItemByTitle(container, 'Completed Task')!;
      await user.click(completedItem.querySelector('.toggle') as HTMLInputElement);

      expect(screen.getByRole('button', { name: 'Clear completed' })).toBeInTheDocument();

      await user.click(completedItem.querySelector('.destroy') as HTMLButtonElement);

      expect(screen.queryByRole('button', { name: 'Clear completed' })).not.toBeInTheDocument();
      expect(getTodoListItems(container)).toHaveLength(1);
    });
  });

  // =========================================================================
  // Category 6: Toggle All (>=5 tests)
  // =========================================================================
  describe('6. Toggle All', () => {
    it('marks all items as completed when toggle-all is clicked with some active items', async () => {
      const { container } = render(<App />);
      await createTodo('Task A');
      await createTodo('Task B');

      const toggleAll = screen.getByLabelText('Mark all as complete');
      await user.click(toggleAll);

      const items = getTodoListItems(container);
      expect(items[0]).toHaveClass('completed');
      expect(items[1]).toHaveClass('completed');
    });

    it('marks all items as active when toggle-all is clicked with all completed items', async () => {
      const { container } = render(<App />);
      await createTodo('Task A');
      await createTodo('Task B');

      const toggleAll = screen.getByLabelText('Mark all as complete');
      await user.click(toggleAll); // all completed
      await user.click(toggleAll); // all active

      const items = getTodoListItems(container);
      expect(items[0]).not.toHaveClass('completed');
      expect(items[1]).not.toHaveClass('completed');
    });

    it('toggle-all checkbox is checked when all items are completed', async () => {
      render(<App />);
      await createTodo('Task 1');
      await createTodo('Task 2');

      const toggleAll = screen.getByLabelText('Mark all as complete') as HTMLInputElement;
      expect(toggleAll.checked).toBe(false);

      await user.click(toggleAll);
      expect(toggleAll.checked).toBe(true);
    });

    it('toggle-all checkbox automatically unchecks when an item is marked active', async () => {
      const { container } = render(<App />);
      await createTodo('Task 1');
      await createTodo('Task 2');

      const toggleAll = screen.getByLabelText('Mark all as complete') as HTMLInputElement;
      await user.click(toggleAll);
      expect(toggleAll.checked).toBe(true);

      const item1 = getItemByTitle(container, 'Task 1')!;
      await user.click(item1.querySelector('.toggle') as HTMLInputElement);

      expect(toggleAll.checked).toBe(false);
    });

    it('toggle-all checkbox automatically checks when all items are individually completed', async () => {
      const { container } = render(<App />);
      await createTodo('Task 1');
      await createTodo('Task 2');

      const toggleAll = screen.getByLabelText('Mark all as complete') as HTMLInputElement;
      expect(toggleAll.checked).toBe(false);

      const item1 = getItemByTitle(container, 'Task 1')!;
      const item2 = getItemByTitle(container, 'Task 2')!;

      await user.click(item1.querySelector('.toggle') as HTMLInputElement);
      expect(toggleAll.checked).toBe(false);

      await user.click(item2.querySelector('.toggle') as HTMLInputElement);
      expect(toggleAll.checked).toBe(true);
    });
  });

  // =========================================================================
  // Category 7: Active Count & Pluralization (>=5 tests)
  // =========================================================================
  describe('7. Active Count & Pluralization', () => {
    it('displays "1 item left" (singular) when exactly 1 active item exists', async () => {
      const { container } = render(<App />);
      await createTodo('Single Item');

      const count = container.querySelector('.todo-count');
      expect(count).toHaveTextContent('1 item left');
    });

    it('displays "2 items left" (plural) when 2 active items exist', async () => {
      const { container } = render(<App />);
      await createTodo('Item 1');
      await createTodo('Item 2');

      const count = container.querySelector('.todo-count');
      expect(count).toHaveTextContent('2 items left');
    });

    it('displays "0 items left" (plural) when all items are completed', async () => {
      const { container } = render(<App />);
      await createTodo('Item 1');

      const item = getItemByTitle(container, 'Item 1')!;
      await user.click(item.querySelector('.toggle') as HTMLInputElement);

      const count = container.querySelector('.todo-count');
      expect(count).toHaveTextContent('0 items left');
    });

    it('displays "3 items left" for 3 active items', async () => {
      const { container } = render(<App />);
      await createTodo('A');
      await createTodo('B');
      await createTodo('C');

      const count = container.querySelector('.todo-count');
      expect(count).toHaveTextContent('3 items left');
    });

    it('dynamically increments and decrements count as items are added and toggled', async () => {
      const { container } = render(<App />);
      await createTodo('Task 1');
      expect(container.querySelector('.todo-count')).toHaveTextContent('1 item left');

      await createTodo('Task 2');
      expect(container.querySelector('.todo-count')).toHaveTextContent('2 items left');

      const item1 = getItemByTitle(container, 'Task 1')!;
      await user.click(item1.querySelector('.toggle') as HTMLInputElement);
      expect(container.querySelector('.todo-count')).toHaveTextContent('1 item left');

      await user.click(item1.querySelector('.toggle') as HTMLInputElement);
      expect(container.querySelector('.todo-count')).toHaveTextContent('2 items left');
    });
  });

  // =========================================================================
  // Category 8: Routing & Filtering (>=5 tests)
  // =========================================================================
  describe('8. Routing & Filtering', () => {
    it('displays all items and highlights All filter by default (route #/)', async () => {
      const { container } = render(<App />);
      await createTodo('Active 1');
      await createTodo('Completed 1');

      const compItem = getItemByTitle(container, 'Completed 1')!;
      await user.click(compItem.querySelector('.toggle') as HTMLInputElement);

      const allLink = screen.getByRole('link', { name: 'All' });
      expect(allLink).toHaveClass('selected');
      expect(getTodoListItems(container)).toHaveLength(2);
    });

    it('displays only active items and highlights Active filter on #/active route', async () => {
      const { container } = render(<App />);
      await createTodo('Active Task');
      await createTodo('Done Task');

      const doneItem = getItemByTitle(container, 'Done Task')!;
      await user.click(doneItem.querySelector('.toggle') as HTMLInputElement);

      const activeLink = screen.getByRole('link', { name: 'Active' });
      await user.click(activeLink);

      expect(activeLink).toHaveClass('selected');
      expect(screen.getByRole('link', { name: 'All' })).not.toHaveClass('selected');

      const items = getTodoListItems(container);
      expect(items).toHaveLength(1);
      expect(items[0]).toHaveTextContent('Active Task');
    });

    it('displays only completed items and highlights Completed filter on #/completed route', async () => {
      const { container } = render(<App />);
      await createTodo('Active Task');
      await createTodo('Done Task');

      const doneItem = getItemByTitle(container, 'Done Task')!;
      await user.click(doneItem.querySelector('.toggle') as HTMLInputElement);

      const completedLink = screen.getByRole('link', { name: 'Completed' });
      await user.click(completedLink);

      expect(completedLink).toHaveClass('selected');

      const items = getTodoListItems(container);
      expect(items).toHaveLength(1);
      expect(items[0]).toHaveTextContent('Done Task');
    });

    it('switches between filters dynamically when clicking filter links', async () => {
      const { container } = render(<App />);
      await createTodo('Task 1');
      await createTodo('Task 2');

      const item2 = getItemByTitle(container, 'Task 2')!;
      await user.click(item2.querySelector('.toggle') as HTMLInputElement);

      await user.click(screen.getByRole('link', { name: 'Active' }));
      expect(getTodoListItems(container)).toHaveLength(1);
      expect(getTodoListItems(container)[0]).toHaveTextContent('Task 1');

      await user.click(screen.getByRole('link', { name: 'Completed' }));
      expect(getTodoListItems(container)).toHaveLength(1);
      expect(getTodoListItems(container)[0]).toHaveTextContent('Task 2');

      await user.click(screen.getByRole('link', { name: 'All' }));
      expect(getTodoListItems(container)).toHaveLength(2);
    });

    it('retains global active counter value when viewing filtered routes', async () => {
      const { container } = render(<App />);
      await createTodo('Active 1');
      await createTodo('Active 2');
      await createTodo('Done 1');

      const done = getItemByTitle(container, 'Done 1')!;
      await user.click(done.querySelector('.toggle') as HTMLInputElement);

      await user.click(screen.getByRole('link', { name: 'Completed' }));
      expect(container.querySelector('.todo-count')).toHaveTextContent('2 items left');
    });
  });

  // =========================================================================
  // Category 9: Clear Completed (>=5 tests)
  // =========================================================================
  describe('9. Clear Completed', () => {
    it('hides the clear-completed button when there are no completed items', async () => {
      render(<App />);
      await createTodo('Active Task');

      expect(screen.queryByRole('button', { name: 'Clear completed' })).not.toBeInTheDocument();
    });

    it('shows the clear-completed button when at least one item is completed', async () => {
      const { container } = render(<App />);
      await createTodo('Task to Complete');

      const item = getItemByTitle(container, 'Task to Complete')!;
      await user.click(item.querySelector('.toggle') as HTMLInputElement);

      expect(screen.getByRole('button', { name: 'Clear completed' })).toBeInTheDocument();
    });

    it('removes all completed items upon clicking clear-completed button', async () => {
      const { container } = render(<App />);
      await createTodo('Active Item');
      await createTodo('Done 1');
      await createTodo('Done 2');

      await user.click(getItemByTitle(container, 'Done 1')!.querySelector('.toggle') as HTMLInputElement);
      await user.click(getItemByTitle(container, 'Done 2')!.querySelector('.toggle') as HTMLInputElement);

      const clearBtn = screen.getByRole('button', { name: 'Clear completed' });
      await user.click(clearBtn);

      const items = getTodoListItems(container);
      expect(items).toHaveLength(1);
      expect(items[0]).toHaveTextContent('Active Item');
    });

    it('hides clear-completed button after clearing all completed items', async () => {
      const { container } = render(<App />);
      await createTodo('Done Item');

      await user.click(getItemByTitle(container, 'Done Item')!.querySelector('.toggle') as HTMLInputElement);
      const clearBtn = screen.getByRole('button', { name: 'Clear completed' });
      await user.click(clearBtn);

      expect(screen.queryByRole('button', { name: 'Clear completed' })).not.toBeInTheDocument();
    });

    it('updates active items count correctly when clear-completed is executed', async () => {
      const { container } = render(<App />);
      await createTodo('Stay Active');
      await createTodo('Get Cleared');

      await user.click(getItemByTitle(container, 'Get Cleared')!.querySelector('.toggle') as HTMLInputElement);
      await user.click(screen.getByRole('button', { name: 'Clear completed' }));

      expect(container.querySelector('.todo-count')).toHaveTextContent('1 item left');
    });
  });

  // =========================================================================
  // Category 10: LocalStorage Persistence (>=5 tests)
  // =========================================================================
  describe('10. LocalStorage Persistence', () => {
    it('persists created todos to localStorage under todos-react', async () => {
      render(<App />);
      await createTodo('Persisted Task');

      const raw = localStorage.getItem('todos-react');
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw!);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].title).toBe('Persisted Task');
      expect(parsed[0].completed).toBe(false);
    });

    it('persists completion state toggle to localStorage', async () => {
      const { container } = render(<App />);
      await createTodo('Persisted Toggle');

      const item = getItemByTitle(container, 'Persisted Toggle')!;
      await user.click(item.querySelector('.toggle') as HTMLInputElement);

      const parsed = JSON.parse(localStorage.getItem('todos-react')!);
      expect(parsed[0].completed).toBe(true);
    });

    it('persists inline edited title to localStorage', async () => {
      const { container } = render(<App />);
      await createTodo('Initial Title');

      const item = getItemByTitle(container, 'Initial Title')!;
      await user.dblClick(item.querySelector('label')!);
      const editInput = item.querySelector('.edit') as HTMLInputElement;
      await user.clear(editInput);
      await user.type(editInput, 'New Title{enter}');

      const parsed = JSON.parse(localStorage.getItem('todos-react')!);
      expect(parsed[0].title).toBe('New Title');
    });

    it('persists item deletion to localStorage', async () => {
      const { container } = render(<App />);
      await createTodo('Delete Me');

      const item = getItemByTitle(container, 'Delete Me')!;
      await user.click(item.querySelector('.destroy') as HTMLButtonElement);

      const parsed = JSON.parse(localStorage.getItem('todos-react')!);
      expect(parsed).toHaveLength(0);
    });

    it('rehydrates todos from localStorage on component mount', () => {
      const initial = [
        { id: '1', title: 'Stored Active', completed: false },
        { id: '2', title: 'Stored Done', completed: true },
      ];
      localStorage.setItem('todos-react', JSON.stringify(initial));

      const { container } = render(<App />);
      const items = getTodoListItems(container);
      expect(items).toHaveLength(2);
      expect(items[0]).toHaveTextContent('Stored Active');
      expect(items[0]).not.toHaveClass('completed');
      expect(items[1]).toHaveTextContent('Stored Done');
      expect(items[1]).toHaveClass('completed');
    });

    it('maintains state consistency across multiple unmount/remount cycles', async () => {
      const { unmount, container: c1 } = render(<App />);
      await createTodo('Cycle 1');
      await createTodo('Cycle 2');
      await user.click(getItemByTitle(c1, 'Cycle 1')!.querySelector('.toggle') as HTMLInputElement);

      unmount();

      const { container: c2 } = render(<App />);
      expect(getTodoListItems(c2)).toHaveLength(2);
      expect(getItemByTitle(c2, 'Cycle 1')).toHaveClass('completed');
      expect(getItemByTitle(c2, 'Cycle 2')).not.toHaveClass('completed');
    });
  });
});
