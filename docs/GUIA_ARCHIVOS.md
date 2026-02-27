# 📘 Guía de Funcionamiento de ARGenteIA

Este documento explica cómo funciona el asistente desde el momento en que se inicia el servidor y cómo se relacionan los archivos principales.

---

## 🚀 Flujo de Inicio (`src/index.ts`)

El archivo `src/index.ts` es el punto de entrada de la aplicación. Cuando ejecutas el servidor (vía `pnpm dev` o `npm start`), ocurre lo siguiente:

1.  **Carga de Configuración (`loadConfig`):** Se lee el archivo `config.json`. Si no existe, el servidor se detiene pidiendo que lo crees basándote en `config.example.json`.
2.  **Inicialización de Base de Datos (`getDb`):** Se conecta a SQLite (`assistant.db`). Si las tablas no existen (es la primera vez), se crean automáticamente (usuarios, mensajes, tareas, expertos, etc.).
3.  **Registro de Herramientas (`initTools`):** Se cargan y habilitan todas las funciones que el agente puede usar (búsqueda web, escribir archivos, clima, captura de pantalla, etc.).
4.  **Activación del Planificador (`initScheduler`):** Se cargan las tareas programadas (CRON) activas de la base de datos para que el asistente pueda realizar acciones por sí solo en el futuro.
5.  **Encendido del Gateway (`createGateway`):**
    *   Se inicia un servidor **Express** para servir la interfaz web (`ui/`).
    *   Se abre un servidor **WebSocket** para la comunicación en tiempo real con el WebChat.
6.  **Conexión con Telegram (`startTelegram`):** Si hay un `botToken` configurado, el bot se conecta a los servidores de Telegram y queda a la espera de mensajes.

---

## 📂 Estructura de Directorios (`src/`)

### 1. `agent/`
Contiene la "inteligencia" del asistente.
- **`loop.ts`:** Es el motor principal (el "bucle" de pensamiento). Decide si debe usar una herramienta, responder al usuario o delegar a un experto. Ahora incluye **Action Logs** para reportar progreso en tiempo real.
- **`scheduler-manager.ts`:** Maneja las tareas programadas en memoria.

### 2. `channels/`
Maneja las vías de comunicación.
- **`webchat.ts`:** Procesa los mensajes que vienen desde la interfaz web.
- **`telegram.ts`:** Procesa los mensajes que vienen desde el bot de Telegram, manejando comandos como `/start`, `/reset`, `/tareas`, etc.

### 3. `gateway/`
- **`server.ts`:** Define el servidor HTTP y WebSocket. Aquí se maneja la lógica de "logueo" de usuarios, envío de historial y actualizaciones de configuración en tiempo real para la UI.

### 4. `memory/`
Es el cerebro a largo plazo del asistente.
- **`db.ts`:** Definición del esquema SQLite.
- **`message-db.ts`:** Guarda y recupera el historial de conversaciones.
- **`user-db.ts`:** Gestiona los perfiles de usuario (nombre, zona horaria, tokens).
- **`expert-db.ts` (Sub-Agentes):** Gestiona los "Expertos" que puedes crear con prompts específicos.

### 5. `tools/`
Son las habilidades prácticas del asistente. Cada archivo es una herramienta que el LLM puede invocar:
- `bash.ts`, `web-search.ts`, `screenshot.ts`, `weather.ts`, etc.

### 6. `promptsSystem/`
Contiene las "personalidades" y reglas base que se le pasan al modelo de IA para que sepa cómo actuar.

### 7. `skills/`
Carga fragmentos de texto o instrucciones adicionales que extienden el conocimiento general del asistente sin cambiar el prompt principal.

---

## 💻 Interfaz de Usuario (`ui/`)
Contiene una aplicación moderna construida en React/Vite que se comunica con el servidor vía WebSockets. Es el panel de control donde puedes chatear, crear expertos y gestionar tus tareas.

---

## ⚙️ Archivos de Configuración
- **`config.json`:** Contiene las API Keys y la configuración de qué herramientas están activas. **Nunca compartas este archivo.**
- **`package.json`:** Define las dependencias del proyecto (Express, Telegraf, OpenAI SDK, etc.).
- **`tsconfig.json`:** Configuración de TypeScript.
