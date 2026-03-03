# Guía Técnica de ARGenteIA

## Instalación y Despliegue

### Requisitos Previos

- **Node.js**: Versión 22 o superior
- **PNPM**: El gestor de paquetes recomendado (npm install -g pnpm)
- **Ollama** (Opcional): Si deseas ejecutar modelos 100% locales

### Pasos de Instalación

- Clonar el repositorio: `git clone https://github.com/EduMMorenolp/ARGenteIA.git`
- Entrar al directorio: `cd ARGenteIA`
- Instalar dependencias: `pnpm install`
- Copiar configuración: `cp config.example.json config.json`
- Ejecutar en desarrollo: `pnpm dev`

## Configuración

El archivo `config.json` utiliza Zod para validación en tiempo de ejecución.

### Configuración de Bash

- **enabled**: true/false para habilitar/deshabilitar la herramienta de terminal
- **os**: "windows" o "linux" según el sistema operativo
- **psExe**: Ruta opcional al ejecutable de PowerShell
- **allowlist**: Lista de comandos permitidos (ls, cat, echo, pwd, etc.)

### Configuración de Modelos

- Se pueden configurar múltiples modelos de IA en config.json
- Cada modelo tiene: name, apiKey, baseURL opcional
- El sistema hace fallback automático entre modelos si uno falla

## Protocolo WebSocket

La comunicación entre UI y servidor usa mensajes JSON con campo `type`:

- **user_message**: Envío de texto del usuario
- **assistant_chunk**: Fragmento parcial de la respuesta en streaming
- **assistant_message**: Respuesta final del asistente con historial y metadatos
- **action_log**: Logs en tiempo real sobre el uso de herramientas
- **status**: Información de sesión e inicialización del cliente
- **list_chats**: Recuperación del historial de conversaciones
- **list_models / model_update**: Gestión de modelos configurados
- **request_model_info / model_info**: Consulta de capacidades de un modelo (visión, audio, contexto, pricing)
- **request_dashboard / dashboard_stats**: Solicitud y envío de métricas del sistema
- **rag_upload / rag_list / rag_delete**: Gestión de documentos RAG

## Esquema de Base de Datos

Se utiliza SQLite con el driver better-sqlite3. Las tablas principales:

- **users**: Perfiles, zonas horarias y tokens de acceso
- **messages**: Registro histórico de todos los chats
- **chats**: Agrupación de mensajes por contexto y experto
- **user_facts**: Memoria a largo plazo (recuerdos precisos del usuario)
- **document_chunks**: Memoria vectorial RAG con embeddings para búsqueda por similitud semántica
- **scheduled_tasks**: Tareas CRON persistentes
- **sub_agents**: Configuración de expertos personalizados (nombre, prompt, herramientas)
- **models**: Modelos de IA configurados (nombre, displayName, API Key, Base URL)

## Extensibilidad

### Añadir una nueva herramienta

- Crear archivo en `src/tools/tu-herramienta.ts`
- Definir el esquema Spec compatible con OpenAI function calling
- Implementar el handler (lógica en TypeScript)
- Registrar en `src/tools/index.ts`

### Añadir una Skill

- Añadir un archivo .md en la carpeta `skills/` en la raíz del proyecto
- El contenido se inyecta automáticamente en el prompt del sistema durante el inicio

## Canales de Comunicación

- **Telegram**: Implementado con node-telegram-bot-api. Soporta Webhooks o Polling (default). Comandos: /start, /model, /expert
- **WebChat**: Aplicación SPA en ui/ construida con React, Vite y WebSockets. Login multi-usuario con persistencia de sesión

## Triple RAG (Memoria Vectorial)

Sistema de memoria a largo plazo con embeddings locales (nomic-embed-text) y búsqueda por similitud de coseno:

- **Tool RAG**: Inyección dinámica de descripciones de herramientas para ahorrar tokens. Solo las herramientas relevantes se incluyen en el contexto
- **Global RAG**: Memoria de contexto compartida entre todos los expertos. Accesible vía la sesión __general__
- **Expert RAG**: Memoria privada para cada sub-agente especialista. Cada experto tiene su propia colección de documentos
- **RAG Modal**: Interfaz en el cliente Web para visualizar, subir archivos locales y organizar el contexto vectorial
