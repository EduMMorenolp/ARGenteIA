---
name: add-agent-tool
description: Use this skill when the user wants to add a new tool or capability to the ARGenteIA agent. Guides through creating the tool definition, registering it, and updating the agent's tool-calling configuration.
---

# Skill: Add a New Agent Tool

## Overview
ARGenteIA uses an OpenAI-compatible function-calling system. Each tool is defined with a Zod schema that gets converted to JSON Schema for the LLM, plus an execution function.

## Steps to Add a New Tool

### 1. Create the Tool File
Create a new file in `src/tools/<toolName>.ts`:

```typescript
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

// Define the input schema
export const MyToolSchema = z.object({
  param1: z.string().describe('Description of param1'),
  param2: z.number().optional().describe('Optional number param'),
});

export type MyToolInput = z.infer<typeof MyToolSchema>;

// The tool definition (for LLM discovery)
export const myToolDefinition = {
  type: 'function' as const,
  function: {
    name: 'my_tool_name',
    description: 'Clear description of what this tool does and when to use it.',
    parameters: zodToJsonSchema(MyToolSchema),
  },
};

// The tool execution function
export async function executMyTool(input: MyToolInput): Promise<string> {
  const parsed = MyToolSchema.parse(input);
  
  try {
    // Your tool logic here
    return `Result: ...`;
  } catch (error) {
    return `Error executing tool: ${error}`;
  }
}
```

### 2. Register the Tool in the Agent
In `src/agent/`, find the array where tools are registered and add:
```typescript
import { myToolDefinition, executeMyTool, MyToolInput } from '../tools/myTool.js';

// In the tools array:
myToolDefinition,

// In the tool execution switch/map:
case 'my_tool_name':
  return await executeMyTool(args as MyToolInput);
```

### 3. Update Prompts (Optional)
If the tool is complex, add a usage example to the relevant system prompt in `src/promptsSystem/`.

## Checklist
- [ ] Tool file created in `src/tools/`
- [ ] Zod schema defined with `.describe()` on all fields
- [ ] Tool registered in agent
- [ ] Tool tested manually via chat
- [ ] If stateful: DB schema updated
