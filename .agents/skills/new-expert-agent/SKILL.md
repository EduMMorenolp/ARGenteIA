---
name: new-expert-agent
description: Use this skill when the user wants to create a new Expert Agent (experto especializado) in ARGenteIA. Guides through creating the system prompt, registering the expert, and optionally setting up a dedicated RAG space.
---

# Skill: Create a New Expert Agent

## Overview
ARGenteIA supports a multi-agent system where users can create specialized "experts". Each expert has its own system prompt, optional memory space, and can have different model settings.

## Structure of an Expert
```
src/promptsSystem/
└── <expertName>.ts    # System prompt definition
```

## Steps

### 1. Create the System Prompt
Create `src/promptsSystem/<expertName>.ts`:

```typescript
export const expertNamePrompt = `
Eres [NOMBRE DEL EXPERTO], un asistente especializado en [DOMINIO].

## Tu Personalidad
- [Característica 1]
- [Característica 2]

## Tus Capacidades
- Tienes acceso a las siguientes herramientas: [lista relevante]
- Puedes recordar información del usuario

## Restricciones
- Solo responder sobre [dominio específico]
- [Otras restricciones]

## Formato de Respuesta
- Respuestas concisas y directas
- Usar markdown cuando sea útil
`.trim();
```

### 2. Register the Expert
- In the agent configuration (usually `config.json` or the agent registry), add the new expert with its name and system prompt reference.
- Assign the appropriate tools the expert should have access to.

### 3. Optional: RAG Space
If the expert needs its own knowledge base:
- Create a dedicated embedding space in `src/embeddings/`
- The expert's RAG should be scoped to its own namespace

### 4. Test the Expert
- Restart the server: `pnpm dev`
- Switch to the new expert in the UI
- Verify the system prompt is applied correctly

## Checklist
- [ ] System prompt created in `src/promptsSystem/`
- [ ] Expert registered in configuration
- [ ] Tools correctly assigned
- [ ] RAG space created (if needed)
- [ ] Tested via chat
