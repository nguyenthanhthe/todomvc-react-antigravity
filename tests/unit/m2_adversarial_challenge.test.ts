import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLocalStorage } from '../../src/hooks/useLocalStorage';
import { useTodos } from '../../src/hooks/useTodos';
import { useHashLocation, parseHash } from '../../src/hooks/useHashLocation';
import { Todo } from '../../src/types/todo';

describe('Milestone M2 Empirical Adversarial Challenges', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    window.location.hash = '';
  });

  describe('1. Storage Synchronization Adversarial Suite', () => {
    it('synchronizes hook state when cross-tab StorageEvent provides updated JSON', () => {
      const { result } = renderHook(() => useTodos('sync-test-key'));
      expect(result.current.todos).toEqual([]);

      const externalTodos: Todo[] = [
        { id: 'ext-1', title: 'External 1', completed: false },
        { id: 'ext-2', title: 'External 2', completed: true },
      ];

      act(() => {
        window.dispatchEvent(
          new StorageEvent('storage', {
            key: 'sync-test-key',
            newValue: JSON.stringify(externalTodos),
            storageArea: window.localStorage,
          })
        );
      });

      expect(result.current.todos).toHaveLength(2);
      expect(result.current.todos[0].title).toBe('External 1');
      expect(result.current.todos[1].completed).toBe(true);
      expect(result.current.activeCount).toBe(1);
      expect(result.current.completedCount).toBe(1);
    });

    it('resets to empty array when cross-tab StorageEvent has newValue === null (e.g. storage cleared)', () => {
      const { result } = renderHook(() => useTodos('sync-test-clear'));
      act(() => {
        result.current.addTodo('Item before clear');
      });
      expect(result.current.todos).toHaveLength(1);

      act(() => {
        window.dispatchEvent(
          new StorageEvent('storage', {
            key: 'sync-test-clear',
            newValue: null,
            storageArea: window.localStorage,
          })
        );
      });

      expect(result.current.todos).toEqual([]);
      expect(result.current.hasTodos).toBe(false);
      expect(result.current.activeCount).toBe(0);
    });

    it('ignores StorageEvents dispatched for different keys', () => {
      const { result } = renderHook(() => useTodos('target-key'));
      act(() => {
        result.current.addTodo('Target Todo');
      });

      act(() => {
        window.dispatchEvent(
          new StorageEvent('storage', {
            key: 'completely-different-key',
            newValue: JSON.stringify([{ id: 'unrelated', title: 'Unrelated', completed: true }]),
          })
        );
      });

      expect(result.current.todos).toHaveLength(1);
      expect(result.current.todos[0].title).toBe('Target Todo');
    });

    it('survives corrupted JSON in cross-tab StorageEvent without crashing or dropping in-memory state', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { result } = renderHook(() => useTodos('corrupt-sync-key'));
      act(() => {
        result.current.addTodo('Stable In-Memory Todo');
      });

      act(() => {
        window.dispatchEvent(
          new StorageEvent('storage', {
            key: 'corrupt-sync-key',
            newValue: '{malformed-json-payload-without-closing-bracket',
          })
        );
      });

      expect(result.current.todos).toHaveLength(1);
      expect(result.current.todos[0].title).toBe('Stable In-Memory Todo');
      expect(warnSpy).toHaveBeenCalled();
    });

    it('dynamically reacts to changing the key prop in useLocalStorage', () => {
      localStorage.setItem('key-a', JSON.stringify(['item-a']));
      localStorage.setItem('key-b', JSON.stringify(['item-b']));

      let currentKey = 'key-a';
      const { result, rerender } = renderHook(() => useLocalStorage<string[]>(currentKey, []));

      expect(result.current[0]).toEqual(['item-a']);

      currentKey = 'key-b';
      rerender();
      expect(result.current[0]).toEqual(['item-b']);

      currentKey = 'key-non-existent';
      rerender();
      expect(result.current[0]).toEqual([]);
    });
  });

  describe('2. Corrupted JSON & Malformed Storage Types Suite', () => {
    it('handles localStorage containing non-array primitive types (null, string, object, number, boolean) safely', () => {
      const malformedPayloads = [
        'null',
        '"plain string"',
        '{"some": "object"}',
        '12345',
        'true',
        'false',
        'undefined',
      ];

      malformedPayloads.forEach((payload, idx) => {
        const key = `malformed-key-${idx}`;
        localStorage.setItem(key, payload);
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const { result } = renderHook(() => useTodos(key));
        expect(result.current.todos).toEqual([]);
        expect(result.current.hasTodos).toBe(false);
        expect(result.current.activeCount).toBe(0);
        expect(result.current.completedCount).toBe(0);

        // Verify state is fully operational and can accept new todos
        act(() => {
          result.current.addTodo(`Recovered Todo ${idx}`);
        });

        expect(result.current.todos).toHaveLength(1);
        expect(result.current.todos[0].title).toBe(`Recovered Todo ${idx}`);
        expect(result.current.hasTodos).toBe(true);
        expect(warnSpy).toBeDefined();
      });
    });

    it('safely filters out null elements when localStorage array contains null elements without crashing', () => {
      const weirdData = [
        { id: 'w1', title: 'Valid', completed: false },
        null,
      ];
      localStorage.setItem('weird-array-key', JSON.stringify(weirdData));

      const { result } = renderHook(() => useTodos('weird-array-key'));
      expect(result.current.todos).toHaveLength(1);
      expect(result.current.todos[0].title).toBe('Valid');
      expect(result.current.activeCount).toBe(1);
    });
  });

  describe('3. Quota & Security Exceptions Adversarial Suite', () => {
    it('preserves responsive in-memory state and warns when localStorage.setItem throws QuotaExceededError', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { result } = renderHook(() => useTodos('quota-test-key'));

      // Mock setItem to simulate 5MB storage quota exceeded
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        const err = new Error('QuotaExceededError: The quota has been exceeded.');
        err.name = 'QuotaExceededError';
        throw err;
      });

      act(() => {
        result.current.addTodo('Todo added despite quota exhaustion');
      });

      // Hook state must reflect added item in memory even though disk write failed
      expect(result.current.todos).toHaveLength(1);
      expect(result.current.todos[0].title).toBe('Todo added despite quota exhaustion');
      expect(result.current.activeCount).toBe(1);
      expect(warnSpy).toHaveBeenCalled();
    });

    it('handles SecurityError gracefully when localStorage access is blocked (e.g. sandboxed iframe)', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        const err = new Error('SecurityError: Access is denied for this document.');
        err.name = 'SecurityError';
        throw err;
      });

      const { result } = renderHook(() => useTodos('security-test-key'));
      expect(result.current.todos).toEqual([]);
      expect(result.current.hasTodos).toBe(false);
      expect(warnSpy).toHaveBeenCalled();
    });
  });

  describe('4. Multiple Instances & State Isolation Suite', () => {
    it('keeps two independent hook instances completely isolated when using different keys', () => {
      const { result: hook1 } = renderHook(() => useTodos('instance-1'));
      const { result: hook2 } = renderHook(() => useTodos('instance-2'));

      act(() => {
        hook1.current.addTodo('Task in List 1');
      });

      expect(hook1.current.todos).toHaveLength(1);
      expect(hook1.current.todos[0].title).toBe('Task in List 1');

      expect(hook2.current.todos).toHaveLength(0);
      expect(hook2.current.hasTodos).toBe(false);

      act(() => {
        hook2.current.addTodo('Task in List 2A');
        hook2.current.addTodo('Task in List 2B');
      });

      expect(hook1.current.todos).toHaveLength(1);
      expect(hook2.current.todos).toHaveLength(2);
    });
  });

  describe('5. Rapid Sequential Actions & Concurrency Stress Suite', () => {
    it('processes 100 synchronous addTodo calls in a single act block without loss or collision', () => {
      const { result } = renderHook(() => useTodos('burst-100'));

      act(() => {
        for (let i = 1; i <= 100; i++) {
          result.current.addTodo(`Task #${i}`);
        }
      });

      expect(result.current.todos).toHaveLength(100);
      expect(result.current.activeCount).toBe(100);
      expect(result.current.completedCount).toBe(0);

      // Verify FIFO ordering
      expect(result.current.todos[0].title).toBe('Task #1');
      expect(result.current.todos[99].title).toBe('Task #100');

      // Verify ID uniqueness
      const uniqueIds = new Set(result.current.todos.map((t) => t.id));
      expect(uniqueIds.size).toBe(100);
    });

    it('executes complex interleaved mutations (add, toggle, update, delete, toggleAll, clearCompleted) matching oracle', () => {
      const { result } = renderHook(() => useTodos('interleaved-stress'));

      // Step 1: Add 20 items
      act(() => {
        for (let i = 0; i < 20; i++) {
          result.current.addTodo(`Item ${i}`);
        }
      });
      expect(result.current.todos).toHaveLength(20);

      // Step 2: Toggle all even items (indices 0, 2, 4, ..., 18 = 10 items)
      act(() => {
        for (let i = 0; i < 20; i += 2) {
          result.current.toggleTodo(result.current.todos[i].id);
        }
      });
      expect(result.current.completedCount).toBe(10);
      expect(result.current.activeCount).toBe(10);
      expect(result.current.allCompleted).toBe(false);

      // Step 3: Delete every 5th item from original list
      const idsToDelete = [
        result.current.todos[0].id,
        result.current.todos[5].id,
        result.current.todos[10].id,
        result.current.todos[15].id,
      ];
      act(() => {
        idsToDelete.forEach((id) => result.current.deleteTodo(id));
      });
      expect(result.current.todos).toHaveLength(16);

      // Step 4: Update titles of first 3 items
      act(() => {
        result.current.updateTodo(result.current.todos[0].id, '  Renamed 0  ');
        result.current.updateTodo(result.current.todos[1].id, 'Renamed 1');
        result.current.updateTodo(result.current.todos[2].id, '   '); // Should destroy item 2!
      });
      expect(result.current.todos).toHaveLength(15);
      expect(result.current.todos[0].title).toBe('Renamed 0');
      expect(result.current.todos[1].title).toBe('Renamed 1');

      // Step 5: toggleAll(true)
      act(() => {
        result.current.toggleAll(true);
      });
      expect(result.current.todos.every((t) => t.completed)).toBe(true);
      expect(result.current.allCompleted).toBe(true);
      expect(result.current.areAllCompleted).toBe(true);
      expect(result.current.activeCount).toBe(0);
      expect(result.current.completedCount).toBe(15);

      // Step 6: clearCompleted -> should remove all 15 items
      act(() => {
        result.current.clearCompleted();
      });
      expect(result.current.todos).toHaveLength(0);
      expect(result.current.hasTodos).toBe(false);
      expect(result.current.activeCount).toBe(0);
      expect(result.current.completedCount).toBe(0);
      expect(result.current.allCompleted).toBe(false);
    });

    it('generates unique IDs even when crypto.randomUUID is not available (fallback stress)', () => {
      const originalCrypto = globalThis.crypto;
      // Temporarily strip crypto.randomUUID
      Object.defineProperty(globalThis, 'crypto', {
        value: {
          ...originalCrypto,
          randomUUID: undefined,
        },
        configurable: true,
      });

      try {
        const { result } = renderHook(() => useTodos('fallback-id-stress'));
        act(() => {
          for (let i = 0; i < 50; i++) {
            result.current.addTodo(`Fallback Item ${i}`);
          }
        });

        expect(result.current.todos).toHaveLength(50);
        const ids = new Set(result.current.todos.map((t) => t.id));
        expect(ids.size).toBe(50);
      } finally {
        Object.defineProperty(globalThis, 'crypto', {
          value: originalCrypto,
          configurable: true,
        });
      }
    });
  });

  describe('6. Empty String Trimming & Whitespace Boundary Cases', () => {
    it('rejects all unicode whitespace variants during addTodo', () => {
      const { result } = renderHook(() => useTodos('whitespace-add-stress'));

      const whitespaceSamples = [
        '',
        ' ',
        '   ',
        '\t',
        '\n',
        '\r\n',
        '\f\v',
        '\u00A0', // Non-breaking space
        '\u2000', // En quad
        '\u2001', // Em quad
        '\u2002', // En space
        '\u2003', // Em space
        '\u3000', // Ideographic space
        '  \t\n \u00A0 \u3000  ',
      ];

      act(() => {
        whitespaceSamples.forEach((ws) => result.current.addTodo(ws));
      });

      expect(result.current.todos).toHaveLength(0);
      expect(result.current.hasTodos).toBe(false);
    });

    it('destroys item when updateTodo is called with unicode whitespace variants', () => {
      const { result } = renderHook(() => useTodos('whitespace-update-stress'));

      act(() => {
        result.current.addTodo('Item to Destroy 1');
        result.current.addTodo('Item to Destroy 2');
        result.current.addTodo('Item to Destroy 3');
      });
      expect(result.current.todos).toHaveLength(3);

      const [id1, id2, id3] = result.current.todos.map((t) => t.id);

      act(() => {
        result.current.updateTodo(id1, '');
      });
      expect(result.current.todos).toHaveLength(2);

      act(() => {
        result.current.updateTodo(id2, '   \t\n  ');
      });
      expect(result.current.todos).toHaveLength(1);

      act(() => {
        result.current.updateTodo(id3, '\u00A0 \u3000 ');
      });
      expect(result.current.todos).toHaveLength(0);
    });

    it('preserves internal whitespace, symbols, emojis, and multiline characters without corrupting', () => {
      const { result } = renderHook(() => useTodos('content-preservation-stress'));

      const text = '  ✨  Multiple   Spaces  \n  And   Tabs\t  ';
      act(() => {
        result.current.addTodo(text);
      });

      expect(result.current.todos[0].title).toBe(text.trim());
      expect(result.current.todos[0].title).toBe('✨  Multiple   Spaces  \n  And   Tabs');
    });
  });

  describe('7. ToggleAll & Filtered Navigation State Verification', () => {
    it('properly toggles all items back and forth with auto toggleAll()', () => {
      const { result } = renderHook(() => useTodos('toggle-all-auto'));

      act(() => {
        result.current.addTodo('Todo 1');
        result.current.addTodo('Todo 2');
      });

      // Initially neither is completed -> toggleAll() completes all
      act(() => {
        result.current.toggleAll();
      });
      expect(result.current.allCompleted).toBe(true);
      expect(result.current.areAllCompleted).toBe(true);
      expect(result.current.activeCount).toBe(0);
      expect(result.current.completedCount).toBe(2);

      // Now all are completed -> toggleAll() makes all active
      act(() => {
        result.current.toggleAll();
      });
      expect(result.current.allCompleted).toBe(false);
      expect(result.current.areAllCompleted).toBe(false);
      expect(result.current.activeCount).toBe(2);
      expect(result.current.completedCount).toBe(0);
    });

    it('filters accurately when todos are added or removed while active/completed filter is active', () => {
      const { result } = renderHook(() => useTodos('dynamic-filter-stress'));

      act(() => {
        result.current.addTodo('Task 1');
        result.current.addTodo('Task 2');
      });

      const id1 = result.current.todos[0].id;
      act(() => {
        result.current.toggleTodo(id1);
      });

      // Switch to active filter
      act(() => {
        result.current.setFilter('active');
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      });
      expect(result.current.filter).toBe('active');
      expect(result.current.filteredTodos).toHaveLength(1);
      expect(result.current.filteredTodos[0].title).toBe('Task 2');

      // Add a new item while on active filter -> should immediately appear in filteredTodos
      act(() => {
        result.current.addTodo('Task 3 (New Active)');
      });
      expect(result.current.filteredTodos).toHaveLength(2);

      // Switch to completed filter
      act(() => {
        result.current.setFilter('completed');
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      });
      expect(result.current.filter).toBe('completed');
      expect(result.current.filteredTodos).toHaveLength(1);
      expect(result.current.filteredTodos[0].title).toBe('Task 1');
    });

    it('verifies parseHash utility and useHashLocation react to hash router edge cases', () => {
      expect(parseHash('')).toBe('all');
      expect(parseHash('#/')).toBe('all');
      expect(parseHash('#/ACTIVE/')).toBe('active');
      expect(parseHash('#/COMPLETED/')).toBe('completed');
      expect(parseHash('#/unknown-route-123')).toBe('all');

      const { result } = renderHook(() => useHashLocation());
      expect(result.current).toBe('all');
    });
  });
});
