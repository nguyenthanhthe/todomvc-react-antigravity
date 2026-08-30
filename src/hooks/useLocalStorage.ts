import { useState, useEffect, useCallback, useRef, Dispatch, SetStateAction } from 'react';

/**
 * Generic persistent state hook synchronized with window.localStorage.
 * Handles serialization, parsing, error recovery for corrupted JSON, and window storage events.
 *
 * @param key LocalStorage key name
 * @param initialValue Default value when key does not exist or storage is corrupted
 * @returns [storedValue, setValue]
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, Dispatch<SetStateAction<T>>] {
  const initialValueRef = useRef<T>(initialValue);
  initialValueRef.current = initialValue;

  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return initialValue;
      }
      const item = window.localStorage.getItem(key);
      if (item === null) {
        return initialValue;
      }
      return JSON.parse(item);
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const prevKeyRef = useRef(key);
  useEffect(() => {
    if (prevKeyRef.current !== key) {
      prevKeyRef.current = key;
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          const item = window.localStorage.getItem(key);
          if (item === null) {
            setStoredValue(initialValueRef.current);
          } else {
            setStoredValue(JSON.parse(item));
          }
        }
      } catch (error) {
        console.warn(`Error updating state on key change for "${key}":`, error);
        setStoredValue(initialValueRef.current);
      }
    }
  }, [key]);

  const setValue: Dispatch<SetStateAction<T>> = useCallback(
    (value: SetStateAction<T>) => {
      try {
        setStoredValue((prevValue) => {
          const valueToStore =
            typeof value === 'function'
              ? (value as (prevState: T) => T)(prevValue)
              : value;

          try {
            if (typeof window !== 'undefined' && window.localStorage) {
              window.localStorage.setItem(key, JSON.stringify(valueToStore));
            }
          } catch (error) {
            console.warn(`Error setting localStorage key "${key}":`, error);
          }

          return valueToStore;
        });
      } catch (error) {
        console.warn(`Error setting state for localStorage key "${key}":`, error);
      }
    },
    [key]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key !== key) {
        return;
      }
      try {
        if (event.newValue === null) {
          setStoredValue(initialValueRef.current);
        } else {
          const parsed = JSON.parse(event.newValue);
          setStoredValue(parsed);
        }
      } catch (error) {
        console.warn(`Error parsing storage event value for key "${key}":`, error);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [key]);

  return [storedValue, setValue];
}

export default useLocalStorage;
