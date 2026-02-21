# 🤖 ARGenteIA

Un asistente personal de IA minimalista que corre en tu máquina local y te atiende desde **Telegram** y una **WebChat** en el navegador.

- Sin servicios en la nube propios — todo corre en tu PC.
- Soporta múltiples modelos: OpenAI, Anthropic, OpenRouter.
- **Memoria a Largo Plazo:** Sistema de recuerdos persistentes por usuario usando SQLite.
- **Terminal Inteligente:** Soporte multi-OS (Windows/PowerShell y Linux/Bash) con detección automática.
- Extensible con **skills** (archivos `.md`) y **herramientas** (web, archivos, terminal).

---

## ¿Cómo funciona?

```
Telegram  ─────────────────────────────────────┐
                                               ▼
WebChat (navegador) ◄── Express + WS ──►  Gateway (localhost:18000)
                                               │
                                          Agent Loop
                                               │
               ┌───────────────────────────────┴───────────────┐
             Tools                                           Memory
    (web, bash, fs, URL)                             (SQLite Persistent)
          │                                              │
    (Bash/PowerShell)                              (user_facts table)
```

El **Gateway** es un servidor local que conecta tus canales con el agente de IA. El agente puede usar herramientas para realizar acciones reales en tu PC o en la web, y posee dos tipos de memoria:
1. **Memoria de Sesión:** El historial de la charla actual (se borra con `/reset`).
2. **Memoria Long-Term:** Datos que la IA decide "memorizar" (gustos, nombre, datos clave) que persisten incluso tras reiniciar el asistente o la sesión.

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

El asistente estará disponible en el puerto configurado (default `18000` o `19666`).

---

## Configuración (`config.json`)

```json5
{
  "agent": {
    "model": "openrouter/meta-llama/llama-3.3-70b-instruct",
    "systemPrompt": "Eres un asistente personal útil y directo.",
    "maxTokens": 4096
  },
  "models": {
    "openrouter/meta-llama/llama-3.3-70b-instruct": {
      "apiKey": "sk-or-...",
      "baseUrl": "https://openrouter.ai/api/v1"
    }
  },
  "tools": {
    "bash": {
      "enabled": true,
      "os": "windows", // "windows" para PowerShell, "linux" para Bash
      "psExe": "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe", // Opcional: ruta exacta
      "allowlist": ["ls", "cat", "echo", "pwd", "dir", "Get-ChildItem", "Get-Content"]
    },
    "webSearch": { "enabled": true },
    "readFile":  { "enabled": true },
    "writeFile": { "enabled": true },
    "readUrl":   { "enabled": true }
  },
  "memory": {
    "dbPath": "./memoryUser/assistant.db" // Ruta a la base de datos SQLite
  }
}
```

---

## Herramientas de Memoria

El asistente gestiona su memoria a largo plazo mediante estas herramientas:

| Herramienta | Descripción |
|---|---|
| `memorize_fact` | Guarda un dato importante sobre vos (ej: gustos, profesión, cumpleaños). |
| `recall_facts` | Recupera todas las memorias guardadas para el usuario actual. |
| `forget_fact` | Elimina una memoria específica usando su ID. |

---

## Comandos en el chat

| Comando | Descripción |
|---|---|
| `/model` | Sin argumentos: lista modelos disponibles. Con nombre: cambia el modelo. |
| `/reset` | Borra el historial de la charla actual (pero mantiene la memoria long-term). |
| `/skills` | Lista las extensiones de comportamiento cargadas. |
| `/tools` | Muestra qué herramientas tiene permitido usar el asistente. |
| `/status` | Estado del sistema y estadísticas de la sesión. |

---

## Estructura del proyecto

```
asistentePersonal/
├── src/
│   ├── index.ts            # Punto de entrada (inicializa DB y servidores)
│   ├── gateway/            # Servidor Express + WebSocket (Protocolo WebChat)
│   ├── channels/           # Canales de comunicación (Telegram, WebChat)
│   ├── agent/              # Motor del Agente: loop, integración de modelos y prompts
│   ├── tools/              # Implementación de herramientas (Bash, Memoria, Web, FS)
│   ├── memory/             # Lógica de base de datos SQLite y sesiones
│   ├── skills/             # Sistema de inyección de prompts dinámicos (.md)
│   └── config/             # Gestión de configuración config.json (Zod)
├── ui/                     # Interfaz de WebChat (Premium Dark Theme)
├── memoryUser/             # Contiene la base de datos SQLite (ignorado en git)
├── skills/                 # Skills personalizadas para tu asistente
├── config.json             # Tu configuración activa
└── package.json
```

---

## Licencia

MIT - Hacé lo que quieras con el código. 🚀
