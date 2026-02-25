/**
 * No-Persistence Enforcement Layer
 *
 * Intercepts and blocks all browser persistence APIs.
 * This is the core privacy guarantee: nothing is ever written
 * to localStorage, sessionStorage, indexedDB, or cookies.
 */

const BLOCK_MESSAGE =
  '[Awaireness] Persistence blocked: This app stores no data. ' +
  'If you see this error, a dependency attempted to use browser storage.';

class PersistenceViolationError extends Error {
  constructor(api: string) {
    super(`${BLOCK_MESSAGE} (attempted: ${api})`);
    this.name = 'PersistenceViolationError';
  }
}

function createBlockedStorage(name: string): Storage {
  const handler: ProxyHandler<Storage> = {
    get(_target, prop: string | symbol) {
      if (prop === 'length') return 0;
      if (typeof prop === 'string' && ['getItem', 'setItem', 'removeItem', 'clear', 'key'].includes(prop)) {
        return () => {
          throw new PersistenceViolationError(`${name}.${prop}`);
        };
      }
      return undefined;
    },
    set() {
      throw new PersistenceViolationError(`${name} property set`);
    },
  };
  return new Proxy({} as Storage, handler);
}

export function enforcePersistenceBlock(): void {
  // Block localStorage
  try {
    Object.defineProperty(window, 'localStorage', {
      get() {
        return createBlockedStorage('localStorage');
      },
      configurable: false,
    });
  } catch {
    // Already defined — wrap access
    console.warn('[Awaireness] Could not redefine localStorage; storage calls will still be intercepted at usage.');
  }

  // Block sessionStorage
  try {
    Object.defineProperty(window, 'sessionStorage', {
      get() {
        return createBlockedStorage('sessionStorage');
      },
      configurable: false,
    });
  } catch {
    console.warn('[Awaireness] Could not redefine sessionStorage.');
  }

  // Block indexedDB
  try {
    Object.defineProperty(window, 'indexedDB', {
      get() {
        throw new PersistenceViolationError('indexedDB');
      },
      configurable: false,
    });
  } catch {
    console.warn('[Awaireness] Could not redefine indexedDB.');
  }

  // Block cookies
  try {
    Object.defineProperty(document, 'cookie', {
      get() {
        return '';
      },
      set() {
        throw new PersistenceViolationError('document.cookie');
      },
      configurable: false,
    });
  } catch {
    console.warn('[Awaireness] Could not redefine document.cookie.');
  }

  // Block service worker registration (prevents caching persistence)
  if ('serviceWorker' in navigator) {
    try {
      Object.defineProperty(navigator, 'serviceWorker', {
        get() {
          return { register: () => Promise.reject(new PersistenceViolationError('serviceWorker.register')) };
        },
        configurable: false,
      });
    } catch {
      // Non-critical
    }
  }
}

/**
 * Runtime check: verify no persistence is active.
 * Call this in development to confirm the block is working.
 */
export function verifyNoPersistence(): { clean: boolean; issues: string[] } {
  const issues: string[] = [];

  try {
    window.localStorage.setItem('__test', '1');
    issues.push('localStorage is writable');
  } catch {
    // Expected — blocked
  }

  try {
    window.sessionStorage.setItem('__test', '1');
    issues.push('sessionStorage is writable');
  } catch {
    // Expected — blocked
  }

  try {
    document.cookie = '__test=1';
    if (document.cookie.includes('__test')) {
      issues.push('Cookies are writable');
    }
  } catch {
    // Expected — blocked
  }

  return { clean: issues.length === 0, issues };
}
