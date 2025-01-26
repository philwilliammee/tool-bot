// src/stores/handlers/LLMHandler.ts
import { Message } from "@aws-sdk/client-bedrock-runtime";
import { MessageExtended } from "../../../app.types";
import { postMessage } from "../../../apiClient";
import { dataStore } from "../../DataStore/DataStore";

export class LLMHandler {
  private baseSystemPrompt =
    "You are a helpful assistant with tools. You can analyze data using the code_executor tool.";
  private modelId = import.meta.env.VITE_BEDROCK_MODEL_ID;

  private getDataStructureDescription(): string {
    const data = dataStore.getData();
    if (!data) return "";

    const sampleData = Array.isArray(data.data) ? data.data[0] : data.data;
    if (!sampleData) return "";

    // Group fields by their value type
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

    // Get first 5 records for sample
    const sampleRecords = Array.isArray(data.data)
      ? data.data.slice(0, 5)
      : [data.data];

    return `\nAvailable Data Structure:
Parse as float: ${fields.float.join(", ")}
Parse as integer: ${fields.integer.join(", ")}
String fields: ${fields.string.join(", ")}
Total Records: ${Array.isArray(data.data) ? data.data.length : "N/A"}

Sample Data (first 5 records):
${JSON.stringify(sampleRecords, null, 2)}

Access: This data is available globally as window.availableData
Retrieval: Use code_executor tool to retrieve the full data set at window.availableData
When analyzing data, always convert numeric fields using Number() or parseFloat() for decimals and parseInt() for integers, and verify data types before performing calculations to avoid NaN results.`;
  }

  // @todo probably remove this from system and add as user prompt.
  private getSystemPrompt(): string {
    const dataDescription = this.getDataStructureDescription();
    return this.baseSystemPrompt + dataDescription;
  }

  async callLLM(messages: MessageExtended[]): Promise<Message> {
    try {
      const response = await postMessage(
        this.modelId,
        messages,
        this.getSystemPrompt()
      );

      if (!response.output?.message?.content?.length) {
        throw new Error("No content in LLM response");
      }

      return {
        role: "assistant",
        content: response.output.message.content,
      };
    } catch (error) {
      console.error("LLM call failed:", error);
      throw error;
    }
  }
}
