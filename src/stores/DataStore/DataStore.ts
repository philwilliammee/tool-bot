// src/stores/DataStore/DataStore.ts
import { signal } from "@preact/signals-core";

export interface DataObject {
  name: string;
  type: "csv" | "json";
  data: any;
  metadata: {
    createdAt: number;
    columns?: string[];
    rowCount?: number;
  };
}

export function createDataStore() {
  const currentData = signal<DataObject | null>(null);

  const parseCSV = (content: string): { headers: string[]; data: any[] } => {
    const lines = content.split("\n");
    const headers = lines[0].split(",").map((h) => h.trim());
    const data = lines.slice(1).map((line) => {
      const values = line.split(",").map((v) => v.trim());
      return headers.reduce((obj, header, i) => {
        obj[header] = values[i];
        return obj;
      }, {} as any);
    });
    return { headers, data };
  };

  return {
    async addFromFile(file: File): Promise<void> {
      const content = await file.text();
      const isCSV = file.name.toLowerCase().endsWith(".csv");

      let data;
      let metadata: DataObject["metadata"] = {
        createdAt: Date.now(),
      };

      if (isCSV) {
        const parsed = parseCSV(content);
        data = parsed.data;
        metadata.columns = parsed.headers;
        metadata.rowCount = parsed.data.length;
      } else {
        data = JSON.parse(content);
      }

      currentData.value = {
        name: file.name,
        type: isCSV ? "csv" : "json",
        data,
        metadata,
      };
    },

    getData(): DataObject | null {
      return currentData.value;
    },

    getIframeData(): any {
      return currentData.value?.data || null;
    },

    clear(): void {
      currentData.value = null;
    },
  };
}

export const dataStore = createDataStore();
