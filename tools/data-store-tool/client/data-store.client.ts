// tools/data-store-tool/client/data-store.client.ts
import { ClientTool } from "../../client/tool.interface";
import { dataStore } from "../../../src/stores/DataStore/DataStore";
import { DataStoreInput, DataStoreResponse } from "../types";

export const dataStoreTool: ClientTool = {
  name: "data_store",
  execute: async (input: DataStoreInput): Promise<DataStoreResponse> => {
    try {
      const { action, key, data, metadata } = input;

      switch (action) {
        case "store":
          if (!data) {
            throw new Error("Data is required for store action");
          }
          const id = dataStore.storeData(key!, data, metadata);
          return {
            success: true,
            message: `Data stored with key: ${id}`,
            data: { key: id },
          };

        case "retrieve":
          if (!key) {
            throw new Error("Key is required for retrieve action");
          }
          const retrieved = dataStore.retrieveData(key);
          return {
            success: !!retrieved,
            data: retrieved?.data,
            message: retrieved ? undefined : "Data not found",
          };

        case "update":
          if (!key || !data) {
            throw new Error("Key and data are required for update action");
          }
          const updated = dataStore.updateData(key, data, metadata);
          return {
            success: updated,
            message: updated ? "Data updated successfully" : "Data not found",
          };

        case "delete":
          if (!key) {
            throw new Error("Key is required for delete action");
          }
          const deleted = dataStore.deleteData(key);
          return {
            success: deleted,
            message: deleted ? "Data deleted successfully" : "Data not found",
          };

        case "list":
          const items = dataStore.listData();
          return {
            success: true,
            data: items,
          };

        default:
          throw new Error(`Unknown action: ${action}`);
      }
    } catch (error: any) {
      console.error("Data store tool error:", error);
      return {
        success: false,
        error: true,
        message: error.message || "Operation failed",
      };
    }
  },
};
