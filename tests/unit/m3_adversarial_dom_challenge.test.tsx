import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../src/App';
import {
  TodoItem,
  Footer,
} from '../../src/components';
import { Todo } from '../../src/types/todo';

describe('M3 Adversarial Challenge: DOM Accessibility, Rendering & Lifecycle', () => {
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

  // =========================================================================
  // 1. DOM Hierarchy, Semantic Structure & Accessibility Conformance
  // =========================================================================
  describe('1. Semantic DOM & Accessibility Conformance', () => {
    it('verifies exact TodoMVC DOM tree specifications in full state', async () => {
      const { container } = render(<App />);
      await createTodo('Item 1');
      await createTodo('Item 2');

      // Root section
      const todoapp = container.querySelector('section.todoapp');
      expect(todoapp).toBeInTheDocument();

      // Header
      const header = todoapp?.querySelector('header.header');
      expect(header).toBeInTheDocument();
      expect(header?.querySelector('h1')?.textContent).toBe('todos');
      const newTodoInput = header?.querySelector('input.new-todo') as HTMLInputElement;
      expect(newTodoInput).toBeInTheDocument();
      expect(newTodoInput.placeholder).toBe('What needs to be done?');

      // Main Section
      const main = todoapp?.querySelector('section.main');
      expect(main).toBeInTheDocument();

      // Toggle-all checkbox and label
      const toggleAllInput = main?.querySelector('input#toggle-all.toggle-all') as HTMLInputElement;
      expect(toggleAllInput).toBeInTheDocument();
      expect(toggleAllInput.type).toBe('checkbox');
      const toggleAllLabel = main?.querySelector('label[for="toggle-all"]');
      expect(toggleAllLabel).toBeInTheDocument();
      expect(toggleAllLabel?.textContent).toBe('Mark all as complete');

      // Todo List
      const todoList = main?.querySelector('ul.todo-list');
      expect(todoList).toBeInTheDocument();
      const items = todoList?.querySelectorAll('li');
      expect(items).toHaveLength(2);

      // Todo Item View structure
      const firstItem = items?.[0];
      const viewDiv = firstItem?.querySelector('div.view');
      expect(viewDiv).toBeInTheDocument();
      const toggleCheckbox = viewDiv?.querySelector('input.toggle') as HTMLInputElement;
      expect(toggleCheckbox).toBeInTheDocument();
      expect(toggleCheckbox.type).toBe('checkbox');
      const label = viewDiv?.querySelector('label');
      expect(label).toBeInTheDocument();
      expect(label?.textContent).toBe('Item 1');
      const destroyBtn = viewDiv?.querySelector('button.destroy') as HTMLButtonElement;
      expect(destroyBtn).toBeInTheDocument();
      expect(destroyBtn.getAttribute('aria-label')).toBe('Delete todo');

      // Edit input element exists in li
      const editInput = firstItem?.querySelector('input.edit') as HTMLInputElement;
      expect(editInput).toBeInTheDocument();

      // Footer
      const footer = todoapp?.querySelector('footer.footer');
      expect(footer).toBeInTheDocument();

      // Todo count
      const todoCount = footer?.querySelector('span.todo-count');
      expect(todoCount).toBeInTheDocument();
      const strong = todoCount?.querySelector('strong');
      expect(strong?.textContent).toBe('2');
      expect(todoCount?.textContent).toBe('2 items left');

      // Filters
      const filters = footer?.querySelector('ul.filters');
      expect(filters).toBeInTheDocument();
      const filterLinks = filters?.querySelectorAll('a');
      expect(filterLinks).toHaveLength(3);
      expect(filterLinks?.[0].getAttribute('href')).toBe('#/');
      expect(filterLinks?.[0].textContent).toBe('All');
      expect(filterLinks?.[0].className).toContain('selected');

      expect(filterLinks?.[1].getAttribute('href')).toBe('#/active');
      expect(filterLinks?.[1].textContent).toBe('Active');
      expect(filterLinks?.[1].className).toBe('');

      expect(filterLinks?.[2].getAttribute('href')).toBe('#/completed');
      expect(filterLinks?.[2].textContent).toBe('Completed');
      expect(filterLinks?.[2].className).toBe('');

      // Info Footer (outside section.todoapp)
      const infoFooter = container.querySelector('footer.info');
      expect(infoFooter).toBeInTheDocument();
      expect(todoapp?.contains(infoFooter)).toBe(false);
      expect(infoFooter?.textContent).toContain('Double-click to edit a todo');
      expect(infoFooter?.textContent).toContain('Created by the TodoMVC Team');
      expect(infoFooter?.textContent).toContain('Part of TodoMVC');
    });
  });

  // =========================================================================
  // 2. Adversarial Inline Edit Lifecycle & Edge Cases
  // =========================================================================
  describe('2. Adversarial Inline Edit Lifecycle & Edge Cases', () => {
    it('handles switching directly from editing item 1 to editing item 2', async () => {
      const { container } = render(<App />);
      await createTodo('First Task');
      await createTodo('Second Task');

      const items = container.querySelectorAll<HTMLElement>('.todo-list li');
      const item1Label = items[0].querySelector('label')!;
      const item2Label = items[1].querySelector('label')!;

      // Start editing item 1
      await user.dblClick(item1Label);
      expect(items[0]).toHaveClass('editing');

      const edit1 = items[0].querySelector('.edit') as HTMLInputElement;
      await user.type(edit1, ' Updated');

      // Directly double-click item 2
      await user.dblClick(item2Label);

      // Item 1 should have committed its edit and exited editing mode
      const updatedItems = container.querySelectorAll<HTMLElement>('.todo-list li');
      expect(updatedItems[0]).not.toHaveClass('editing');
      expect(updatedItems[0].querySelector('label')?.textContent).toBe('First Task Updated');

      // Item 2 should now be in editing mode
      expect(updatedItems[1]).toHaveClass('editing');
    });

    it('resets edit input on Escape and keeps original value across subsequent edits', async () => {
      const { container } = render(<App />);
      await createTodo('Persistent Title');

      const item = container.querySelector<HTMLElement>('.todo-list li')!;
      const label = item.querySelector('label')!;

      // 1. First edit: cancel with Escape
      await user.dblClick(label);
      const editInput1 = item.querySelector('.edit') as HTMLInputElement;
      await user.clear(editInput1);
      await user.type(editInput1, 'Discarded Title{escape}');

      expect(item).not.toHaveClass('editing');
      expect(item.querySelector('label')?.textContent).toBe('Persistent Title');

      // 2. Second edit: verify the input value starts with original title, not discarded title
      await user.dblClick(label);
      const editInput2 = item.querySelector('.edit') as HTMLInputElement;
      expect(editInput2.value).toBe('Persistent Title');

      // 3. Commit a valid edit
      await user.type(editInput2, ' Verified{enter}');
      expect(item.querySelector('label')?.textContent).toBe('Persistent Title Verified');
    });

    it('destroys item when edit is saved with whitespace only via blur', async () => {
      const { container } = render(<App />);
      await createTodo('Keep me');
      await createTodo('Delete me via whitespace blur');

      const items = container.querySelectorAll<HTMLElement>('.todo-list li');
      const labelToDelete = items[1].querySelector('label')!;

      await user.dblClick(labelToDelete);
      const editInput = items[1].querySelector('.edit') as HTMLInputElement;
      await user.clear(editInput);
      await user.type(editInput, '   \t   ');

      // Trigger blur by clicking outside
      await user.click(container.querySelector('h1')!);

      const remainingItems = container.querySelectorAll<HTMLElement>('.todo-list li');
      expect(remainingItems).toHaveLength(1);
      expect(remainingItems[0].querySelector('label')?.textContent).toBe('Keep me');
      expect(container.querySelector('.todo-count')).toHaveTextContent('1 item left');
    });
  });

  // =========================================================================
  // 3. Component Isolation & Props Verification
  // =========================================================================
  describe('3. Component Isolation & Props Resilience', () => {
    it('Footer renders properly with pluralization boundaries', () => {
      const onClearCompleted = vi.fn();

      // 0 items
      const { rerender, container } = render(
        <Footer
          activeCount={0}
          completedCount={0}
          filter="all"
          onClearCompleted={onClearCompleted}
        />
      );
      expect(container.querySelector('.todo-count')).toHaveTextContent('0 items left');
      expect(screen.queryByRole('button', { name: 'Clear completed' })).not.toBeInTheDocument();

      // 1 item
      rerender(
        <Footer
          activeCount={1}
          completedCount={2}
          filter="active"
          onClearCompleted={onClearCompleted}
        />
      );
      expect(container.querySelector('.todo-count')).toHaveTextContent('1 item left');
      expect(screen.getByRole('button', { name: 'Clear completed' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Active' })).toHaveClass('selected');

      // 5 items
      rerender(
        <Footer
          activeCount={5}
          completedCount={0}
          filter="completed"
          onClearCompleted={onClearCompleted}
        />
      );
      expect(container.querySelector('.todo-count')).toHaveTextContent('5 items left');
      expect(screen.getByRole('link', { name: 'Completed' })).toHaveClass('selected');
    });

    it('TodoItem handles long strings and special characters without crashing', () => {
      const todo: Todo = {
        id: 'special-1',
        title: '<script>alert("xss")</script> & "quotes" \'single\' `backticks` 🚀 日本語',
        completed: false,
      };
      const onToggle = vi.fn();
      const onDestroy = vi.fn();
      const onUpdate = vi.fn();

      render(
        <TodoItem
          todo={todo}
          onToggle={onToggle}
          onDestroy={onDestroy}
          onUpdate={onUpdate}
        />
      );

      const label = screen.getByText('<script>alert("xss")</script> & "quotes" \'single\' `backticks` 🚀 日本語');
      expect(label).toBeInTheDocument();
      expect(label.tagName).toBe('LABEL');
    });
  });

  // =========================================================================
  // 4. Batch Operations & State Machine Stability
  // =========================================================================
  describe('4. Batch Operations & State Transitions', () => {
    it('handles 20 sequential item additions and toggles accurately', async () => {
      const { container } = render(<App />);

      for (let i = 1; i <= 20; i++) {
        await createTodo(`Task ${i}`);
      }

      expect(container.querySelectorAll('.todo-list li')).toHaveLength(20);
      expect(container.querySelector('.todo-count')).toHaveTextContent('20 items left');

      // Toggle all
      const toggleAll = screen.getByLabelText('Mark all as complete');
      await user.click(toggleAll);

      expect(container.querySelector('.todo-count')).toHaveTextContent('0 items left');
      expect((toggleAll as HTMLInputElement).checked).toBe(true);

      // Clear completed
      await user.click(screen.getByRole('button', { name: 'Clear completed' }));
      expect(container.querySelector('.main')).not.toBeInTheDocument();
      expect(container.querySelector('.footer')).not.toBeInTheDocument();
    });
  });
});
