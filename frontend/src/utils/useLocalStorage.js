import { useState, useEffect } from 'react';

/**
 * Custom hook to sync state with localStorage seamlessly.
 *
 * @param {string} key - localStorage key
 * @param {any} initialValue - default value if nothing is stored
 * @returns {[any, Function]} [value, setValue]
 */
export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const item = localStorage.getItem(key);
      if (item === null) {
        return typeof initialValue === 'function' ? initialValue() : initialValue;
      }
      return JSON.parse(item);
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return typeof initialValue === 'function' ? initialValue() : initialValue;
    }
  });

  useEffect(() => {
    try {
      if (value === undefined) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (error) {
      console.warn(`Error writing localStorage key "${key}":`, error);
    }
  }, [key, value]);

  return [value, setValue];
}

/**
 * Direct safe helper to retrieve a parsed item from localStorage
 */
export function getStoredItem(key, defaultValue = null) {
  try {
    const item = localStorage.getItem(key);
    if (item === null) return defaultValue;
    return JSON.parse(item);
  } catch (e) {
    console.warn(`Error parsing localStorage item for "${key}":`, e);
    return defaultValue;
  }
}

/**
 * Direct safe helper to store a JSON-serializable item in localStorage
 */
export function setStoredItem(key, value) {
  try {
    if (value === undefined) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, JSON.stringify(value));
    }
  } catch (e) {
    console.warn(`Error saving item to localStorage for "${key}":`, e);
  }
}

/**
 * Direct safe helper to remove an item from localStorage
 */
export function removeStoredItem(key) {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.warn(`Error removing localStorage item for "${key}":`, e);
  }
}
