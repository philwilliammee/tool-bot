// tools/html-tool/config.ts
import { ToolConfiguration } from "@aws-sdk/client-bedrock-runtime";

export const htmlToolConfig: ToolConfiguration = {
  tools: [
    {
      toolSpec: {
        name: "html",
        description: `
Renders HTML content with data visualization capabilities.

Available data can be accessed via window.availableData.

When creating visualizations:
1. Parse CSV string values to appropriate types
2. Include error handling
3. Use Chart.js or D3.js for visualizations
4. Add proper labels and titles
5. Consider data types when processing values

Example:
const data = window.availableData;
const processedData = data.map(item => ({
  ...item,
  value: parseFloat(item.value) || 0
}));

new Chart(ctx, {
  type: 'bar',
  data: {
    labels: processedData.map(d => d.label),
    datasets: [{
      data: processedData.map(d => d.value)
    }]
  }
});
`,
        inputSchema: {
          json: {
            type: "object",
            properties: {
              html: {
                type: "string",
                description: "Raw HTML markup to render",
              },
              context: {
                type: "string",
                description:
                  "Additional context about the visualization or HTML purpose",
              },
            },
            required: ["html"],
          },
        },
      },
    },
  ],
};
