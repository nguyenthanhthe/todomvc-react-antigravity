import { useState, useEffect } from 'react';
import { FilterType } from '../types/todo';

/**
 * Normalizes and parses a URL hash string into a valid FilterType.
 * Supported routes:
 * - '#/' or '' or '#/all' -> 'all'
 * - '#/active' or '#active' -> 'active'
 * - '#/completed' or '#completed' -> 'completed'
 * - Fallback for any other / unknown route -> 'all'
 */
export function parseHash(hash: string): FilterType {
  const normalized = hash
    .trim()
    .replace(/^#\/?/, '')
    .replace(/\/+$/, '')
    .toLowerCase();
  if (normalized === 'active') {
    return 'active';
  }
  if (normalized === 'completed') {
    return 'completed';
  }
  return 'all';
}

/**
 * Hash routing hook tracking window.location.hash and returning FilterType ('all' | 'active' | 'completed').
 * Automatically synchronizes with browser hash changes and cleans up event listeners on unmount.
 */
export function useHashLocation(): FilterType {
  const [filter, setFilter] = useState<FilterType>(() => {
    if (typeof window === 'undefined') {
      return 'all';
    }
    return parseHash(window.location.hash);
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleHashChange = () => {
      setFilter(parseHash(window.location.hash));
    };

    // Initialize with current hash
    handleHashChange();

    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handleHashChange);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handleHashChange);
    };
  }, []);

  return filter;
}

export default useHashLocation;
