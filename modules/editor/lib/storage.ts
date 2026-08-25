export const safeStorage = {
  get<T extends string>(key: string, fallback: T): T {
    if (typeof window === "undefined") return fallback;
    try {
      const val = localStorage.getItem(key);
      return (val as T) ?? fallback;
    } catch {
      return fallback;
    }
  },

  getNumber(key: string, fallback: number, min?: number, max?: number): number {
    if (typeof window === "undefined") return fallback;
    try {
      const val = localStorage.getItem(key);
      if (val !== null) {
        const parsed = parseInt(val, 10);
        if (!isNaN(parsed)) {
          if (min !== undefined && parsed < min) return fallback;
          if (max !== undefined && parsed > max) return fallback;
          return parsed;
        }
      }
    } catch {}
    return fallback;
  },

  set(key: string, value: string | number): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(key, String(value));
    } catch {}
  },

  remove(key: string): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(key);
    } catch {}
  },
};
