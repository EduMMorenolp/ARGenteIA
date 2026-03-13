---
activation: always
---

# ARGenteIA Project — Reglas del Agente

## Contexto del Proyecto
ARGenteIA es un asistente personal de IA **100% local** que corre en Node.js + TypeScript. El proyecto tiene dos entrypoints: un servidor Express (API REST + WebSockets) y un bot de Telegram.

## Stack Tecnológico
- **Runtime**: Node.js con TypeScript (ESM), transpilado con `tsx` en desarrollo y `tsc` en producción
- **Backend**: Express 5, WebSockets (`ws`), SQLite (`better-sqlite3`), Zod para validación
- **IA**: OpenAI SDK compatible (OpenRouter + Ollama), Anthropic SDK, sistema de embeddings vectoriales
- **Automatización**: `node-cron` para tareas programadas
- **Telegram**: `node-telegram-bot-api`
- **UI**: Proyecto Vite separado en `/ui` (frontend)
- **Gestor de paquetes**: `pnpm` con workspaces

## Estructura del Proyecto
```
src/
├── agent/          # Lógica central del agente (orchestrator, tool-calling, multi-agente)
├── channels/       # Integraciones (webchat, telegram)
├── config/         # Configuración central (config.json)
├── embeddings/     # Sistema RAG con vectores
├── gateway/        # Proxy a LLMs (OpenRouter, Ollama)
├── memory/         # Memoria persistente (SQLite)
├── promptsSystem/  # System prompts por experto/agente
├── skills/         # Skills internos del asistente (no confundir con .agent/skills)
├── tools/          # Herramientas disponibles para el agente (terminal, cron, screenshot, etc.)
└── index.ts        # Entry point
ui/                 # Frontend Vite (TypeScript + CSS nativo)
skills/             # Skills internas del asistente IA
```

## Convenciones de Código
- **TypeScript estricto**: Siempre tipar correctamente. Evitar `any`. Usar interfaces y tipos explícitos.
- **ESM**: Todos los imports usan extensión `.js` (apunta a `.ts` en desarrollo gracias a tsx).
- **Zod**: Usar Zod para validar entradas externas, configuraciones y schemas.
- **Errores**: Usar try/catch con logging descriptivo. No silenciar errores.
- **Async/Await**: Preferir async/await sobre callbacks. Evitar mezclar paradigmas.
- **SQLite**: Usar sentencias preparadas (`db.prepare(...).run/get/all`). No interpolar SQL directamente.
- **Config**: Toda configuración sensible va en `config.json` (no hardcoded).

## Patrones Arquitectónicos
- **Tool Calling**: Las herramientas del agente siguen el patrón OpenAI function calling con schema Zod→JSON.
- **RAG Dual**: Embeddings a nivel Global y por Experto. No mezclar los espacios de vectores.
- **Multi-Agente**: Cada experto tiene su propio system prompt en `promptsSystem/`. Al crear un nuevo experto, también crear el prompt correspondiente.
- **WebSockets**: La comunicación en tiempo real usa `ws`. El streaming de tokens se envía chunk por chunk.

## Reglas Importantes
- ⚠️ **NO modificar** `config.json` directamente en el código; leer siempre con `getConfig()`.
- ⚠️ **NO romper** la compatibilidad con Ollama y OpenRouter simultáneamente.
- ✅ Al agregar una nueva tool, registrarla en el array de tools del agente correspondiente.
- ✅ Al modificar la DB, verificar que las migraciones sean retrocompatibles.
- ✅ El frontend (`/ui`) tiene su propio `pnpm install`. Correr `pnpm ui:build` para producción.
