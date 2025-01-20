// src/stores/handlers/StorageHandler.ts
export class StorageHandler<T> {
  constructor(private key: string) {}

  save(data: T): void {
    try {
      localStorage.setItem(this.key, JSON.stringify(data));
    } catch (error) {
      console.error(`Error saving to ${this.key}:`, error);
    }
  }

  load(): T | null {
    try {
      const stored = localStorage.getItem(this.key);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error(`Error loading from ${this.key}:`, error);
      return null;
    }
  }

  clear(): void {
    localStorage.removeItem(this.key);
  }
}
