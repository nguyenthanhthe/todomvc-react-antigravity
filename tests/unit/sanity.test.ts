import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import App from '../../src/App';
import { Todo, FilterType, TodosState, TodoAction, UseTodosReturn } from '../../src/types/todo';

describe('Sanity & Milestone M1 Environment Check', () => {
  it('renders App component with header, title, and new-todo input', () => {
    render(React.createElement(App));
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent('todos');

    const input = screen.getByPlaceholderText('What needs to be done?');
    expect(input).toBeInTheDocument();
    expect(input).toHaveClass('new-todo');
  });

  it('verifies TypeScript types contracts and structures', () => {
    const sampleTodo: Todo = {
      id: 'test-1',
      title: 'Initial Todo',
      completed: false,
    };
    expect(sampleTodo.id).toBe('test-1');
    expect(sampleTodo.completed).toBe(false);

    const filterAll: FilterType = 'all';
    const filterActive: FilterType = 'active';
    const filterCompleted: FilterType = 'completed';
    expect([filterAll, filterActive, filterCompleted]).toHaveLength(3);

    const state: TodosState = {
      todos: [sampleTodo],
    };
    expect(state.todos).toHaveLength(1);

    const actions: TodoAction[] = [
      { type: 'ADD', title: 'Buy milk' },
      { type: 'TOGGLE', id: 'test-1' },
      { type: 'TOGGLE_ALL', completed: true },
      { type: 'UPDATE', id: 'test-1', title: 'Updated' },
      { type: 'DELETE', id: 'test-1' },
      { type: 'CLEAR_COMPLETED' },
      { type: 'SET_TODOS', todos: [sampleTodo] },
    ];
    expect(actions).toHaveLength(7);

    const mockReturn: Partial<UseTodosReturn> = {
      todos: [sampleTodo],
      filteredTodos: [sampleTodo],
      filter: 'all',
      activeCount: 1,
      completedCount: 0,
      allCompleted: false,
      hasTodos: true,
    };
    expect(mockReturn.hasTodos).toBe(true);
  });

  it('verifies localStorage works in jsdom test environment', () => {
    localStorage.setItem('todos-react', JSON.stringify([{ id: '1', title: 'Test', completed: false }]));
    const stored = localStorage.getItem('todos-react');
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].title).toBe('Test');
  });
});
