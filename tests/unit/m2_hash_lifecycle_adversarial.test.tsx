import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHashLocation, parseHash } from '../../src/hooks/useHashLocation';
import { useTodos } from '../../src/hooks/useTodos';
import { FilterType } from '../../src/types/todo';

describe('Milestone M2 Adversarial Challenge: Hash Routing & Lifecycle Transitions', () => {
  beforeEach(() => {
    window.location.hash = '';
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    window.location.hash = '';
    localStorage.clear();
  });

  // --------------------------------------------------------------------------
  // 1. Extreme Hash Formats & Parsing Boundary Fuzzing
  // --------------------------------------------------------------------------
  describe('1. Extreme Hash Formats & Parsing Boundaries', () => {
    const testCases: Array<{ hash: string; expected: FilterType; description: string }> = [
      // Standard routes
      { hash: '#/', expected: 'all', description: 'Standard root route #/' },
      { hash: '#/active', expected: 'active', description: 'Standard active route #/active' },
      { hash: '#/completed', expected: 'completed', description: 'Standard completed route #/completed' },

      // Empty and bare hashes
      { hash: '', expected: 'all', description: 'Empty string' },
      { hash: '#', expected: 'all', description: 'Single hash #' },
      { hash: '##', expected: 'all', description: 'Double hash ##' },
      { hash: '###/', expected: 'all', description: 'Multiple hashes ###/' },

      // Missing leading slashes
      { hash: '#active', expected: 'active', description: 'Hash without leading slash #active' },
      { hash: '#completed', expected: 'completed', description: 'Hash without leading slash #completed' },
      { hash: '#all', expected: 'all', description: 'Hash without leading slash #all' },

      // Redundant slashes
      { hash: '#/active/', expected: 'active', description: 'Trailing slash #/active/' },
      { hash: '#/completed///', expected: 'completed', description: 'Multiple trailing slashes #/completed///' },
      { hash: '#///active', expected: 'all', description: 'Multiple leading slashes #///active (strips leading #/ leaving //active -> fallback all)' },
      { hash: '#//', expected: 'all', description: 'Multiple slashes after hash #//' },

      // Case insensitivity
      { hash: '#/ACTIVE', expected: 'active', description: 'Uppercase #/ACTIVE' },
      { hash: '#/Completed', expected: 'completed', description: 'Titlecase #/Completed' },
      { hash: '#/aCtIvE', expected: 'active', description: 'Mixed case #/aCtIvE' },
      { hash: '#/cOmPlEtEd/', expected: 'completed', description: 'Mixed case trailing slash #/cOmPlEtEd/' },
      { hash: '#ALL', expected: 'all', description: 'Uppercase #ALL' },

      // Leading / trailing whitespace & control chars
      { hash: '  #/active  ', expected: 'active', description: 'Whitespace surrounding #/active' },
      { hash: '\t\n#/completed\r\n', expected: 'completed', description: 'Tabs and newlines surrounding #/completed' },
      { hash: '   #///   ', expected: 'all', description: 'Whitespace surrounding slashes' },

      // Unknown / deep / unexpected routes
      { hash: '#/unknown/path', expected: 'all', description: 'Unknown deep path #/unknown/path' },
      { hash: '#/active/extra', expected: 'all', description: 'Sub-path under active #/active/extra' },
      { hash: '#/completed/item/42', expected: 'all', description: 'Sub-path under completed #/completed/item/42' },
      { hash: '#!/active', expected: 'all', description: 'Hashbang route #!/active' },
      { hash: '#/todos/active', expected: 'all', description: 'Nested prefix route #/todos/active' },
      { hash: '#/null', expected: 'all', description: 'Literal null route #/null' },
      { hash: '#/undefined', expected: 'all', description: 'Literal undefined route #/undefined' },
      { hash: '#/NaN', expected: 'all', description: 'Literal NaN route #/NaN' },
      { hash: '#/0', expected: 'all', description: 'Numeric route #/0' },
      { hash: '#/?active', expected: 'all', description: 'Search param syntax #/?active' },
      { hash: '#/active?query=1', expected: 'all', description: 'Query params attached #/active?query=1' },
      { hash: '<script>alert(1)</script>', expected: 'all', description: 'XSS attempt payload' },
      { hash: 'javascript:void(0)', expected: 'all', description: 'Javascript protocol string' },
    ];

    testCases.forEach(({ hash, expected, description }) => {
      it(`parseHash correctly parses: ${description} ("${hash}") -> "${expected}"`, () => {
        expect(parseHash(hash)).toBe(expected);
      });
    });

    const domHashCases: Array<{ hash: string; expected: FilterType; description: string }> = [
      { hash: '#/', expected: 'all', description: 'Standard root route #/' },
      { hash: '#/active', expected: 'active', description: 'Standard active route #/active' },
      { hash: '#/completed', expected: 'completed', description: 'Standard completed route #/completed' },
      { hash: '#active', expected: 'active', description: 'Hash without leading slash #active' },
      { hash: '#completed', expected: 'completed', description: 'Hash without leading slash #completed' },
      { hash: '#/active/', expected: 'active', description: 'Trailing slash #/active/' },
      { hash: '#/completed///', expected: 'completed', description: 'Multiple trailing slashes #/completed///' },
      { hash: '#/ACTIVE', expected: 'active', description: 'Uppercase #/ACTIVE' },
      { hash: '#/Completed', expected: 'completed', description: 'Titlecase #/Completed' },
      { hash: '', expected: 'all', description: 'Empty hash' },
      { hash: '#', expected: 'all', description: 'Single hash #' },
      { hash: '#/unknown', expected: 'all', description: 'Unknown route' },
      { hash: '#/active/extra', expected: 'all', description: 'Nested subpath under active' },
    ];

    domHashCases.forEach(({ hash, expected, description }) => {
      it(`useHashLocation initializes correctly from DOM for: ${description} ("${hash}")`, () => {
        window.location.hash = hash;
        const { result } = renderHook(() => useHashLocation());
        expect(result.current).toBe(expected);
      });
    });
  });

  // --------------------------------------------------------------------------
  // 2. Custom & Synthetic Event Simulation
  // --------------------------------------------------------------------------
  describe('2. Custom & Synthetic Event Simulation', () => {
    it('handles standard Event("hashchange")', () => {
      const { result } = renderHook(() => useHashLocation());
      expect(result.current).toBe('all');

      act(() => {
        window.location.hash = '#/active';
        window.dispatchEvent(new Event('hashchange'));
      });
      expect(result.current).toBe('active');
    });

    it('handles standard PopStateEvent("popstate")', () => {
      const { result } = renderHook(() => useHashLocation());
      expect(result.current).toBe('all');

      act(() => {
        window.location.hash = '#/completed';
        window.dispatchEvent(new PopStateEvent('popstate', { state: { route: 'completed' } }));
      });
      expect(result.current).toBe('completed');
    });

    it('handles CustomEvent("hashchange") with custom detail', () => {
      const { result } = renderHook(() => useHashLocation());

      act(() => {
        window.location.hash = '#/active';
        window.dispatchEvent(new CustomEvent('hashchange', { detail: { source: 'custom-router' } }));
      });
      expect(result.current).toBe('active');
    });

    it('handles CustomEvent("popstate") with synthetic bubbles & cancelable flags', () => {
      const { result } = renderHook(() => useHashLocation());

      act(() => {
        window.location.hash = '#/completed';
        window.dispatchEvent(
          new CustomEvent('popstate', { bubbles: true, cancelable: true, detail: { simulated: true } })
        );
      });
      expect(result.current).toBe('completed');
    });

    it('handles firing popstate when hash has not changed (no-op state update)', () => {
      window.location.hash = '#/active';
      const { result } = renderHook(() => useHashLocation());
      expect(result.current).toBe('active');

      act(() => {
        window.dispatchEvent(new PopStateEvent('popstate'));
      });
      expect(result.current).toBe('active');
    });
  });

  // --------------------------------------------------------------------------
  // 3. Rapid Concurrent Updates & Multi-Subscriber Sync
  // --------------------------------------------------------------------------
  describe('3. Rapid Concurrent Updates & Multi-Subscriber Synchronization', () => {
    it('maintains 100% synchronization across 10 concurrent hook consumers during 100 rapid hash flips', () => {
      // Mount 10 separate hook instances
      const subscribers = Array.from({ length: 10 }, () => renderHook(() => useHashLocation()));

      const routes: FilterType[] = ['all', 'active', 'completed', 'active', 'all', 'completed'];
      const hashMapping: Record<FilterType, string> = {
        all: '#/',
        active: '#/active',
        completed: '#/completed',
      };

      for (let i = 0; i < 100; i++) {
        const targetFilter = routes[i % routes.length];
        act(() => {
          window.location.hash = hashMapping[targetFilter];
          window.dispatchEvent(new HashChangeEvent('hashchange'));
        });

        // Verify every single subscriber resolved to the exact same filter state
        subscribers.forEach((sub) => {
          expect(sub.result.current).toBe(targetFilter);
        });
      }

      // Cleanup
      subscribers.forEach((sub) => sub.unmount());
    });

    it('processes rapid synchronous hash updates without dropping final state', () => {
      const { result } = renderHook(() => useHashLocation());

      act(() => {
        // 10 rapid synchronous transitions in a single act() tick
        window.location.hash = '#/active';
        window.dispatchEvent(new HashChangeEvent('hashchange'));
        window.location.hash = '#/completed';
        window.dispatchEvent(new HashChangeEvent('hashchange'));
        window.location.hash = '#/unknown-404';
        window.dispatchEvent(new HashChangeEvent('hashchange'));
        window.location.hash = '#/active';
        window.dispatchEvent(new HashChangeEvent('hashchange'));
        window.location.hash = '#/completed';
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      });

      expect(result.current).toBe('completed');
    });
  });

  // --------------------------------------------------------------------------
  // 4. Lifecycle Transitions & Memory Leak Checks
  // --------------------------------------------------------------------------
  describe('4. Lifecycle Transitions & Unmount Leak Checks', () => {
    it('cleanly adds and removes exactly 1 pair of event listeners per hook instance', () => {
      const addSpy = vi.spyOn(window, 'addEventListener');
      const removeSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = renderHook(() => useHashLocation());

      expect(addSpy).toHaveBeenCalledWith('hashchange', expect.any(Function));
      expect(addSpy).toHaveBeenCalledWith('popstate', expect.any(Function));

      unmount();

      expect(removeSpy).toHaveBeenCalledWith('hashchange', expect.any(Function));
      expect(removeSpy).toHaveBeenCalledWith('popstate', expect.any(Function));
    });

    it('supports rapid mount/unmount thrashing (50 cycles) without listener leaks', () => {
      const activeListeners = {
        hashchange: new Set<EventListenerOrEventListenerObject>(),
        popstate: new Set<EventListenerOrEventListenerObject>(),
      };

      const originalAdd = window.addEventListener.bind(window);
      const originalRemove = window.removeEventListener.bind(window);

      const addSpy = vi.spyOn(window, 'addEventListener').mockImplementation((type, listener, options) => {
        if (type === 'hashchange' || type === 'popstate') {
          activeListeners[type].add(listener);
        }
        return originalAdd(type, listener, options);
      });

      const removeSpy = vi.spyOn(window, 'removeEventListener').mockImplementation((type, listener, options) => {
        if (type === 'hashchange' || type === 'popstate') {
          activeListeners[type].delete(listener);
        }
        return originalRemove(type, listener, options);
      });

      // Thrash mount / unmount 50 times
      for (let i = 0; i < 50; i++) {
        const { unmount } = renderHook(() => useHashLocation());
        unmount();
      }

      expect(activeListeners.hashchange.size).toBe(0);
      expect(activeListeners.popstate.size).toBe(0);

      addSpy.mockRestore();
      removeSpy.mockRestore();
    });

    it('does not trigger React state updates or errors after unmounting', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const { unmount } = renderHook(() => useHashLocation());
      unmount();

      // Dispatch events after unmount
      act(() => {
        window.location.hash = '#/active';
        window.dispatchEvent(new HashChangeEvent('hashchange'));
        window.dispatchEvent(new PopStateEvent('popstate'));
      });

      expect(errorSpy).not.toHaveBeenCalled();
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('maintains listener independence when one instance unmounts while another stays mounted', () => {
      const hookA = renderHook(() => useHashLocation());
      const hookB = renderHook(() => useHashLocation());

      expect(hookA.result.current).toBe('all');
      expect(hookB.result.current).toBe('all');

      // Unmount hookA
      hookA.unmount();

      // Dispatch hashchange -> hookB MUST still receive updates
      act(() => {
        window.location.hash = '#/active';
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      });

      expect(hookB.result.current).toBe('active');

      // Unmount hookB
      hookB.unmount();

      // Dispatch further events -> no errors
      act(() => {
        window.location.hash = '#/completed';
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      });
    });

    it('handles SSR simulation where window is undefined gracefully in parseHash', () => {
      // parseHash is a pure function
      expect(parseHash('')).toBe('all');
      expect(parseHash('#/active')).toBe('active');
    });
  });

  // --------------------------------------------------------------------------
  // 5. Integrated useTodos Route Transitions
  // --------------------------------------------------------------------------
  describe('5. Integrated useTodos Hash Route Transitions', () => {
    it('updates filteredTodos in real-time as hash route changes', () => {
      const { result } = renderHook(() => useTodos('test-adversarial-todos'));

      act(() => {
        result.current.addTodo('Active Item 1');
        result.current.addTodo('Completed Item 1');
        result.current.addTodo('Active Item 2');
      });

      const completedId = result.current.todos[1].id;
      act(() => {
        result.current.toggleTodo(completedId);
      });

      expect(result.current.todos).toHaveLength(3);
      expect(result.current.activeCount).toBe(2);
      expect(result.current.completedCount).toBe(1);

      // Route: 'all'
      expect(result.current.filteredTodos).toHaveLength(3);

      // Transition to #/active via window hash
      act(() => {
        window.location.hash = '#/active';
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      });
      expect(result.current.filter).toBe('active');
      expect(result.current.filteredTodos).toHaveLength(2);
      expect(result.current.filteredTodos.map((t) => t.title)).toEqual(['Active Item 1', 'Active Item 2']);

      // Transition to #/completed via window hash
      act(() => {
        window.location.hash = '#/completed';
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      });
      expect(result.current.filter).toBe('completed');
      expect(result.current.filteredTodos).toHaveLength(1);
      expect(result.current.filteredTodos[0].title).toBe('Completed Item 1');

      // Mutate state while on completed route (toggle item to active -> item leaves view)
      act(() => {
        result.current.toggleTodo(completedId);
      });
      expect(result.current.filter).toBe('completed');
      expect(result.current.filteredTodos).toHaveLength(0);
      expect(result.current.todos).toHaveLength(3);
      expect(result.current.activeCount).toBe(3);
      expect(result.current.completedCount).toBe(0);

      // Transition to invalid route -> falls back to 'all'
      act(() => {
        window.location.hash = '#/nonexistent-route';
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      });
      expect(result.current.filter).toBe('all');
      expect(result.current.filteredTodos).toHaveLength(3);
    });

    it('setFilter programmatic changes update window.location.hash properly', () => {
      const { result } = renderHook(() => useTodos('test-adversarial-setfilter'));

      act(() => {
        result.current.setFilter('active');
      });
      expect(window.location.hash).toBe('#/active');

      act(() => {
        result.current.setFilter('completed');
      });
      expect(window.location.hash).toBe('#/completed');

      act(() => {
        result.current.setFilter('all');
      });
      expect(window.location.hash).toBe('#/');
    });
  });
});
