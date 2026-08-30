import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import clsx from 'clsx';
import { Todo, FilterType, TodosState, TodoAction, UseTodosReturn } from '../../src/types/todo';
import App from '../../src/App';

describe('Milestone M1 Adversarial Empirical Challenges', () => {
  describe('1. JSDOM Environment & Browser API Stress Tests', () => {
    it('accurately simulates window, document, and custom events', () => {
      expect(typeof window).toBe('object');
      expect(typeof document).toBe('object');
      expect(typeof window.addEventListener).toBe('function');
      expect(typeof window.removeEventListener).toBe('function');

      const handler = vi.fn();
      window.addEventListener('custom-test-event', handler);
      window.dispatchEvent(new Event('custom-test-event'));
      expect(handler).toHaveBeenCalledTimes(1);
      window.removeEventListener('custom-test-event', handler);
    });

    it('accurately simulates localStorage API (setItem, getItem, removeItem, key, length, clear)', () => {
      localStorage.clear();
      expect(localStorage.length).toBe(0);

      localStorage.setItem('k1', 'val1');
      localStorage.setItem('k2', 'val2');
      expect(localStorage.length).toBe(2);
      expect(localStorage.getItem('k1')).toBe('val1');
      expect(localStorage.getItem('k2')).toBe('val2');
      expect(localStorage.getItem('non-existent')).toBeNull();

      localStorage.removeItem('k1');
      expect(localStorage.length).toBe(1);
      expect(localStorage.getItem('k1')).toBeNull();

      localStorage.clear();
      expect(localStorage.length).toBe(0);
    });

    it('accurately simulates hashchange events for routing', () => {
      const hashHistory: string[] = [];
      const onHashChange = () => {
        hashHistory.push(window.location.hash);
      };

      window.addEventListener('hashchange', onHashChange);

      act(() => {
        window.location.hash = '#/active';
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      });

      act(() => {
        window.location.hash = '#/completed';
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      });

      expect(hashHistory).toEqual(['#/active', '#/completed']);
      window.removeEventListener('hashchange', onHashChange);
    });

    it('verifies teardown isolation: localStorage and hash are wiped between test suites', () => {
      // Because vitest.setup.ts runs afterEach, initial state in this test should be clean
      expect(localStorage.length).toBe(0);
      expect(window.location.hash).toBe('');
    });
  });

  describe('2. React 18 + UserEvent Interaction Stress Tests', () => {
    it('supports userEvent typing, keyboard events (Enter, Escape), blur, and double clicks', async () => {
      const user = userEvent.setup();

      function InteractiveProbe() {
        const [text, setText] = useState('');
        const [status, setStatus] = useState('idle');

        return (
          <div>
            <input
              data-testid="probe-input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setStatus('committed:' + text);
                if (e.key === 'Escape') setStatus('cancelled');
              }}
              onBlur={() => setStatus('blurred:' + text)}
            />
            <button data-testid="probe-btn" onDoubleClick={() => setStatus('double-clicked')}>
              Target
            </button>
            <span data-testid="probe-status">{status}</span>
          </div>
        );
      }

      render(<InteractiveProbe />);
      const input = screen.getByTestId('probe-input');
      const btn = screen.getByTestId('probe-btn');
      const status = screen.getByTestId('probe-status');

      // Test typing and Enter
      await user.type(input, 'Hello World{enter}');
      expect(status.textContent).toBe('committed:Hello World');

      // Test Escape
      await user.type(input, '{escape}');
      expect(status.textContent).toBe('cancelled');

      // Test blur
      await user.click(btn);
      expect(status.textContent).toBe('blurred:Hello World');

      // Test double-click
      await user.dblClick(btn);
      expect(status.textContent).toBe('double-clicked');
    });
  });

  describe('3. Module Resolution & Utility Contracts', () => {
    it('resolves clsx and handles conditional classes properly', () => {
      expect(clsx('todoapp', false && 'hidden', true && 'loaded')).toBe('todoapp loaded');
      expect(clsx({ editing: true, completed: false })).toBe('editing');
    });

    it('imports App and verifies semantic structure and default view', () => {
      const { container } = render(<App />);
      expect(container.querySelector('.todoapp')).toBeInTheDocument();
      expect(container.querySelector('.header')).toBeInTheDocument();
      expect(container.querySelector('.new-todo')).toBeInTheDocument();
      expect(container.querySelector('.info')).toBeInTheDocument();

      // When todos list is empty, main and footer should not be in DOM
      expect(container.querySelector('.main')).not.toBeInTheDocument();
      expect(container.querySelector('.footer')).not.toBeInTheDocument();
    });
  });

  describe('4. TypeScript Interface Type Assertions & Exhaustiveness', () => {
    it('verifies strict contracts for TodosState, FilterType, and TodoAction unions', () => {
      const sampleTodo: Todo = { id: '1', title: 'Task 1', completed: false };
      const sampleFilter: FilterType = 'active';
      expect(sampleFilter).toBe('active');

      const state: TodosState = {
        todos: [
          sampleTodo,
          { id: '2', title: 'Task 2', completed: true },
        ],
      };

      const actions: TodoAction[] = [
        { type: 'ADD', title: 'New' },
        { type: 'TOGGLE', id: '1' },
        { type: 'TOGGLE_ALL', completed: true },
        { type: 'UPDATE', id: '1', title: 'Updated' },
        { type: 'DELETE', id: '1' },
        { type: 'CLEAR_COMPLETED' },
        { type: 'SET_TODOS', todos: state.todos },
      ];

      function reducer(s: TodosState, a: TodoAction): TodosState {
        switch (a.type) {
          case 'ADD':
            return { todos: [...s.todos, { id: 'new', title: a.title, completed: false }] };
          case 'TOGGLE':
            return {
              todos: s.todos.map((t) => (t.id === a.id ? { ...t, completed: !t.completed } : t)),
            };
          case 'TOGGLE_ALL':
            return { todos: s.todos.map((t) => ({ ...t, completed: a.completed })) };
          case 'UPDATE':
            return {
              todos: s.todos.map((t) => (t.id === a.id ? { ...t, title: a.title } : t)),
            };
          case 'DELETE':
            return { todos: s.todos.filter((t) => t.id !== a.id) };
          case 'CLEAR_COMPLETED':
            return { todos: s.todos.filter((t) => !t.completed) };
          case 'SET_TODOS':
            return { todos: a.todos };
          default: {
            const _exhaustiveCheck: never = a;
            return _exhaustiveCheck;
          }
        }
      }

      let curr = state;
      for (const action of actions) {
        curr = reducer(curr, action);
      }
      expect(curr.todos).toBeDefined();

      const hookMock: UseTodosReturn = {
        todos: curr.todos,
        filteredTodos: curr.todos,
        filter: 'all',
        setFilter: vi.fn(),
        addTodo: vi.fn(),
        toggleTodo: vi.fn(),
        toggleAll: vi.fn(),
        updateTodo: vi.fn(),
        deleteTodo: vi.fn(),
        clearCompleted: vi.fn(),
        activeCount: 1,
        completedCount: 1,
        allCompleted: false,
        hasTodos: true,
      };
      expect(hookMock.hasTodos).toBe(true);
    });
  });
});
