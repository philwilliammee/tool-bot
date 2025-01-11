// src/apiClient.ts
export async function postBedrock(
  modelId: string,
  messages: any[], // or use the AWS 'Message' type
  systemPrompt: string
): Promise<any> {
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
