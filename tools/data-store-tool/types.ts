// tools/data-store-tool/types.ts
export interface DataStoreInput {
  action: "store" | "retrieve" | "update" | "delete" | "list";
  key?: string;
  data?: any;
  metadata?: {
    name?: string;
    type?: "json";
    description?: string;
    tags?: string[];
  };
}

export interface DataStoreResponse {
  success: boolean;
  data?: any;
  message?: string;
  keys?: string[];
  error?: boolean;
}
