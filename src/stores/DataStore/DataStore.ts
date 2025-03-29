// src/stores/DataStore/DataStore.ts
import { signal } from "@preact/signals-core";
import { DataObject } from "./DataStore.types";
import Papa from 'papaparse';

export function createDataStore() {
  // Store both current view data and managed data objects
  const dataMap = signal<Map<string, DataObject>>(new Map());
  const currentData = signal<DataObject | null>(null);

  /**
   * Enhanced CSV Parser using Papa Parse
   * Handles quoted fields, escaped characters, and other CSV complexities
   */
  const parseCSV = (content: string): { headers: string[]; data: any[] } => {
    // Parse CSV using Papa Parse
    const parseResult = Papa.parse(content, {
      header: true,          // First row is headers
      skipEmptyLines: true,  // Skip empty lines
      dynamicTyping: true,   // Convert to appropriate types
      transformHeader: (header) => {
        // Remove quotes from header names if present
        return header.replace(/^["']|["']$/g, '');
      }
    });

    // Clean up the data by:
    // 1. Removing escaped characters from JSON stringification
    // 2. Ensuring consistent field names without quotes
    const cleanData = parseResult.data.map(row => {
      const cleanRow: Record<string, any> = {};

      // Process each field
      Object.entries(row).forEach(([key, value]) => {
        // Clean up the key by removing any quotes
        const cleanKey = key.replace(/^["']|["']$/g, '');

        // Handle string values with potential escape characters
        if (typeof value === 'string') {
          // Remove escaped quotes
          cleanRow[cleanKey] = value.replace(/\\"/g, '"');
        } else {
          cleanRow[cleanKey] = value;
        }
      });

      return cleanRow;
    });

    return {
      headers: parseResult.meta.fields?.map(field => field.replace(/^["']|["']$/g, '')) || [],
      data: cleanData
    };
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

      // Make data available for iframe/tools
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

    // Create data context block
    getDataContextText(): string | null {
      const data = currentData.value;
      if (!data) return "";

      const sampleData = Array.isArray(data.data) ? data.data[0] : data.data;

      // Categorize fields by data type
      const fields = Object.entries(sampleData).reduce(
        (acc, [key, value]) => {
          if (typeof value === 'number') {
            acc[Number.isInteger(value) ? "integer" : "float"].push(key);
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

      // Format the data nicely for display
      return `### Data Structure Overview
      Total Records: ${Array.isArray(data.data) ? data.data.length : "N/A"}

      Field Types:
      - Floating Point: ${fields.float.join(", ") || "None"}
      - Integer: ${fields.integer.join(", ") || "None"}
      - Text/String: ${fields.string.join(", ") || "None"}

      ### Sample Data (First 5 Records)
      \`\`\`json
      ${JSON.stringify(sampleRecords, null, 2)}
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
