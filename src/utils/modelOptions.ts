// Parse comma-separated model options from environment variables
export function getModelOptions(): {
  id: string;
  name: string;
  provider: string;
  apiType: string;
}[] {
  const awsOptions = (import.meta.env.VITE_AWS_LLM_OPTIONS || "")
    .split(",")
    .filter(Boolean);
  const openaiOptions = (import.meta.env.VITE_OPENAI_LLM_OPTIONS || "")
    .split(",")
    .filter(Boolean);

  // Check if we have any options at all
  if (awsOptions.length === 0 && openaiOptions.length === 0) {
    const errorMessage =
      "Missing model options configuration. Please set VITE_AWS_LLM_OPTIONS and VITE_OPENAI_LLM_OPTIONS in your .env file.";
    console.error(errorMessage);

    // Show alert to user
    if (typeof window !== "undefined") {
      setTimeout(() => {
        alert(errorMessage);
      }, 1000); // Delay to ensure UI is ready
    }

    // Provide fallback options
    return [
      {
        id: "default",
        name: "System Default (configuration missing)",
        provider: "System",
        apiType: "System Default",
      },
      {
        id: "openai.gpt-4o",
        name: "GPT-4o [openai.gpt-4o]",
        provider: "OpenAI",
        apiType: "OpenAI Compatible",
      },
      {
        id: "anthropic.claude-3.5-sonnet.v2",
        name: "Claude 3.5 Sonnet [anthropic.claude-3.5-sonnet.v2]",
        provider: "Anthropic",
        apiType: "AWS Bedrock",
      },
    ];
  }

  const formatModelName = (id: string): string => {
    // For developer audience, use a more technical but clear format
    const parts = id.split(".");
    const provider = parts[0];
    const modelName = parts.slice(1).join(".");

    // Basic formatting for readability
    let readableName = modelName
      .replace(/-/g, " ")
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    // Always include the full ID for technical clarity
    return `${readableName} [${id}]`;
  };

  const formatProviderName = (id: string): string => {
    const provider = id.split(".")[0];

    // Format provider names
    switch (provider) {
      case "openai":
        return "OpenAI";
      case "anthropic":
        return "Anthropic";
      case "amazon":
        return "Amazon";
      case "cohere":
        return "Cohere";
      case "meta":
        return "Meta";
      default:
        return provider.charAt(0).toUpperCase() + provider.slice(1);
    }
  };

  // Combine and format all options with API type
  const allOptions = [
    ...awsOptions.map((id) => ({
      id,
      name: formatModelName(id),
      provider: formatProviderName(id),
      apiType: "AWS Bedrock",
    })),
    ...openaiOptions.map((id) => ({
      id,
      name: formatModelName(id),
      provider: formatProviderName(id),
      apiType: "OpenAI Compatible",
    })),
  ];

  // Get the default model from environment variables
  const defaultModelId =
    import.meta.env.OPENAI_API_MODEL ||
    import.meta.env.VITE_BEDROCK_MODEL_ID ||
    "anthropic.claude-3.5-sonnet.v2";

  // Extract just the model name for display
  const defaultModelName = defaultModelId.split("/").pop() || defaultModelId;

  // Add default option with the actual model name
  allOptions.unshift({
    id: "default",
    name: `System Default (${defaultModelName})`,
    provider: "System",
    apiType: "System Default",
  });

  return allOptions;
}

// Get grouped model options by API type instead of provider
export function getGroupedModelOptions() {
  const options = getModelOptions();
  const grouped: Record<string, typeof options> = {};

  // Group by API type instead of provider
  options.forEach((option) => {
    if (!grouped[option.apiType]) {
      grouped[option.apiType] = [];
    }
    grouped[option.apiType].push(option);
  });

  return grouped;
}
