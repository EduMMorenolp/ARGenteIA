# 🤖 Asistente Personal IA

Un asistente personal de IA minimalista que corre en tu máquina local y te atiende desde **Telegram** y una **WebChat** en el navegador.

- Sin servicios en la nube propios — todo corre en tu PC
- Soporta múltiples modelos: OpenAI, Anthropic, OpenRouter
- Extensible con **skills** (archivos `.md`) y **herramientas** (web, archivos, terminal)
- Memoria persistente de conversación

---

## ¿Cómo funciona?

```
Telegram  ─────────────────────────────────────┐
                                               ▼
WebChat (navegador) ◄── Express + WS ──►  Gateway (localhost:18000)
                                               │
                                          Agent Loop
                                               │
                              ┌────────────────┴──────────────┐
                           Tools                           Memory
                  (web, bash, archivos, URL)          (SQLite local)
```

El **Gateway** es un servidor local que conecta tus canales con el agente de IA. El agente puede usar herramientas para hacer cosas reales en tu PC o en la web, y recuerda el contexto de tu conversación.

---

## Instalación

### Requisitos

- Node.js ≥ 22
- pnpm (`npm install -g pnpm`)

### Pasos

```bash
# 1. Clonar / descargar el proyecto
cd asistentePersonal

# 2. Instalar dependencias
pnpm install

# 3. Configurar
cp config.example.json config.json
# Editar config.json con tu API key y bot token de Telegram

# 4. Arrancar
pnpm dev
```

El asistente estará disponible en `http://localhost:18000`

---

## Configuración (`config.json`)

```json5
{
  // Modelo activo
  "agent": {
    "model": "openai/gpt-4o",
    "systemPrompt": "Eres un asistente personal útil, conciso y directo.",
    "maxTokens": 4096
  },

  // Credenciales de modelos disponibles
  "models": {
    "openai/gpt-4o": {
      "apiKey": "sk-...",
      "baseUrl": "https://api.openai.com/v1"
    },
    "anthropic/claude-3-5-sonnet": {
      "apiKey": "sk-ant-..."
    },
    "openrouter/llama-3.3-70b": {
      "apiKey": "sk-or-...",
      "baseUrl": "https://openrouter.ai/api/v1"
    }
  },

  // Puerto del servidor local
  "gateway": {
    "port": 18000
  },

  // Canal Telegram (opcional)
  "channels": {
    "telegram": {
      "botToken": "123456:ABCDEF",
      "allowFrom": ["tu_username_de_telegram"]
    }
  },

  // Herramientas habilitadas
  "tools": {
    "bash": {
      "enabled": true,
      "allowlist": ["ls", "cat", "echo", "pwd", "find", "grep", "date"]
    },
    "webSearch": { "enabled": true },
    "readFile":  { "enabled": true },
    "writeFile": { "enabled": false },
    "readUrl":   { "enabled": true }
  }
}
```

---

## Skills

Las skills son archivos `.md` en la carpeta `/skills/` que le dan instrucciones extra al agente. Se cargan automáticamente al arrancar.

**Ejemplo** (`skills/asistente.md`):

```markdown
# Comportamiento general

- Responde siempre en español
- Sé conciso: máximo 3 párrafos salvo que se pida más detalle
- Si no sabes algo, dilo directamente en lugar de inventar
```

Podés crear tantas skills como quieras. El agente las leerá todas.

---

## Comandos en el chat

| Comando | Descripción |
|---|---|
| `/model <nombre>` | Cambiar el modelo activo |
| `/reset` | Borrar el historial de la sesión actual |
| `/skills` | Listar las skills cargadas |
| `/tools` | Ver las herramientas disponibles |
| `/status` | Ver modelo activo, tokens usados |

---

## Herramientas disponibles

| Herramienta | Descripción |
|---|---|
| `web_search` | Busca en DuckDuckGo (sin API key) |
| `bash` | Ejecuta comandos de terminal (con allowlist) |
| `read_file` | Lee un archivo de tu PC |
| `write_file` | Escribe o crea un archivo |
| `read_url` | Descarga y extrae texto de una URL |

---

## Estructura del proyecto

```
asistentePersonal/
├── src/
│   ├── index.ts            # Entry point
│   ├── gateway/            # Servidor Express + WebSocket
│   ├── channels/           # Telegram, WebChat
│   ├── agent/              # Loop del agente, modelos, prompt
│   ├── tools/              # Herramientas del agente
│   ├── memory/             # Sesiones y persistencia SQLite
│   ├── skills/             # Loader de skills .md
│   └── config/             # Carga y validación de config.json
├── ui/                     # WebChat (HTML + CSS + JS)
├── skills/                 # Tus skills personales (.md)
├── config.json             # Tu configuración (no subir a git)
├── config.example.json     # Plantilla de configuración
└── package.json
```

---

## Conseguir un bot de Telegram

1. Hablar con [@BotFather](https://t.me/botfather) en Telegram
2. Escribir `/newbot` y seguir los pasos
3. Copiar el token que te da y pegarlo en `config.json`

---

## Modelos soportados

| Proveedor | Ejemplo de modelo | Requiere |
|---|---|---|
| OpenAI | `openai/gpt-4o` | API key de [platform.openai.com](https://platform.openai.com) |
| Anthropic | `anthropic/claude-3-5-sonnet` | API key de [console.anthropic.com](https://console.anthropic.com) |
| OpenRouter | `openrouter/llama-3.3-70b` | API key de [openrouter.ai](https://openrouter.ai) (tiene modelos gratis) |

---

## Pasos de implementacion

- Paso 1 — Base: dependencias, tsconfig, config loader
- Paso 2 — Gateway: Express + WebSocket
- Paso 3 — WebChat UI
- Paso 4 — Agent loop con IA
- Paso 5 — Canal Telegram
- Paso 6 — Herramientas (web, bash, archivos, URL)
- Paso 7 — Memoria SQLite
- Paso 8 — Skills
- Paso 9 — Multi-modelo y comandos
- Paso 10 — Pulido final

## Licencia

MIT
