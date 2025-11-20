/**
 * Test Setup
 * Global test configuration and mocks
 */

import '@testing-library/jest-dom';
import { beforeEach } from 'vitest';

// Mock localStorage for tests
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

global.localStorage = localStorageMock as any;

// Mock crypto.getRandomValues
if (!global.crypto) {
  global.crypto = {} as any;
}

global.crypto.getRandomValues = (array: any) => {
  for (let i = 0; i < array.length; i++) {
    array[i] = Math.floor(Math.random() * 256);
  }
  return array;
};

// Clear localStorage before each test
beforeEach(() => {
  localStorage.clear();
});
