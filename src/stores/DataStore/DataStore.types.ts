// src/stores/DataStore/DataStore.types.ts
export interface DataObject {
  id: string;
  name: string;
  type: "csv" | "json";
  data: any;
  metadata: {
    createdAt: number;
    updatedAt: number;
    columns?: string[];
    rowCount?: number;
    description?: string;
  };
}
