import { Message, ConverseResponse } from "@aws-sdk/client-bedrock-runtime";

export async function postBedrock(
  modelId: string,
  messages: Message[],
  systemPrompt: string
): Promise<ConverseResponse> {
  console.log(
    `[API CLIENT] POST request with modelId: ${modelId} and messages count: ${messages.length}`
  );
  const response = await fetch("/api/bedrock", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ modelId, messages, systemPrompt }),
  });

  if (!response.ok) {
    throw new Error(`Bedrock server error: ${await response.text()}`);
  }

  return await response.json();
}
