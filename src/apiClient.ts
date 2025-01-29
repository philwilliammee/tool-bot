import { Message, ConverseResponse } from "@aws-sdk/client-bedrock-runtime";

export async function postMessage(
  modelId: string,
  messages: Message[],
  systemPrompt: string
): Promise<ConverseResponse> {
  console.log(
    `[API CLIENT] POST request with messages count: ${messages.length}`
  );
  const response = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ modelId, messages, systemPrompt }),
  });

  if (!response.ok) {
    throw new Error(`Bedrock server error: ${await response.text()}`);
  }

  return await response.json();
}
