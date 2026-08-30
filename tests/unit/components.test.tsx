import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Header } from '../../src/components/Header';
import { TodoItem } from '../../src/components/TodoItem';
import { TodoList } from '../../src/components/TodoList';
import { MainSection } from '../../src/components/MainSection';
import { Footer } from '../../src/components/Footer';
import { InfoFooter } from '../../src/components/InfoFooter';
import { Todo } from '../../src/types/todo';

describe('Unit Tests: Component Architecture', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
  });

  describe('Header Component', () => {
    it('renders header with h1 "todos" and autoFocused input with placeholder', () => {
      const onAddTodo = vi.fn();
      const { container } = render(<Header onAddTodo={onAddTodo} />);

      expect(container.querySelector('header.header')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('todos');
      const input = screen.getByPlaceholderText('What needs to be done?') as HTMLInputElement;
      expect(input).toBeInTheDocument();
      expect(input).toHaveClass('new-todo');
    });

    it('submits trimmed title and clears input when Enter is pressed', async () => {
      const onAddTodo = vi.fn();
      render(<Header onAddTodo={onAddTodo} />);

      const input = screen.getByPlaceholderText('What needs to be done?') as HTMLInputElement;
      await user.type(input, '   New Task Title   {enter}');

      expect(onAddTodo).toHaveBeenCalledTimes(1);
      expect(onAddTodo).toHaveBeenCalledWith('New Task Title');
      expect(input.value).toBe('');
    });

    it('ignores Enter when input contains only whitespace or is empty', async () => {
      const onAddTodo = vi.fn();
      render(<Header onAddTodo={onAddTodo} />);

      const input = screen.getByPlaceholderText('What needs to be done?') as HTMLInputElement;
      await user.type(input, '   {enter}');
      await user.type(input, '{enter}');

      expect(onAddTodo).not.toHaveBeenCalled();
    });
  });

  describe('TodoItem Component', () => {
    const mockTodo: Todo = {
      id: 'item-1',
      title: 'Sample Item',
      completed: false,
    };

    it('renders item in view mode with checkbox, title label, and destroy button', () => {
      const onToggle = vi.fn();
      const onDestroy = vi.fn();
      const onUpdate = vi.fn();

      const { container } = render(
        <TodoItem
          todo={mockTodo}
          onToggle={onToggle}
          onDestroy={onDestroy}
          onUpdate={onUpdate}
        />
      );

      const li = container.querySelector('li')!;
      expect(li).not.toHaveClass('completed');
      expect(li).not.toHaveClass('editing');

      const checkbox = container.querySelector('.toggle') as HTMLInputElement;
      expect(checkbox).toBeInTheDocument();
      expect(checkbox.checked).toBe(false);

      expect(container.querySelector('label')).toHaveTextContent('Sample Item');
      expect(container.querySelector('.destroy')).toBeInTheDocument();
      expect(container.querySelector('.edit')).toBeInTheDocument();
    });

    it('applies completed class when todo.completed is true', () => {
      const completedTodo: Todo = { ...mockTodo, completed: true };
      const { container } = render(
        <TodoItem
          todo={completedTodo}
          onToggle={vi.fn()}
          onDestroy={vi.fn()}
          onUpdate={vi.fn()}
        />
      );

      const li = container.querySelector('li')!;
      expect(li).toHaveClass('completed');
      const checkbox = container.querySelector('.toggle') as HTMLInputElement;
      expect(checkbox.checked).toBe(true);
    });

    it('triggers onToggle when toggle checkbox is clicked', async () => {
      const onToggle = vi.fn();
      const { container } = render(
        <TodoItem
          todo={mockTodo}
          onToggle={onToggle}
          onDestroy={vi.fn()}
          onUpdate={vi.fn()}
        />
      );

      const checkbox = container.querySelector('.toggle') as HTMLInputElement;
      await user.click(checkbox);

      expect(onToggle).toHaveBeenCalledTimes(1);
      expect(onToggle).toHaveBeenCalledWith('item-1');
    });

    it('triggers onDestroy when destroy button is clicked', async () => {
      const onDestroy = vi.fn();
      const { container } = render(
        <TodoItem
          todo={mockTodo}
          onToggle={vi.fn()}
          onDestroy={onDestroy}
          onUpdate={vi.fn()}
        />
      );

      const destroyBtn = container.querySelector('.destroy') as HTMLButtonElement;
      await user.click(destroyBtn);

      expect(onDestroy).toHaveBeenCalledTimes(1);
      expect(onDestroy).toHaveBeenCalledWith('item-1');
    });

    it('enters editing mode on label double-click and auto-focuses edit input', async () => {
      const { container } = render(
        <TodoItem
          todo={mockTodo}
          onToggle={vi.fn()}
          onDestroy={vi.fn()}
          onUpdate={vi.fn()}
        />
      );

      const label = container.querySelector('label')!;
      await user.dblClick(label);

      const li = container.querySelector('li')!;
      expect(li).toHaveClass('editing');
      const editInput = container.querySelector('.edit') as HTMLInputElement;
      expect(editInput).toHaveValue('Sample Item');
      expect(document.activeElement).toBe(editInput);
    });

    it('commits update on Enter with trimmed text', async () => {
      const onUpdate = vi.fn();
      const { container } = render(
        <TodoItem
          todo={mockTodo}
          onToggle={vi.fn()}
          onDestroy={vi.fn()}
          onUpdate={onUpdate}
        />
      );

      await user.dblClick(container.querySelector('label')!);
      const editInput = container.querySelector('.edit') as HTMLInputElement;
      await user.clear(editInput);
      await user.type(editInput, '   Updated Title   {enter}');

      expect(onUpdate).toHaveBeenCalledWith('item-1', 'Updated Title');
      expect(container.querySelector('li')).not.toHaveClass('editing');
    });

    it('destroys item on Enter when title is edited to empty string', async () => {
      const onDestroy = vi.fn();
      const { container } = render(
        <TodoItem
          todo={mockTodo}
          onToggle={vi.fn()}
          onDestroy={onDestroy}
          onUpdate={vi.fn()}
        />
      );

      await user.dblClick(container.querySelector('label')!);
      const editInput = container.querySelector('.edit') as HTMLInputElement;
      await user.clear(editInput);
      await user.type(editInput, '   {enter}');

      expect(onDestroy).toHaveBeenCalledWith('item-1');
    });

    it('commits update on blur event', async () => {
      const onUpdate = vi.fn();
      const { container } = render(
        <TodoItem
          todo={mockTodo}
          onToggle={vi.fn()}
          onDestroy={vi.fn()}
          onUpdate={onUpdate}
        />
      );

      await user.dblClick(container.querySelector('label')!);
      const editInput = container.querySelector('.edit') as HTMLInputElement;
      await user.clear(editInput);
      await user.type(editInput, 'Blur Committed');
      fireEvent.blur(editInput);

      expect(onUpdate).toHaveBeenCalledWith('item-1', 'Blur Committed');
      expect(container.querySelector('li')).not.toHaveClass('editing');
    });

    it('destroys item on blur when edited to empty string', async () => {
      const onDestroy = vi.fn();
      const { container } = render(
        <TodoItem
          todo={mockTodo}
          onToggle={vi.fn()}
          onDestroy={onDestroy}
          onUpdate={vi.fn()}
        />
      );

      await user.dblClick(container.querySelector('label')!);
      const editInput = container.querySelector('.edit') as HTMLInputElement;
      await user.clear(editInput);
      fireEvent.blur(editInput);

      expect(onDestroy).toHaveBeenCalledWith('item-1');
    });

    it('cancels edit on Escape, reverts value, and prevents subsequent blur commit', async () => {
      const onUpdate = vi.fn();
      const { container } = render(
        <TodoItem
          todo={mockTodo}
          onToggle={vi.fn()}
          onDestroy={vi.fn()}
          onUpdate={onUpdate}
        />
      );

      await user.dblClick(container.querySelector('label')!);
      const editInput = container.querySelector('.edit') as HTMLInputElement;
      await user.clear(editInput);
      await user.type(editInput, 'Discarded Changes{escape}');

      // Simulate subsequent blur
      fireEvent.blur(editInput);

      expect(onUpdate).not.toHaveBeenCalled();
      expect(container.querySelector('li')).not.toHaveClass('editing');
      expect(container.querySelector('label')).toHaveTextContent('Sample Item');
    });
  });

  describe('TodoList Component', () => {
    it('renders a list of items within ul.todo-list', () => {
      const todos: Todo[] = [
        { id: '1', title: 'Task 1', completed: false },
        { id: '2', title: 'Task 2', completed: true },
      ];

      const { container } = render(
        <TodoList
          todos={todos}
          onToggle={vi.fn()}
          onDestroy={vi.fn()}
          onUpdate={vi.fn()}
        />
      );

      const ul = container.querySelector('ul.todo-list');
      expect(ul).toBeInTheDocument();
      expect(container.querySelectorAll('li')).toHaveLength(2);
    });
  });

  describe('MainSection Component', () => {
    it('renders section.main with toggle-all input and label', async () => {
      const onToggleAll = vi.fn();
      const todos: Todo[] = [
        { id: '1', title: 'Task 1', completed: true },
        { id: '2', title: 'Task 2', completed: true },
      ];

      const { container } = render(
        <MainSection
          todos={todos}
          filteredTodos={todos}
          areAllCompleted={true}
          onToggleAll={onToggleAll}
          onToggle={vi.fn()}
          onDestroy={vi.fn()}
          onUpdate={vi.fn()}
        />
      );

      expect(container.querySelector('section.main')).toBeInTheDocument();
      const toggleAll = container.querySelector('#toggle-all') as HTMLInputElement;
      expect(toggleAll).toBeInTheDocument();
      expect(toggleAll.checked).toBe(true);

      const label = container.querySelector('label[for="toggle-all"]');
      expect(label).toHaveTextContent('Mark all as complete');

      await user.click(toggleAll);
      expect(onToggleAll).toHaveBeenCalled();
    });
  });

  describe('Footer Component', () => {
    it('renders active count with correct singular/plural grammar', () => {
      const { rerender, container } = render(
        <Footer
          activeCount={1}
          completedCount={0}
          filter="all"
          onClearCompleted={vi.fn()}
        />
      );
      expect(container.querySelector('.todo-count')).toHaveTextContent('1 item left');

      rerender(
        <Footer
          activeCount={0}
          completedCount={2}
          filter="all"
          onClearCompleted={vi.fn()}
        />
      );
      expect(container.querySelector('.todo-count')).toHaveTextContent('0 items left');

      rerender(
        <Footer
          activeCount={3}
          completedCount={1}
          filter="all"
          onClearCompleted={vi.fn()}
        />
      );
      expect(container.querySelector('.todo-count')).toHaveTextContent('3 items left');
    });

    it('highlights current filter route with .selected class', () => {
      const { rerender } = render(
        <Footer
          activeCount={2}
          completedCount={1}
          filter="all"
          onClearCompleted={vi.fn()}
        />
      );
      expect(screen.getByRole('link', { name: 'All' })).toHaveClass('selected');
      expect(screen.getByRole('link', { name: 'Active' })).not.toHaveClass('selected');

      rerender(
        <Footer
          activeCount={2}
          completedCount={1}
          filter="active"
          onClearCompleted={vi.fn()}
        />
      );
      expect(screen.getByRole('link', { name: 'Active' })).toHaveClass('selected');
      expect(screen.getByRole('link', { name: 'All' })).not.toHaveClass('selected');

      rerender(
        <Footer
          activeCount={2}
          completedCount={1}
          filter="completed"
          onClearCompleted={vi.fn()}
        />
      );
      expect(screen.getByRole('link', { name: 'Completed' })).toHaveClass('selected');
    });

    it('renders clear-completed button only when completedCount > 0 and handles click', async () => {
      const onClearCompleted = vi.fn();
      const { rerender } = render(
        <Footer
          activeCount={2}
          completedCount={0}
          filter="all"
          onClearCompleted={onClearCompleted}
        />
      );

      expect(screen.queryByRole('button', { name: 'Clear completed' })).not.toBeInTheDocument();

      rerender(
        <Footer
          activeCount={1}
          completedCount={1}
          filter="all"
          onClearCompleted={onClearCompleted}
        />
      );

      const clearBtn = screen.getByRole('button', { name: 'Clear completed' });
      expect(clearBtn).toBeInTheDocument();
      await user.click(clearBtn);
      expect(onClearCompleted).toHaveBeenCalledTimes(1);
    });
  });

  describe('InfoFooter Component', () => {
    it('renders static double-click hint and credits', () => {
      const { container } = render(<InfoFooter />);
      expect(container.querySelector('footer.info')).toBeInTheDocument();
      expect(container.querySelector('footer.info')).toHaveTextContent('Double-click to edit a todo');
      expect(container.querySelector('footer.info')).toHaveTextContent('TodoMVC');
    });
  });
});
