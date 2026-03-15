---
name: add-agent-tool
description: Use this skill when the user wants to add a new tool or capability to the ARGenteIA agent. Guides through creating the tool definition, registering it, and updating the agent's tool-calling configuration.
---

# Skill: Add a New Agent Tool

## Overview
ARGenteIA supports two types of tools:
1.  **System Tools**: Hardcoded in `src/tools/`, registered at startup. Use these for complex logic or OS-level access.
2.  **Dynamic Tools**: Created via the UI/Admin dashboard. Stored in SQLite and loaded at runtime. Perfect for quick scripts or API wrappers.

## Method A: Adding a System Tool
... (keep existing steps 1-3) ...

### 1. Create the Tool File
Create a new file in `src/tools/<toolName>.ts`:
... (keep content from line 16 to 49) ...

### 2. Register the Tool in the Agent
In `src/agent/loop.ts`, register the definition and execution logic.

## Method B: Adding a Dynamic Tool (Recommended for JS logic)
1.  **Identify Requirement**: Determine if the tool can be implemented in plain JavaScript.
2.  **Open Tool Manager**: Use the UI to "Add New Tool".
3.  **Define Schema**: Input name, description, and Zod parameters.
4.  **Write Script**: Use the inline editor to provide the JS logic.
5.  **Test**: Use the "Debug" or "Chat" to verify.

## Checklist
- [ ] Tool type determined (System vs Dynamic)
- [ ] Zod schema defined with `.describe()`
- [ ] Logic implemented and error handling added
- [ ] Registered in agent (if System) or Database (if Dynamic)
- [ ] Verified via chat interface

