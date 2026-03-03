# Guía de Arquitectura: ARGenteIA

## Resumen de Arquitectura

El sistema está diseñado bajo una arquitectura de Agente Autónomo con múltiples canales de entrada y un sistema extensible de herramientas.

- **Canales de Entrada**: Telegram Bot y WebChat Frontend (React)
- **Comunicación Central**: Servidor Express con protocolo WebSocket
- **Cerebro (Motor del Agente)**: Agent Loop, Model Providers (OpenAI/Ollama/OpenRouter), Expert Runner Multi-Agente
- **Herramientas**: Terminal Bash/PS, Filesystem Tools, Web Search/URL, Scheduler/Tareas
- **Memoria y Persistencia**: SQLite DB + Memoria de Sesión

## Punto de Entrada

Archivo: `src/index.ts`

Es el encargado de encender el motor. Realiza cuatro acciones críticas:

- Carga y valida la configuración (`config.json`) con Zod
- Inicializa la base de datos SQLite
- Registra todas las herramientas disponibles (+ precomputa embeddings para Tool RAG)
- Arranca el Gateway (Web) y el Bot de Telegram

## Gateway y Protocolo

Carpeta: `src/gateway/`

Funciona como el puente entre el mundo exterior y la lógica del Agente.

- **server.ts**: Levanta Express, sirve el frontend estático y maneja conexiones WebSocket para el chat en tiempo real
- **protocol.ts**: Define el lenguaje JSON que hablan cliente y servidor (mensajes, escritura, actualizaciones de estado, modelos, dashboard, RAG)

## Canales

Carpeta: `src/channels/`

Manejan la idiosincrasia de cada plataforma:

- **telegram.ts**: Traduce los mensajes de Telegram al formato del Agente. Maneja comandos /start, /model, etc. Sistema de fallbacks cuando Markdown falla
- **webchat.ts**: Gestiona la lógica de la interfaz web, incluyendo la carga de historial persistente cuando un usuario se identifica

## El Cerebro (Motor del Agente)

Carpeta: `src/agent/`

- **loop.ts**: Ciclo de razonamiento ReAct. Si el modelo pide una herramienta, la ejecuta, obtiene el resultado y vuelve a llamar al modelo hasta respuesta final. Soporta streaming y fallback automático entre modelos
- **models.ts**: Detecta si debe usar OpenAI, Anthropic u Ollama. Resuelve credenciales con fallback escalonado (DB → config.json → key OpenRouter)
- **model-info.ts**: Consulta la API de OpenRouter para obtener capacidades del modelo (visión, audio, contexto, pricing)
- **expert-runner.ts**: Permite delegar tareas a Expertos. Cada experto es un sub-agente con su propio prompt, herramientas limitadas y acceso a su propia memoria RAG
- **embeddings/**: Módulo especializado en convertir texto a vectores. Usa nomic-embed-text vía Ollama con fallback REST

## Herramientas

Carpeta: `src/tools/`

Cada herramienta tiene un Spec (que la IA lee para saber cómo usarla) y un Handler (código TypeScript que hace el trabajo real):

- **bash**: Ejecuta comandos reales en la terminal del usuario (PowerShell/Bash)
- **web_search**: Búsqueda en internet con DuckDuckGo
- **read_url**: Lee y extrae contenido de URLs
- **read_file / write_file**: Lee y escribe archivos en el sistema del usuario
- **memory_tools**: Permite al asistente recordar datos permanentemente (memorize_fact, recall_facts)
- **scheduler**: Gestiona tareas programadas con CRON persistente en SQLite
- **delegate_task**: Delega tareas a sub-agentes expertos especializados
- **weather**: Consulta el clima actual de cualquier ciudad
- **screenshot**: Captura de pantalla del escritorio del usuario
- **send_file**: Envía archivos como adjuntos al chat

## Memoria y Persistencia

Carpeta: `src/memory/`

Usa SQLite (better-sqlite3) para toda la persistencia:

- **message-db.ts**: Guarda cada mensaje para que no se pierdan al reiniciar
- **user-db.ts**: Gestiona perfiles de usuario y preferencias
- **expert-db.ts**: Guarda la configuración de los agentes personalizados
- **model-db.ts**: CRUD de modelos de IA (nombre, displayName, API Key, Base URL) con seed automático desde config.json
- **chat-db.ts**: Gestión de chats (creación, listado, renombrado, pin, eliminación)
- **stats-db.ts**: Métricas agregadas para el Dashboard
- **rag-db.ts**: Base vectorial con embeddings para la memoria RAG. Motor local de similitud de coseno para búsqueda semántica

## Ciclo de Vida de un Mensaje

Un ejemplo completo del flujo:

- **Entrada**: El usuario escribe "Busca el clima en Buenos Aires" por Telegram
- **Recepción**: telegram.ts captura el mensaje e identifica al usuario
- **Invocación**: Se llama a runAgent en loop.ts
- **Razonamiento 1**: El modelo responde: "Necesito usar la herramienta weather para Buenos Aires"
- **Ejecución**: El sistema ejecuta el handler de la herramienta weather
- **Razonamiento 2**: El Agente recibe "22°C y nublado" y genera la respuesta final
- **Streaming**: La respuesta se transmite chunk-by-chunk vía WebSocket
- **Salida**: El canal envía el texto final al usuario con métricas de tiempo y tokens

## Tecnologías

- **Backend**: Node.js v22+ con TypeScript (tsx)
- **IA SDK**: OpenAI SDK (compatible con OpenRouter y Ollama)
- **Base de Datos**: Better-SQLite3
- **Frontend**: React + Vite + Lucide Icons
- **Comunicación**: WebSockets (ws) y Express
- **Embeddings**: nomic-embed-text vía Ollama
- **Estética**: CSS Premium dark mode + Chalk para logs en terminal
