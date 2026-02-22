# Changelog

Todos los cambios notables en este proyecto serán documentados en este archivo.

## [1.3.0] - 2026-02-22

### Añadido
- **Migración Major a Vite + React:** Interfaz de usuario reconstruida desde cero para mayor velocidad, modularidad y estética premium.
  - Diseño **Glassmorphism** oscuro con tipografía *Outfit*.
  - Navegación lateral renovada con gestión integrada de agentes y comandos.
  - Renderizado optimizado de Markdown y bloques de código.
- **Sistema Multi-Agente (Expertos):**
  - Capacidad para crear, editar y eliminar expertos especializados directamente desde la UI.
  - Invocación directa: Selecciona un experto en el chat para hablar exclusivamente con él.
  - Las respuestas de los expertos ahora aparecen identificadas con su nombre y modelo en el chat.
- **Sistema de Plantillas de Agentes:**
  - Selector de plantillas (Coder, Escritor, Researcher, Analista) que precarga automáticamente Prompts de sistema optimizados.
  - Asignación inteligente de herramientas por plantilla.
- **Capacitación de Herramientas para Expertos:**
  - Los expertos ahora pueden usar herramientas (búsqueda web, bash, archivos) de forma autónoma.
  - Implementado bucle de razonamiento y uso de herramientas (`tool_calls`) específico para expertos.
  - Selector visual de herramientas mediante "chips" interactivos en el creador de agentes.
- **Sincronización de Estado en Tiempo Real:** 
  - El servidor ahora notifica dinámicamente la lista de expertos y herramientas disponibles al conectar.
  - Implementadas nuevas acciones de WebSocket: `list_experts`, `list_tools`, `expert_update`.

### Mejorado
- **Feedback del Sistema:** Indicador de escritura animado que diferencia cuando el asistente general o un experto específico está procesando.
- **Persistencia de Expertos:** Los sub-agentes se guardan en SQLite asegurando que tus configuraciones se mantengan tras reiniciar el servidor.
- **Interfaz de Creación:** Modal optimizado con control de temperatura, modelo (OpenRouter) e instrucciones detalladas.

### Corregido
- **Build Errors:** Eliminados imports no utilizados en la UI que causaban fallos en la compilación de producción.
- **Inconsistencia de Dependencias:** Corregido error de módulo no encontrado para `zod-to-json-schema` en el entorno de ejecución.
- **WebSocket Protocol:** Robustez mejorada en el manejo de mensajes para evitar desincronización entre cliente y servidor.

## [1.2.0] - 2026-02-22

### Añadido
- **Envío de Archivos por Telegram:** Nueva herramienta `send_file_telegram` que permite al asistente enviar archivos locales (PDF, XLSX, imágenes, etc.) directamente al chat de Telegram con soporte para archivos de hasta 50MB.
- **Resolución Inteligente de Rutas:** Soporte automático para `~` y `$HOME` en las herramientas `read_file`, `write_file` y `send_file_telegram`, mapeando correctamente a `USERPROFILE` en Windows.
- **Inyección de System Prompt:** Corregido el loop del agente para inyectar correctamente el `systemPrompt` configurado en `config.json` en todas las interacciones con el modelo.
- **Poda de Historial (Pruning):** Implementada limitación de mensajes en el historial de sesión para evitar contextos excesivamente largos y optimizar el consumo de tokens.
- **Sistema de Tareas Programadas:** Nueva capacidad para agendar tareas recurrentes mediante expresiones CRON (ej: mandar el clima cada mañana).
  - Herramientas: `schedule_task`, `list_scheduled_tasks`, `delete_scheduled_task`.
  - Persistencia en SQLite y ejecución automática al iniciar el asistente.
- **Perfiles de Usuario y Onboarding:** Sistema de reconocimiento automático para nuevos usuarios que solicita nombre y zona horaria al inicio.
  - Almacenamiento persistente de datos personales y preferencias en SQLite.
  - Comando `/profile` en Telegram para visualizar los datos guardados.
  - Nueva herramienta `update_profile` para gestión dinámica de la identidad del usuario.

### Mejorado
- **Robustez en Herramientas de Archivos:** Implementada limpieza automática de comillas accidentales en rutas de archivos proporcionadas por el modelo de lenguaje.
- **Protección contra Binarios:** La herramienta `read_file` ahora detecta y evita intentar leer archivos binarios (XLSX, EXE, ZIP) como texto piano.
- **Manejo de Errores en WebSearch:** Añadida validación de JSON y manejo de respuestas vacías de DuckDuckGo para evitar caídas del bot.
- **Claridad en Herramientas de Memoria:** Instrucciones mejoradas para asegurar que el modelo use IDs numéricos al intentar olvidar hechos.

### Corregido
- **Error de Inferencia Genérica:** Se solucionó el problema donde el modelo respondía en inglés o de forma ambigua por falta de instrucciones de sistema.
- **Advertencias de Depreciación:** Eliminada la advertencia `node-telegram-bot-api` sobre el `content-type` al enviar archivos.
- **SyntaxError en Herramientas:** Corregidos varios fallos de parseo de argumentos JSON cuando el modelo incluía caracteres especiales sin escape.


## [1.1.0] - 2026-02-21

### Añadido
- **Memoria a Largo Plazo (SQLite):** Implementación de una base de datos persistente para que el asistente pueda recordar hechos sobre el usuario entre sesiones y tras usar `/reset`.
  - Nuevas herramientas: `memorize_fact`, `recall_facts`, `forget_fact`.
  - Base de datos particionada por `userId` (Telegram ID o WebChat Session).
- **Soporte Multi-OS para Bash Tool:**
  - Integración completa con **Windows** usando **PowerShell**.
  - Auto-detección del ejecutable de PowerShell (`pwsh` o `powershell.exe`).
  - Forzado de codificación UTF-8 para manejar correctamente caracteres especiales (ñ, tildes) en la terminal de Windows.
- **Inyección de Contexto de Sistema:** El agente ahora conoce automáticamente el sistema operativo, el usuario actual y las rutas de carpetas importantes (Downloads, Documents, Desktop) sin configuración manual.
- **Robustez en Agent Loop:**
  - Parche de compatibilidad para OpenRouter y Llama 3 para evitar errores `422` y `400`.
  - Manejo de respuestas vacías para evitar crasheos en el bot de Telegram.
  - Logs detallados en terminal con colores para debuggear ejecuciones de herramientas.
- **Inicialización Automática:** La base de datos y sus directorios se crean automáticamente al arrancar el proyecto con `pnpm dev`.

### Cambiado
- **Comando `/model`:** Mejorado en Telegram para listar modelos disponibles si se usa sin argumentos.
- **Instrucciones del Agente (`AGENTS.md`):** Actualizadas para priorizar el uso de memoria a largo plazo y evitar errores comunes de sintaxis en PowerShell (uso de `;` en lugar de `&&`).
- **Configuración:** `config.json` ahora soporta campos `os` y `psExe` para mayor control sobre la herramienta bash.

### Corregido
- Error de mensajes vacíos en Telegram (`ETELEGRAM: 400 Bad Request`).
- Errores de tipado en TypeScript al procesar `tool_calls`.
- Problemas de codificación en Windows PowerShell al leer/escribir archivos con caracteres especiales.

---

## [1.0.0] - 2026-02-15
### Añadido
- Proyecto inicial (OpenClaw Lite).
- Soporte para OpenAI y OpenRouter.
- Interfaz WebChat básica y Bot de Telegram.
- Herramientas básicas de búsqueda web y lectura de archivos.
