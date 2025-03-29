import { ClientTool } from "../../client/tool.interface";
import { DataRowReaderInput, DataRowReaderResponse, ComparisonOperator } from "../types";

class DataRowReader {
  /**
   * Safely access data from window.availableData
   */
  private getData(): any[] {
    if (!window.availableData || !Array.isArray(window.availableData) || window.availableData.length === 0) {
      throw new Error("No data available. Please upload data first.");
    }
    return window.availableData;
  }

  /**
   * Get the schema (field names and types) from the data
   */
  private getSchema(data: any[]): { fields: Array<{ name: string; type: string }> } {
    if (!data || data.length === 0) {
      return { fields: [] };
    }

    const sample = data[0];
    const fields = Object.keys(sample).map(key => {
      const value = sample[key];
      let type = typeof value;

      // Handle special cases for more specific types
      if (type === "number") {
        type = Number.isInteger(value) ? "integer" : "float";
      } else if (type === "string") {
        // Check if string might be a date
        if (!isNaN(Date.parse(value))) {
          type = "date";
        }
      }

      return { name: key, type };
    });

    return { fields };
  }

  /**
   * Compare two values using the specified operator
   */
  private compareValues(value1: any, value2: any, operator: ComparisonOperator): boolean {
    // Convert to strings for comparison if needed
    const val1 = typeof value1 === "string" ? value1.toLowerCase() : value1;
    const val2 = typeof value2 === "string" ? value2.toLowerCase() : value2;

    switch (operator) {
      case "equals":
        return val1 === val2;
      case "not_equals":
        return val1 !== val2;
      case "contains":
        return typeof val1 === "string" && typeof val2 === "string" && val1.includes(val2);
      case "greater_than":
        return val1 > val2;
      case "less_than":
        return val1 < val2;
      default:
        return false;
    }
  }

  /**
   * Get a single row by index
   */
  private getRow(data: any[], index: number): DataRowReaderResponse {
    if (index < 0 || index >= data.length) {
      return {
        success: false,
        error: true,
        message: `Row index out of bounds. Valid range: 0 to ${data.length - 1}`,
      };
    }

    return {
      success: true,
      data: data[index],
      totalRows: data.length,
      returnedRows: 1,
    };
  }

  /**
   * Get multiple rows by index range
   */
  private getRows(
    data: any[],
    startIndex: number = 0,
    endIndex?: number,
    limit: number = 10,
    sortBy?: string,
    sortOrder: "asc" | "desc" = "asc"
  ): DataRowReaderResponse {
    const start = Math.max(0, startIndex);
    const end = endIndex !== undefined ? Math.min(endIndex, data.length) : Math.min(start + limit, data.length);

    if (start >= data.length) {
      return {
        success: false,
        error: true,
        message: `Start index out of bounds. Valid range: 0 to ${data.length - 1}`,
      };
    }

    let result = data.slice(start, end);

    // Apply sorting if specified
    if (sortBy && result.length > 0 && sortBy in result[0]) {
      result.sort((a, b) => {
        const valA = a[sortBy];
        const valB = b[sortBy];

        // Handle different types
        if (typeof valA === "number" && typeof valB === "number") {
          return sortOrder === "asc" ? valA - valB : valB - valA;
        }
        
        // Default string comparison
        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();
        return sortOrder === "asc" ? strA.localeCompare(strB) : strB.localeCompare(strA);
      });
    }

    return {
      success: true,
      data: result,
      totalRows: data.length,
      returnedRows: result.length,
    };
  }

  /**
   * Filter rows based on field value
   */
  private filterRows(
    data: any[],
    field: string,
    value: any,
    operator: ComparisonOperator = "equals",
    limit: number = 10,
    sortBy?: string,
    sortOrder: "asc" | "desc" = "asc"
  ): DataRowReaderResponse {
    if (!field) {
      return {
        success: false,
        error: true,
        message: "Field name is required for filtering",
      };
    }

    // Check if field exists in data
    if (data.length > 0 && !(field in data[0])) {
      return {
        success: false,
        error: true,
        message: `Field '${field}' not found in data`,
      };
    }

    // Filter the data
    const filtered = data.filter(row => this.compareValues(row[field], value, operator));

    // Apply sorting if specified
    if (sortBy && filtered.length > 0 && sortBy in filtered[0]) {
      filtered.sort((a, b) => {
        const valA = a[sortBy];
        const valB = b[sortBy];

        // Handle different types
        if (typeof valA === "number" && typeof valB === "number") {
          return sortOrder === "asc" ? valA - valB : valB - valA;
        }
        
        // Default string comparison
        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();
        return sortOrder === "asc" ? strA.localeCompare(strB) : strB.localeCompare(strA);
      });
    }

    // Apply limit
    const result = filtered.slice(0, limit);

    return {
      success: true,
      data: result,
      totalRows: data.length,
      returnedRows: result.length,
    };
  }

  /**
   * Get statistics for a specific field
   */
  private getStats(data: any[], field?: string): DataRowReaderResponse {
    if (data.length === 0) {
      return {
        success: false,
        error: true,
        message: "No data available for statistics",
      };
    }

    const stats: { [key: string]: any } = {};

    // If field is specified, get stats for just that field
    if (field) {
      // Check if field exists
      if (!(field in data[0])) {
        return {
          success: false,
          error: true,
          message: `Field '${field}' not found in data`,
        };
      }

      stats[field] = this.calculateFieldStats(data, field);
    } else {
      // Get stats for all fields
      const schema = this.getSchema(data);
      schema.fields.forEach(field => {
        stats[field.name] = this.calculateFieldStats(data, field.name);
      });
    }

    return {
      success: true,
      stats,
      totalRows: data.length,
    };
  }

  /**
   * Calculate statistics for a specific field
   */
  private calculateFieldStats(data: any[], field: string): any {
    const values = data.map(row => row[field]).filter(val => val !== undefined && val !== null);
    
    const stats: any = {
      count: values.length
    };

    // Only calculate numeric stats for numeric fields
    if (values.length > 0 && typeof values[0] === "number") {
      stats.min = Math.min(...values);
      stats.max = Math.max(...values);
      stats.avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    } else {
      // For non-numeric fields, get min/max by string comparison
      if (values.length > 0) {
        stats.min = values.reduce((min, val) => String(val) < String(min) ? val : min, values[0]);
        stats.max = values.reduce((max, val) => String(val) > String(max) ? val : max, values[0]);
      }
    }

    // Count unique values
    const uniqueValues = new Set(values.map(v => String(v)));
    stats.uniqueValues = uniqueValues.size;

    // Find most common values (top 5)
    const valueCounts: {[key: string]: number} = {};
    values.forEach(val => {
      const key = String(val);
      valueCounts[key] = (valueCounts[key] || 0) + 1;
    });

    const common = Object.entries(valueCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([value, count]) => ({ value, count }));
    
    stats.common = common;

    return stats;
  }

  /**
   * Process the input and execute the requested action
   */
  public execute(input: DataRowReaderInput): DataRowReaderResponse {
    try {
      const data = this.getData();

      switch (input.action) {
        case "get_schema":
          return {
            success: true,
            schema: this.getSchema(data),
            totalRows: data.length,
          };

        case "get_row":
          if (input.index === undefined) {
            return {
              success: false,
              error: true,
              message: "Index is required for get_row action",
            };
          }
          return this.getRow(data, input.index);

        case "get_rows":
          return this.getRows(
            data,
            input.startIndex,
            input.endIndex,
            input.limit,
            input.sortBy,
            input.sortOrder
          );

        case "filter_rows":
          if (!input.field) {
            return {
              success: false,
              error: true,
              message: "Field is required for filter_rows action",
            };
          }
          return this.filterRows(
            data,
            input.field,
            input.value,
            input.operator,
            input.limit,
            input.sortBy,
            input.sortOrder
          );

        case "get_stats":
          return this.getStats(data, input.field);

        default:
          return {
            success: false,
            error: true,
            message: `Unknown action: ${input.action}`,
          };
      }
    } catch (error: any) {
      console.error("Data row reader error:", error);
      return {
        success: false,
        error: true,
        message: error.message || "Failed to process data",
      };
    }
  }
}

export const dataRowReaderTool: ClientTool = {
  name: "data_row_reader",
  execute: async (input: DataRowReaderInput): Promise<DataRowReaderResponse> => {
    const reader = new DataRowReader();
    return reader.execute(input);
  },
};