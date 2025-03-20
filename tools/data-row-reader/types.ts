export type DataRowReaderAction = 
  | "get_row" 
  | "get_rows" 
  | "filter_rows" 
  | "get_stats" 
  | "get_schema";

export type ComparisonOperator = 
  | "equals" 
  | "contains" 
  | "greater_than" 
  | "less_than" 
  | "not_equals";

export type SortOrder = "asc" | "desc";

export interface DataRowReaderInput {
  action: DataRowReaderAction;
  index?: number;
  startIndex?: number;
  endIndex?: number;
  limit?: number;
  field?: string;
  value?: string;
  operator?: ComparisonOperator;
  sortBy?: string;
  sortOrder?: SortOrder;
}

export interface DataRowReaderResponse {
  success: boolean;
  message?: string;
  error?: boolean;
  data?: any;
  totalRows?: number;
  returnedRows?: number;
  schema?: {
    fields: Array<{
      name: string;
      type: string;
      description?: string;
    }>;
  };
  stats?: {
    [key: string]: {
      min?: number | string;
      max?: number | string;
      avg?: number;
      count?: number;
      uniqueValues?: number;
      common?: Array<{value: any, count: number}>;
    };
  };
}