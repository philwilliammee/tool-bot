// src/stores/DataStore/DataStore.ts
import { signal } from "@preact/signals-core";
import { DataObject } from "./DataStore.types";

export function createDataStore() {
  // Store both current view data and managed data objects
  const dataMap = signal<Map<string, DataObject>>(new Map());
  const currentData = signal<DataObject | null>(null);

  const parseCSV = (content: string): { headers: string[]; data: any[] } => {
    const lines = content
      .split(/\r?\n/) // Be safe with CRLF as well
      .filter((line) => line.trim() !== ""); // Drop empty lines

    const headers = lines[0].split(",").map((h) => h.trim());
    const data = lines.slice(1).map((line) => {
      const values = line.split(",").map((v) => v.trim());
      return headers.reduce((obj, header, i) => {
        obj[header] = values[i];
        return obj;
      }, {} as Record<string, any>);
    });

    return { headers, data };
  };

  return {
    async addFromFile(file: File): Promise<string> {
      const content = await file.text();
      const isCSV = file.name.toLowerCase().endsWith(".csv");

      let data;
      let metadata: DataObject["metadata"] = {
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      if (isCSV) {
        const parsed = parseCSV(content);
        data = parsed.data;
        metadata.columns = parsed.headers;
        metadata.rowCount = parsed.data.length;
      } else {
        data = JSON.parse(content);
      }

      const id = crypto.randomUUID();
      const dataObject: DataObject = {
        id,
        name: file.name,
        type: isCSV ? "csv" : "json",
        data,
        metadata,
      };

      // Store in both maps
      dataMap.value.set(id, dataObject);
      currentData.value = dataObject;

      // @todo store this Make data available for iframe/tools
      window.availableData = dataObject.data;

      return id;
    },

    getData(): DataObject | null {
      return currentData.value;
    },

    getIframeData(): any {
      return currentData.value?.data || null;
    },

    // Tool integration methods
    storeData(key: string, data: any, metadata?: any): string {
      const id = key || crypto.randomUUID();
      const now = Date.now();

      const dataObject: DataObject = {
        id,
        name: metadata?.name || `data_${id}`,
        type: "json",
        data,
        metadata: {
          createdAt: now,
          updatedAt: now,
          description: metadata?.description,
          ...metadata,
        },
      };

      dataMap.value.set(id, dataObject);
      return id;
    },

    // Add new private method to create data context block
    getDataContextText(): string | null {
      const data = currentData.value;
      if (!data) return "";
      const sampleData = Array.isArray(data.data) ? data.data[0] : data.data;
      const fields = Object.entries(sampleData).reduce(
        (acc, [key, value]) => {
          const numValue = Number(value);
          if (!isNaN(numValue)) {
            acc[Number.isInteger(numValue) ? "integer" : "float"].push(key);
          } else {
            acc["string"].push(key);
          }
          return acc;
        },
        { float: [], integer: [], string: [] } as Record<string, string[]>
      );

      const sampleRecords = Array.isArray(data.data)
        ? data.data.slice(0, 5)
        : [data.data];

      return `### Data Structure Overview
      Total Records: ${Array.isArray(data.data) ? data.data.length : "N/A"}

      Field Types:
      - Floating Point: ${fields.float.join(", ") || "None"}
      - Integer: ${fields.integer.join(", ") || "None"}
      - Text/String: ${fields.string.join(", ") || "None"}

      ### Sample Data (First 5 Records)
      \`\`\`json
      ${JSON.stringify(sampleRecords)}
      \`\`\`

      ### How to access the available data
      1. Data is available in two contexts:
         - code_executor tool: window.availableData
         - html tool: The iframe automatically has this data loaded as window.availableData`;
    },

    retrieveData(key: string): DataObject | null {
      return dataMap.value.get(key) || null;
    },

    updateData(key: string, data: any, metadata?: any): boolean {
      const existing = dataMap.value.get(key);
      if (!existing) return false;

      const updated: DataObject = {
        ...existing,
        data,
        metadata: {
          ...existing.metadata,
          ...metadata,
          updatedAt: Date.now(),
        },
      };

      dataMap.value.set(key, updated);

      // Update current data if this was the active dataset
      if (currentData.value?.id === key) {
        currentData.value = updated;
        window.availableData = updated.data;
      }

      return true;
    },

    deleteData(key: string): boolean {
      const wasDeleted = dataMap.value.delete(key);

      // Clear current data if this was the active dataset
      if (currentData.value?.id === key) {
        currentData.value = null;
        window.availableData = undefined;
      }

      return wasDeleted;
    },

    listData(): { id: string; name: string; type: string }[] {
      return Array.from(dataMap.value.values()).map(({ id, name, type }) => ({
        id,
        name,
        type,
      }));
    },
  };
}

export const dataStore = createDataStore();
