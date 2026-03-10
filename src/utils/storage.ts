// Storage utilities for client-side data persistence

export const getStorageItem = (key: string): string | null => {
  try {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(key);
    }
  } catch (error) {
    console.warn('Failed to get storage item:', error);
  }
  return null;
};

export const setStorageItem = (key: string, value: string): void => {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, value);
    }
  } catch (error) {
    console.warn('Failed to set storage item:', error);
  }
};

export const removeStorageItem = (key: string): void => {
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(key);
    }
  } catch (error) {
    console.warn('Failed to remove storage item:', error);
  }
};

export const getSessionStorageItem = (key: string): string | null => {
  try {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem(key);
    }
  } catch (error) {
    console.warn('Failed to get session storage item:', error);
  }
  return null;
};

export const setSessionStorageItem = (key: string, value: string): void => {
  try {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(key, value);
    }
  } catch (error) {
    console.warn('Failed to set session storage item:', error);
  }
};
