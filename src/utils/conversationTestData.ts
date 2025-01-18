export const testData = [
  {
    role: "user",
    content: [
      {
        text: "hi",
      },
    ],
  },
  {
    role: "assistant",
    content: [
      {
        text: "Hello! I'm here to help you. I have access to several tools that can help with:\n\n1. Fetching information from specific websites (especially Cornell-related content)\n2. Mathematical calculations\n3. Generating HTML visualizations\n4. Searching the Cornell directory for users\n\nWhat would you like assistance with?",
      },
    ],
  },
  {
    role: "user",
    content: [
      {
        text: "what the square root of 2555?",
      },
    ],
  },
  {
    role: "assistant",
    content: [
      {
        text: "I'll help you calculate the square root of 2555 using the math function.",
      },
      {
        toolUse: {
          input: {
            expression: "sqrt(2555)",
          },
          name: "math",
          toolUseId: "tooluse_QlBe4Ig8QpKCdO2YNpSjiw",
        },
      },
    ],
  },
  {
    role: "user",
    content: [
      {
        toolResult: {
          toolUseId: "tooluse_QlBe4Ig8QpKCdO2YNpSjiw",
          content: [
            {
              text: '{"result":50.547007824400445,"expression":"sqrt(2555)"}',
            },
          ],
          status: "success",
        },
      },
    ],
  },
  {
    role: "assistant",
    content: [
      {
        text: "The square root of 2555 is approximately 50.547.",
      },
    ],
  },
  {
    role: "user",
    content: [
      {
        text: "show some examples of math problems",
      },
    ],
  },
  {
    role: "assistant",
    content: [
      {
        text: "I'll show you various examples of mathematical calculations using the math function, demonstrating different types of operations:\n\n1. Basic Arithmetic:",
      },
      {
        toolUse: {
          input: {
            expression: "2 + 3 * 4",
          },
          name: "math",
          toolUseId: "tooluse_EHsnHE25Qoyt_NnZdvaVWQ",
        },
      },
    ],
  },
  {
    role: "user",
    content: [
      {
        toolResult: {
          toolUseId: "tooluse_EHsnHE25Qoyt_NnZdvaVWQ",
          content: [
            {
              text: '{"result":14,"expression":"2 + 3 * 4"}',
            },
          ],
          status: "success",
        },
      },
    ],
  },
  {
    role: "assistant",
    content: [
      {
        text: "2. Square Root:",
      },
      {
        toolUse: {
          input: {
            expression: "sqrt(16)",
          },
          name: "math",
          toolUseId: "tooluse_YsHTJvRJQ7WzKssFuEICBg",
        },
      },
    ],
  },
  {
    role: "user",
    content: [
      {
        toolResult: {
          toolUseId: "tooluse_YsHTJvRJQ7WzKssFuEICBg",
          content: [
            {
              text: '{"result":4,"expression":"sqrt(16)"}',
            },
          ],
          status: "success",
        },
      },
    ],
  },
  {
    role: "assistant",
    content: [
      {
        text: "3. Percentage Calculation:",
      },
      {
        toolUse: {
          input: {
            expression: "(15/100) * 80",
          },
          name: "math",
          toolUseId: "tooluse_X7-Nx9gdTcWvwtgEA9UnIw",
        },
      },
    ],
  },
  {
    role: "user",
    content: [
      {
        toolResult: {
          toolUseId: "tooluse_X7-Nx9gdTcWvwtgEA9UnIw",
          content: [
            {
              text: '{"result":12,"expression":"(15/100) * 80"}',
            },
          ],
          status: "success",
        },
      },
    ],
  },
  {
    role: "assistant",
    content: [
      {
        text: "4. Mean (Average) of Numbers:",
      },
      {
        toolUse: {
          input: {
            expression: "mean([1,2,3,4])",
          },
          name: "math",
          toolUseId: "tooluse_6w3sJ4QlTe6BqkXUew9GaA",
        },
      },
    ],
  },
  {
    role: "user",
    content: [
      {
        toolResult: {
          toolUseId: "tooluse_6w3sJ4QlTe6BqkXUew9GaA",
          content: [
            {
              text: '{"result":2.5,"expression":"mean([1,2,3,4])"}',
            },
          ],
          status: "success",
        },
      },
    ],
  },
  {
    role: "assistant",
    content: [
      {
        text: "5. Trigonometric Functions (sin in degrees):",
      },
      {
        toolUse: {
          input: {
            expression: "sin(45 * pi / 180)",
          },
          name: "math",
          toolUseId: "tooluse_4mG4Lp3RS96wowbSTwuCcQ",
        },
      },
    ],
  },
  {
    role: "user",
    content: [
      {
        toolResult: {
          toolUseId: "tooluse_4mG4Lp3RS96wowbSTwuCcQ",
          content: [
            {
              text: '{"result":0.7071067811865475,"expression":"sin(45 * pi / 180)"}',
            },
          ],
          status: "success",
        },
      },
    ],
  },
  {
    role: "assistant",
    content: [
      {
        text: "6. Standard Deviation:",
      },
      {
        toolUse: {
          input: {
            expression: "std([2,4,6])",
          },
          name: "math",
          toolUseId: "tooluse_lGRv8NzBSOCMY4c8BOhCPQ",
        },
      },
    ],
  },
  {
    role: "user",
    content: [
      {
        toolResult: {
          toolUseId: "tooluse_lGRv8NzBSOCMY4c8BOhCPQ",
          content: [
            {
              text: '{"result":2,"expression":"std([2,4,6])"}',
            },
          ],
          status: "success",
        },
      },
    ],
  },
  {
    role: "assistant",
    content: [
      {
        text: "7. Matrix Operations (2x2 Determinant):",
      },
      {
        toolUse: {
          input: {
            expression: "det([-1, 2; 3, 1])",
          },
          name: "math",
          toolUseId: "tooluse_Bak-6BLMQ9Cv33nx8RZQZw",
        },
      },
    ],
  },
  {
    role: "user",
    content: [
      {
        toolResult: {
          toolUseId: "tooluse_Bak-6BLMQ9Cv33nx8RZQZw",
          content: [
            {
              text: '{"result":-7,"expression":"det([-1, 2; 3, 1])"}',
            },
          ],
          status: "success",
        },
      },
    ],
  },
  {
    role: "assistant",
    content: [
      {
        text: "These examples show that you can:\n- Perform basic arithmetic\n- Calculate square roots\n- Work with percentages\n- Find statistical measures like mean and standard deviation\n- Do trigonometric calculations\n- Perform matrix operations\n\nYou can also:\n- Use constants like pi\n- Work with arrays of numbers\n- Combine multiple operations\n- Use parentheses to control order of operations\n\nFeel free to ask about any specific type of calculation you'd like to try!",
      },
    ],
  },
  {
    role: "user",
    content: [
      {
        text: "display the examples in a user fiendly presentation about those calculations for public education. Make it interesting!",
      },
    ],
  },
  {
    role: "assistant",
    content: [
      {
        text: "I'll create an engaging HTML presentation about math calculations with interactive examples and nice formatting!",
      },
      {
        toolUse: {
          input: {
            html: '<!DOCTYPE html>\n<html>\n<head>\n    <style>\n        .container {\n            font-family: \'Arial\', sans-serif;\n            max-width: 800px;\n            margin: 0 auto;\n            padding: 20px;\n            background-color: #f5f5f5;\n        }\n        .math-card {\n            background-color: white;\n            border-radius: 10px;\n            padding: 20px;\n            margin: 15px 0;\n            box-shadow: 0 4px 6px rgba(0,0,0,0.1);\n            transition: transform 0.2s;\n        }\n        .math-card:hover {\n            transform: translateY(-5px);\n        }\n        .title {\n            color: #2c3e50;\n            text-align: center;\n            font-size: 2.5em;\n            margin-bottom: 30px;\n        }\n        .subtitle {\n            color: #e74c3c;\n            font-size: 1.2em;\n            font-weight: bold;\n        }\n        .result {\n            color: #27ae60;\n            font-weight: bold;\n            font-size: 1.1em;\n        }\n        .explanation {\n            color: #7f8c8d;\n            font-style: italic;\n            margin-top: 10px;\n        }\n        .fun-fact {\n            background-color: #3498db;\n            color: white;\n            padding: 10px;\n            border-radius: 5px;\n            margin-top: 10px;\n            font-size: 0.9em;\n        }\n    </style>\n</head>\n<body>\n    <div class="container">\n        <h1 class="title">🔢 The Magic of Mathematics! ✨</h1>\n        \n        <div class="math-card">\n            <div class="subtitle">1. Basic Arithmetic Magic 🎯</div>\n            <p>Expression: 2 + 3 * 4</p>\n            <p class="result">Result: 14</p>\n            <p class="explanation">Remember PEMDAS! Multiplication happens before addition.</p>\n            <div class="fun-fact">Fun fact: The order of operations (PEMDAS) was standardized in the early 20th century!</div>\n        </div>\n\n        <div class="math-card">\n            <div class="subtitle">2. Square Root Secrets 📐</div>\n            <p>Expression: √16</p>\n            <p class="result">Result: 4</p>\n            <p class="explanation">The square root is like finding what number, when multiplied by itself, gives you the original number.</p>\n            <div class="fun-fact">Did you know? The square root symbol (√) was introduced in 1525 by German mathematician Christoff Rudolff!</div>\n        </div>\n\n        <div class="math-card">\n            <div class="subtitle">3. Percentage Power 💪</div>\n            <p>Expression: 15% of 80</p>\n            <p class="result">Result: 12</p>\n            <p class="explanation">To calculate a percentage, we multiply the number by the percentage divided by 100.</p>\n            <div class="fun-fact">The word "percent" comes from Latin "per centum" meaning "by the hundred"!</div>\n        </div>\n\n        <div class="math-card">\n            <div class="subtitle">4. Mean Magic 📊</div>\n            <p>Expression: mean([1,2,3,4])</p>\n            <p class="result">Result: 2.5</p>\n            <p class="explanation">The mean is the average of all numbers - add them up and divide by how many there are.</p>\n            <div class="fun-fact">Averages are used everywhere - from grades to weather forecasts!</div>\n        </div>\n\n        <div class="math-card">\n            <div class="subtitle">5. Trigonometry Tales 📐</div>\n            <p>Expression: sin(45°)</p>\n            <p class="result">Result: 0.707</p>\n            <p class="explanation">Sine is the ratio of the opposite side to the hypotenuse in a right triangle.</p>\n            <div class="fun-fact">Ancient Egyptians used trigonometry to build the pyramids!</div>\n        </div>\n\n        <div class="math-card">\n            <div class="subtitle">6. Standard Deviation Detective 🔍</div>\n            <p>Expression: std([2,4,6])</p>\n            <p class="result">Result: 2</p>\n            <p class="explanation">Standard deviation shows how spread out numbers are from their average.</p>\n            <div class="fun-fact">Standard deviation is crucial in quality control and scientific research!</div>\n        </div>\n\n        <div class="math-card">\n            <div class="subtitle">7. Matrix Mysteries 🎲</div>\n            <p>Expression: det([-1, 2; 3, 1])</p>\n            <p class="result">Result: -7</p>\n            <p class="explanation">Matrices help solve complex systems of equations and are used in computer graphics!</p>\n            <div class="fun-fact">Matrices are essential in computer animation and 3D video games!</div>\n        </div>\n    </div>\n</body>\n</html>',
            context: "Educational presentation about mathematical calculations",
          },
          name: "html",
          toolUseId: "tooluse_yjWDdMx_SwWj134JWZ1oSw",
        },
      },
    ],
  },
  {
    role: "user",
    content: [
      {
        toolResult: {
          toolUseId: "tooluse_yjWDdMx_SwWj134JWZ1oSw",
          content: [
            {
              text: '{"message":"HTML rendered successfully"}',
            },
          ],
          status: "success",
        },
      },
    ],
  },
  {
    role: "assistant",
    content: [
      {
        text: "I've created an engaging and visually appealing presentation that:\n1. Uses cards with hover effects to make each topic stand out\n2. Includes fun facts to make learning more interesting\n3. Uses emojis and colors to make it visually engaging\n4. Provides clear explanations for each mathematical concept\n5. Has a responsive design that works well on different screen sizes\n6. Includes real-world applications and historical facts\n\nEach card shows:\n- The mathematical expression\n- Its result\n- An explanation of the concept\n- An interesting fun fact related to the topic\n\nThe design is meant to be educational while keeping the viewer's interest through interactive elements and an appealing visual style. The color scheme is chosen to be easy on the eyes while maintaining good contrast for readability.\n\nWould you like me to modify anything about the presentation or add more examples?",
      },
    ],
  },
];
