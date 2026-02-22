# Changelog

Todos los cambios notables en este proyecto serán documentados en este archivo.

## [1.2.0] - 2026-02-22

### Añadido
- **Envío de Archivos por Telegram:** Nueva herramienta `send_file_telegram` que permite al asistente enviar archivos locales (PDF, XLSX, imágenes, etc.) directamente al chat de Telegram con soporte para archivos de hasta 50MB.
- **Resolución Inteligente de Rutas:** Soporte automático para `~` y `$HOME` en las herramientas `read_file`, `write_file` y `send_file_telegram`, mapeando correctamente a `USERPROFILE` en Windows.
- **Inyección de System Prompt:** Corregido el loop del agente para inyectar correctamente el `systemPrompt` configurado en `config.json` en todas las interacciones con el modelo.
- **Poda de Historial (Pruning):** Implementada limitación de mensajes en el historial de sesión para evitar contextos excesivamente largos y optimizar el consumo de tokens.
- **Sistema de Tareas Programadas:** Nueva capacidad para agendar tareas recurrentes mediante expresiones CRON (ej: mandar el clima cada mañana).
  - Herramientas: `schedule_task`, `list_scheduled_tasks`, `delete_scheduled_task`.
  - Persistencia en SQLite y ejecución automática al iniciar el asistente.

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
