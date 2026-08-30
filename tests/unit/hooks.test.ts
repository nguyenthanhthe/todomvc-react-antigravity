import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLocalStorage } from '../../src/hooks/useLocalStorage';
import { useHashLocation, parseHash } from '../../src/hooks/useHashLocation';
import { useTodos } from '../../src/hooks/useTodos';
import { Todo } from '../../src/types/todo';

describe('useLocalStorage Hook', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('initializes with default value when localStorage is empty', () => {
    const { result } = renderHook(() => useLocalStorage<string[]>('test-key', ['default']));
    expect(result.current[0]).toEqual(['default']);
  });

  it('initializes with existing value parsed from localStorage', () => {
    localStorage.setItem('test-key', JSON.stringify(['existing-1', 'existing-2']));
    const { result } = renderHook(() => useLocalStorage<string[]>('test-key', []));
    expect(result.current[0]).toEqual(['existing-1', 'existing-2']);
  });

  it('recovers gracefully from corrupted JSON and returns initialValue', () => {
    localStorage.setItem('corrupt-key', '{invalid-json-data');
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { result } = renderHook(() => useLocalStorage<Todo[]>('corrupt-key', []));
    expect(result.current[0]).toEqual([]);
    expect(warnSpy).toHaveBeenCalled();
  });

  it('recovers gracefully when localStorage.getItem throws SecurityError', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementationOnce(() => {
      throw new Error('SecurityError: The operation is insecure.');
    });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { result } = renderHook(() => useLocalStorage<string>('secure-key', 'fallback'));
    expect(result.current[0]).toBe('fallback');
    expect(warnSpy).toHaveBeenCalled();
  });

  it('updates state and persists serialized JSON to localStorage with direct value', () => {
    const { result } = renderHook(() => useLocalStorage<number>('count-key', 0));

    act(() => {
      result.current[1](42);
    });

    expect(result.current[0]).toBe(42);
    expect(localStorage.getItem('count-key')).toBe('42');
  });

  it('updates state and persists with functional update updater', () => {
    const { result } = renderHook(() => useLocalStorage<number[]>('nums-key', [1]));

    act(() => {
      result.current[1]((prev) => [...prev, 2, 3]);
    });

    expect(result.current[0]).toEqual([1, 2, 3]);
    expect(JSON.parse(localStorage.getItem('nums-key')!)).toEqual([1, 2, 3]);
  });

  it('catches and warns on QuotaExceededError during setItem without crashing', () => {
    const { result } = renderHook(() => useLocalStorage<string>('quota-key', 'initial'));
    vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw new Error('QuotaExceededError');
    });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    act(() => {
      result.current[1]('huge-value');
    });

    expect(result.current[0]).toBe('huge-value');
    expect(warnSpy).toHaveBeenCalled();
  });

  it('synchronizes with window storage event when updated by another window/tab', () => {
    const { result } = renderHook(() => useLocalStorage<string[]>('sync-key', []));

    act(() => {
      const storageEvent = new StorageEvent('storage', {
        key: 'sync-key',
        newValue: JSON.stringify(['item-from-other-tab']),
        storageArea: window.localStorage,
      });
      window.dispatchEvent(storageEvent);
    });

    expect(result.current[0]).toEqual(['item-from-other-tab']);
  });

  it('resets to initialValue on storage event when newValue is null (storage clear)', () => {
    localStorage.setItem('sync-clear', JSON.stringify(['item']));
    const { result } = renderHook(() => useLocalStorage<string[]>('sync-clear', ['fallback-default']));

    act(() => {
      const storageEvent = new StorageEvent('storage', {
        key: 'sync-clear',
        newValue: null,
        storageArea: window.localStorage,
      });
      window.dispatchEvent(storageEvent);
    });

    expect(result.current[0]).toEqual(['fallback-default']);
  });

  it('ignores storage events for other keys or invalid JSON in storage events', () => {
    const { result } = renderHook(() => useLocalStorage<string>('my-key', 'original'));

    act(() => {
      const unrelatedEvent = new StorageEvent('storage', {
        key: 'other-key',
        newValue: JSON.stringify('other-value'),
      });
      window.dispatchEvent(unrelatedEvent);
    });
    expect(result.current[0]).toBe('original');

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    act(() => {
      const corruptEvent = new StorageEvent('storage', {
        key: 'my-key',
        newValue: '{corrupted-json',
      });
      window.dispatchEvent(corruptEvent);
    });
    expect(result.current[0]).toBe('original');
    expect(warnSpy).toHaveBeenCalled();
  });

  it('cleans up storage event listener on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useLocalStorage<string>('cleanup-key', 'val'));

    unmount();
    expect(removeEventListenerSpy).toHaveBeenCalledWith('storage', expect.any(Function));
  });
});

describe('useHashLocation & parseHash Helper', () => {
  beforeEach(() => {
    window.location.hash = '';
  });

  afterEach(() => {
    window.location.hash = '';
  });

  describe('parseHash unit tests', () => {
    it('parses empty, root, and all hashes as "all"', () => {
      expect(parseHash('')).toBe('all');
      expect(parseHash('#')).toBe('all');
      expect(parseHash('#/')).toBe('all');
      expect(parseHash('#/all')).toBe('all');
      expect(parseHash('#all')).toBe('all');
      expect(parseHash('   #/   ')).toBe('all');
    });

    it('parses active route hashes as "active"', () => {
      expect(parseHash('#/active')).toBe('active');
      expect(parseHash('#active')).toBe('active');
      expect(parseHash('#/ACTIVE')).toBe('active');
      expect(parseHash('#/active/')).toBe('active');
    });

    it('parses completed route hashes as "completed"', () => {
      expect(parseHash('#/completed')).toBe('completed');
      expect(parseHash('#completed')).toBe('completed');
      expect(parseHash('#/COMPLETED')).toBe('completed');
      expect(parseHash('#/completed/')).toBe('completed');
    });

    it('falls back to "all" for unknown or malformed routes', () => {
      expect(parseHash('#/unknown-route')).toBe('all');
      expect(parseHash('#/dashboard')).toBe('all');
      expect(parseHash('#invalid-hash')).toBe('all');
    });
  });

  describe('useHashLocation reactive tests', () => {
    it('initializes with current window.location.hash', () => {
      window.location.hash = '#/active';
      const { result } = renderHook(() => useHashLocation());
      expect(result.current).toBe('active');
    });

    it('reacts to hashchange events dynamically', () => {
      const { result } = renderHook(() => useHashLocation());
      expect(result.current).toBe('all');

      act(() => {
        window.location.hash = '#/completed';
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      });
      expect(result.current).toBe('completed');

      act(() => {
        window.location.hash = '#/active';
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      });
      expect(result.current).toBe('active');

      act(() => {
        window.location.hash = '#/';
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      });
      expect(result.current).toBe('all');
    });

    it('cleans up hashchange and popstate listeners on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
      const { unmount } = renderHook(() => useHashLocation());

      unmount();
      expect(removeEventListenerSpy).toHaveBeenCalledWith('hashchange', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('popstate', expect.any(Function));
    });
  });
});

describe('useTodos Domain Hook', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';
  });

  afterEach(() => {
    localStorage.clear();
    window.location.hash = '';
  });

  it('initializes with empty default state', () => {
    const { result } = renderHook(() => useTodos('test-todos'));

    expect(result.current.todos).toEqual([]);
    expect(result.current.filteredTodos).toEqual([]);
    expect(result.current.activeCount).toBe(0);
    expect(result.current.completedCount).toBe(0);
    expect(result.current.allCompleted).toBe(false);
    expect(result.current.areAllCompleted).toBe(false);
    expect(result.current.hasTodos).toBe(false);
    expect(result.current.filter).toBe('all');
  });

  it('rehydrates persisted todos from localStorage', () => {
    const initialItems: Todo[] = [
      { id: '1', title: 'Task 1', completed: false },
      { id: '2', title: 'Task 2', completed: true },
    ];
    localStorage.setItem('test-todos-rehydrate', JSON.stringify(initialItems));

    const { result } = renderHook(() => useTodos('test-todos-rehydrate'));
    expect(result.current.todos).toHaveLength(2);
    expect(result.current.activeCount).toBe(1);
    expect(result.current.completedCount).toBe(1);
    expect(result.current.hasTodos).toBe(true);
    expect(result.current.allCompleted).toBe(false);
  });

  describe('addTodo', () => {
    it('creates a new todo with unique ID, trimmed title, and completed: false', () => {
      const { result } = renderHook(() => useTodos('test-todos'));

      act(() => {
        result.current.addTodo('  Buy milk  ');
      });

      expect(result.current.todos).toHaveLength(1);
      expect(result.current.todos[0].title).toBe('Buy milk');
      expect(result.current.todos[0].completed).toBe(false);
      expect(result.current.todos[0].id).toBeTruthy();
      expect(result.current.activeCount).toBe(1);
      expect(result.current.hasTodos).toBe(true);

      const stored = JSON.parse(localStorage.getItem('test-todos')!);
      expect(stored[0].title).toBe('Buy milk');
    });

    it('ignores empty string submissions', () => {
      const { result } = renderHook(() => useTodos('test-todos'));

      act(() => {
        result.current.addTodo('');
      });

      expect(result.current.todos).toHaveLength(0);
      expect(result.current.hasTodos).toBe(false);
    });

    it('ignores whitespace-only string submissions', () => {
      const { result } = renderHook(() => useTodos('test-todos'));

      act(() => {
        result.current.addTodo('   \t\n  ');
      });

      expect(result.current.todos).toHaveLength(0);
      expect(result.current.hasTodos).toBe(false);
    });

    it('appends multiple todos in sequential order with distinct IDs', () => {
      const { result } = renderHook(() => useTodos('test-todos'));

      act(() => {
        result.current.addTodo('First Todo');
        result.current.addTodo('Second Todo');
        result.current.addTodo('Third Todo');
      });

      expect(result.current.todos).toHaveLength(3);
      expect(result.current.todos[0].title).toBe('First Todo');
      expect(result.current.todos[1].title).toBe('Second Todo');
      expect(result.current.todos[2].title).toBe('Third Todo');
      expect(result.current.todos[0].id).not.toBe(result.current.todos[1].id);
      expect(result.current.todos[1].id).not.toBe(result.current.todos[2].id);
    });

    it('handles special characters, unicode, and emojis safely', () => {
      const { result } = renderHook(() => useTodos('test-todos'));

      act(() => {
        result.current.addTodo('🚀 Deploy to Prod <script>alert("xss")</script> & verify');
      });

      expect(result.current.todos[0].title).toBe('🚀 Deploy to Prod <script>alert("xss")</script> & verify');
    });
  });

  describe('toggleTodo', () => {
    it('flips completed state from false to true and back', () => {
      const { result } = renderHook(() => useTodos('test-todos'));

      act(() => {
        result.current.addTodo('Toggle Item');
      });

      const todoId = result.current.todos[0].id;
      expect(result.current.todos[0].completed).toBe(false);
      expect(result.current.activeCount).toBe(1);
      expect(result.current.completedCount).toBe(0);
      expect(result.current.allCompleted).toBe(false);

      act(() => {
        result.current.toggleTodo(todoId);
      });

      expect(result.current.todos[0].completed).toBe(true);
      expect(result.current.activeCount).toBe(0);
      expect(result.current.completedCount).toBe(1);
      expect(result.current.allCompleted).toBe(true);
      expect(result.current.areAllCompleted).toBe(true);

      act(() => {
        result.current.toggleTodo(todoId);
      });

      expect(result.current.todos[0].completed).toBe(false);
      expect(result.current.activeCount).toBe(1);
      expect(result.current.completedCount).toBe(0);
      expect(result.current.allCompleted).toBe(false);
    });

    it('does not affect other items when toggling one item', () => {
      const { result } = renderHook(() => useTodos('test-todos'));

      act(() => {
        result.current.addTodo('Item 1');
        result.current.addTodo('Item 2');
      });

      const id1 = result.current.todos[0].id;
      const id2 = result.current.todos[1].id;

      act(() => {
        result.current.toggleTodo(id1);
      });

      expect(result.current.todos.find((t) => t.id === id1)?.completed).toBe(true);
      expect(result.current.todos.find((t) => t.id === id2)?.completed).toBe(false);
    });

    it('ignores toggle calls for non-existent IDs without crashing', () => {
      const { result } = renderHook(() => useTodos('test-todos'));

      act(() => {
        result.current.addTodo('Item 1');
      });

      act(() => {
        result.current.toggleTodo('non-existent-id');
      });

      expect(result.current.todos[0].completed).toBe(false);
    });
  });

  describe('toggleAll', () => {
    it('marks all items complete when toggleAll(true) is called', () => {
      const { result } = renderHook(() => useTodos('test-todos'));

      act(() => {
        result.current.addTodo('Item 1');
        result.current.addTodo('Item 2');
      });

      act(() => {
        result.current.toggleAll(true);
      });

      expect(result.current.todos.every((t) => t.completed)).toBe(true);
      expect(result.current.allCompleted).toBe(true);
      expect(result.current.activeCount).toBe(0);
      expect(result.current.completedCount).toBe(2);
    });

    it('marks all items active when toggleAll(false) is called', () => {
      const { result } = renderHook(() => useTodos('test-todos'));

      act(() => {
        result.current.addTodo('Item 1');
        result.current.addTodo('Item 2');
        result.current.toggleAll(true);
      });

      expect(result.current.allCompleted).toBe(true);

      act(() => {
        result.current.toggleAll(false);
      });

      expect(result.current.todos.every((t) => !t.completed)).toBe(true);
      expect(result.current.allCompleted).toBe(false);
      expect(result.current.activeCount).toBe(2);
      expect(result.current.completedCount).toBe(0);
    });

    it('toggles automatically based on areAllCompleted when called without boolean arg', () => {
      const { result } = renderHook(() => useTodos('test-todos'));

      act(() => {
        result.current.addTodo('Item 1');
        result.current.addTodo('Item 2');
      });

      // Initially not all completed -> toggleAll() completes all
      act(() => {
        result.current.toggleAll();
      });
      expect(result.current.todos.every((t) => t.completed)).toBe(true);
      expect(result.current.allCompleted).toBe(true);

      // Now all completed -> toggleAll() clears all
      act(() => {
        result.current.toggleAll();
      });
      expect(result.current.todos.every((t) => !t.completed)).toBe(true);
      expect(result.current.allCompleted).toBe(false);
    });
  });

  describe('updateTodo', () => {
    it('updates title with trimmed string and preserves completed status', () => {
      const { result } = renderHook(() => useTodos('test-todos'));

      act(() => {
        result.current.addTodo('Original Title');
      });
      const id = result.current.todos[0].id;

      act(() => {
        result.current.toggleTodo(id);
      });
      expect(result.current.todos[0].completed).toBe(true);

      act(() => {
        result.current.updateTodo(id, '  Updated Title  ');
      });

      expect(result.current.todos[0].title).toBe('Updated Title');
      expect(result.current.todos[0].completed).toBe(true);
    });

    it('deletes the item if updated title is empty string', () => {
      const { result } = renderHook(() => useTodos('test-todos'));

      act(() => {
        result.current.addTodo('Item to Delete');
      });
      const id = result.current.todos[0].id;

      act(() => {
        result.current.updateTodo(id, '');
      });

      expect(result.current.todos).toHaveLength(0);
      expect(result.current.hasTodos).toBe(false);
    });

    it('deletes the item if updated title is whitespace-only', () => {
      const { result } = renderHook(() => useTodos('test-todos'));

      act(() => {
        result.current.addTodo('Item to Delete');
      });
      const id = result.current.todos[0].id;

      act(() => {
        result.current.updateTodo(id, '    \n\t  ');
      });

      expect(result.current.todos).toHaveLength(0);
      expect(result.current.hasTodos).toBe(false);
    });

    it('ignores update for non-existent ID without error', () => {
      const { result } = renderHook(() => useTodos('test-todos'));

      act(() => {
        result.current.addTodo('Existing');
      });

      act(() => {
        result.current.updateTodo('missing-id', 'New Title');
      });

      expect(result.current.todos[0].title).toBe('Existing');
    });
  });

  describe('deleteTodo', () => {
    it('removes item with matching ID', () => {
      const { result } = renderHook(() => useTodos('test-todos'));

      act(() => {
        result.current.addTodo('Item 1');
        result.current.addTodo('Item 2');
      });

      const id1 = result.current.todos[0].id;
      const id2 = result.current.todos[1].id;

      act(() => {
        result.current.deleteTodo(id1);
      });

      expect(result.current.todos).toHaveLength(1);
      expect(result.current.todos[0].id).toBe(id2);
      expect(result.current.todos[0].title).toBe('Item 2');
    });

    it('resets hasTodos and counts when all items are deleted', () => {
      const { result } = renderHook(() => useTodos('test-todos'));

      act(() => {
        result.current.addTodo('Sole Item');
      });
      const id = result.current.todos[0].id;

      act(() => {
        result.current.deleteTodo(id);
      });

      expect(result.current.todos).toHaveLength(0);
      expect(result.current.hasTodos).toBe(false);
      expect(result.current.activeCount).toBe(0);
      expect(result.current.completedCount).toBe(0);
      expect(result.current.allCompleted).toBe(false);
    });
  });

  describe('clearCompleted', () => {
    it('removes all completed items while keeping active items', () => {
      const { result } = renderHook(() => useTodos('test-todos'));

      act(() => {
        result.current.addTodo('Active 1');
        result.current.addTodo('Completed 1');
        result.current.addTodo('Active 2');
        result.current.addTodo('Completed 2');
      });

      const idC1 = result.current.todos[1].id;
      const idC2 = result.current.todos[3].id;

      act(() => {
        result.current.toggleTodo(idC1);
        result.current.toggleTodo(idC2);
      });

      expect(result.current.activeCount).toBe(2);
      expect(result.current.completedCount).toBe(2);

      act(() => {
        result.current.clearCompleted();
      });

      expect(result.current.todos).toHaveLength(2);
      expect(result.current.todos[0].title).toBe('Active 1');
      expect(result.current.todos[1].title).toBe('Active 2');
      expect(result.current.activeCount).toBe(2);
      expect(result.current.completedCount).toBe(0);
    });

    it('does nothing when no completed items exist', () => {
      const { result } = renderHook(() => useTodos('test-todos'));

      act(() => {
        result.current.addTodo('Active Item');
      });

      act(() => {
        result.current.clearCompleted();
      });

      expect(result.current.todos).toHaveLength(1);
    });
  });

  describe('filtering & filteredTodos', () => {
    it('filters items correctly for active and completed routes', () => {
      const { result } = renderHook(() => useTodos('test-todos'));

      act(() => {
        result.current.addTodo('Task 1');
        result.current.addTodo('Task 2');
      });
      const id2 = result.current.todos[1].id;

      act(() => {
        result.current.toggleTodo(id2);
      });

      // Default 'all' filter
      expect(result.current.filteredTodos).toHaveLength(2);

      // Programmatic setFilter to 'active'
      act(() => {
        result.current.setFilter('active');
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      });
      expect(result.current.filter).toBe('active');
      expect(result.current.filteredTodos).toHaveLength(1);
      expect(result.current.filteredTodos[0].title).toBe('Task 1');

      // Programmatic setFilter to 'completed'
      act(() => {
        result.current.setFilter('completed');
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      });
      expect(result.current.filter).toBe('completed');
      expect(result.current.filteredTodos).toHaveLength(1);
      expect(result.current.filteredTodos[0].title).toBe('Task 2');

      // Programmatic setFilter back to 'all'
      act(() => {
        result.current.setFilter('all');
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      });
      expect(result.current.filter).toBe('all');
      expect(result.current.filteredTodos).toHaveLength(2);
    });
  });

  describe('Adversarial & Boundary Stress Tests', () => {
    it('supports adding items with identical titles but guarantees distinct IDs', () => {
      const { result } = renderHook(() => useTodos('test-todos-dup'));

      act(() => {
        result.current.addTodo('Duplicate Title');
        result.current.addTodo('Duplicate Title');
        result.current.addTodo('Duplicate Title');
      });

      expect(result.current.todos).toHaveLength(3);
      const ids = new Set(result.current.todos.map((t) => t.id));
      expect(ids.size).toBe(3);
    });

    it('preserves internal whitespace while trimming edges', () => {
      const { result } = renderHook(() => useTodos('test-todos-ws'));

      act(() => {
        result.current.addTodo('   Task   with   spaces   ');
      });

      expect(result.current.todos[0].title).toBe('Task   with   spaces');

      const id = result.current.todos[0].id;
      act(() => {
        result.current.updateTodo(id, '   Updated   internal   spaces   ');
      });
      expect(result.current.todos[0].title).toBe('Updated   internal   spaces');
    });

    it('safely handles empty state actions without crashing', () => {
      const { result } = renderHook(() => useTodos('test-todos-empty-actions'));

      act(() => {
        result.current.toggleTodo('non-existent');
        result.current.toggleAll();
        result.current.toggleAll(true);
        result.current.toggleAll(false);
        result.current.updateTodo('non-existent', 'Title');
        result.current.deleteTodo('non-existent');
        result.current.clearCompleted();
      });

      expect(result.current.todos).toEqual([]);
      expect(result.current.hasTodos).toBe(false);
      expect(result.current.activeCount).toBe(0);
      expect(result.current.completedCount).toBe(0);
    });

    it('recovers from corrupt storage during useTodos initialization and accepts new todos', () => {
      localStorage.setItem('corrupt-todos-key', 'INVALID_JSON_CORRUPTION{{[');
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const { result } = renderHook(() => useTodos('corrupt-todos-key'));
      expect(result.current.todos).toEqual([]);
      expect(result.current.hasTodos).toBe(false);

      act(() => {
        result.current.addTodo('New item after corruption');
      });

      expect(result.current.todos).toHaveLength(1);
      expect(result.current.todos[0].title).toBe('New item after corruption');
      expect(warnSpy).toHaveBeenCalled();
    });
  });
});
