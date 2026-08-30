import { useMemo, useCallback } from 'react';
import { Todo, FilterType, UseTodosReturn } from '../types/todo';
import { useLocalStorage } from './useLocalStorage';
import { useHashLocation } from './useHashLocation';

/**
 * Generates a unique identifier for a todo item using standard crypto.randomUUID()
 * or a timestamp/random fallback.
 */
function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Core Todos domain state management hook.
 * Encapsulates state operations, filtering, derived counts, and localStorage persistence.
 *
 * @param storageKey LocalStorage key name (defaults to 'todos-react')
 */
export function useTodos(storageKey: string = 'todos-react'): UseTodosReturn {
  const [todos, setTodos] = useLocalStorage<Todo[]>(storageKey, []);
  const filter = useHashLocation();

  const safeTodos = Array.isArray(todos)
    ? todos.filter(
        (t): t is Todo =>
          t != null &&
          typeof t === 'object' &&
          typeof t.id === 'string' &&
          typeof t.title === 'string' &&
          typeof t.completed === 'boolean'
      )
    : [];

  const setFilter = useCallback((newFilter: FilterType) => {
    if (typeof window !== 'undefined') {
      window.location.hash = newFilter === 'all' ? '#/' : `#/${newFilter}`;
    }
  }, []);

  const addTodo = useCallback(
    (title: string) => {
      const trimmed = title.trim();
      if (!trimmed) {
        return;
      }
      const newTodo: Todo = {
        id: generateId(),
        title: trimmed,
        completed: false,
      };
      setTodos((prev) => (Array.isArray(prev) ? [...prev, newTodo] : [newTodo]));
    },
    [setTodos]
  );

  const toggleTodo = useCallback(
    (id: string) => {
      setTodos((prev) =>
        (Array.isArray(prev) ? prev : []).map((todo) =>
          todo.id === id ? { ...todo, completed: !todo.completed } : todo
        )
      );
    },
    [setTodos]
  );

  const toggleAll = useCallback(
    (completed?: boolean) => {
      setTodos((prev) => {
        const list = Array.isArray(prev) ? prev : [];
        const targetCompleted =
          typeof completed === 'boolean'
            ? completed
            : !(list.length > 0 && list.every((t) => t.completed));
        return list.map((todo) => ({ ...todo, completed: targetCompleted }));
      });
    },
    [setTodos]
  );

  const updateTodo = useCallback(
    (id: string, title: string) => {
      const trimmed = title.trim();
      if (trimmed === '') {
        setTodos((prev) => (Array.isArray(prev) ? prev : []).filter((t) => t.id !== id));
      } else {
        setTodos((prev) =>
          (Array.isArray(prev) ? prev : []).map((todo) =>
            todo.id === id ? { ...todo, title: trimmed } : todo
          )
        );
      }
    },
    [setTodos]
  );

  const deleteTodo = useCallback(
    (id: string) => {
      setTodos((prev) => (Array.isArray(prev) ? prev : []).filter((t) => t.id !== id));
    },
    [setTodos]
  );

  const clearCompleted = useCallback(() => {
    setTodos((prev) => (Array.isArray(prev) ? prev : []).filter((t) => !t.completed));
  }, [setTodos]);

  const activeCount = safeTodos.filter((t) => !t.completed).length;
  const completedCount = safeTodos.filter((t) => t.completed).length;
  const allCompleted = safeTodos.length > 0 && safeTodos.every((t) => t.completed);
  const areAllCompleted = allCompleted;
  const hasTodos = safeTodos.length > 0;

  const filteredTodos = useMemo(() => {
    if (filter === 'active') {
      return safeTodos.filter((t) => !t.completed);
    }
    if (filter === 'completed') {
      return safeTodos.filter((t) => t.completed);
    }
    return safeTodos;
  }, [safeTodos, filter]);

  return {
    todos: safeTodos,
    filteredTodos,
    filter,
    setFilter,
    addTodo,
    toggleTodo,
    toggleAll,
    updateTodo,
    deleteTodo,
    clearCompleted,
    activeCount,
    completedCount,
    allCompleted,
    areAllCompleted,
    hasTodos,
  };
}

export default useTodos;
