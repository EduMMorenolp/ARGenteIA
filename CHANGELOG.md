# Changelog

Todos los cambios notables en este proyecto serán documentados en este archivo.

## [Unreleased]

### Añadido
- **Mantenimiento**: Migración completa de ESLint/Prettier a **Biome** para optimización de linting y formateo.
- **Mantenimiento**: Sistema de configuración mejorado: el archivo `config.json` ahora es opcional. El sistema arranca con valores por defecto si no existe.
- **Mantenimiento**: Actualización de `config.example.opcional.json` con todos los parámetros disponibles (Tools, Telegram, Memory, etc.).
- **Mantenimiento**: Consolidación de todas las reglas de proyecto (Overview, TypeScript, UI) en un único archivo `.cursorrules` en la raíz para garantizar su aplicación global.
- **Mantenimiento**: Actualización integral de las habilidades del agente (`.agents/skills`) y creación de nuevas habilidades internas (`/skills`) para Logs, Herramientas Dinámicas y Clima.
- **Mantenimiento**: Implementación del primer sistema de **Workflows** para estandarizar el debugging de la UI.
- **Mantenimiento**: Limpieza de la carpeta `.agents/rules` tras la unificación de estándares.
- **UI: Modal de Gestión de Herramientas y Logs e Informes renovado:**
  - Implementación de una barra de herramientas superior (toolbar) con buscador integrado en tiempo real para filtrar contenido en ambos modales (`ToolManager.tsx` y `LogsModal.tsx`).
  - Agregado sistema visual de KPIs (métricas clave) en la parte superior para resúmenes rápidos (Total de Herramientas, Activas, Dinámicas, Errores Totales, etc).
  - Herramientas: Incorporación de filtros dinámicos mediante selectores para ordenar por "Tipo" (Sistema/Dinámicas) y "Estado" (Activas/Inactivas).
  - Mejora integral en el diseño CSS, adoptando un layout card-based con `grid` para un uso óptimo del espacio, scrollbars ocultos y cabeceras/toolbars flotantes adherentes (`position: sticky`).
  - Metadatos visuales enriquecidos en las tarjetas de herramientas y reportes.
- **UI: Modal de Creación de Expertos renovado:**
  - Implementación del nuevo layout con `modal-centered-wrapper` homologando el diseño con el modal de Gestión de Modelos.
  - Añadidas **dos ventanas emergentes (paneles laterales)** con animación fluida en el `ExpertCreator`.
  - El panel derecho ahora contiene una **sección visual de Plantillas** basada en tarjetas (cards) interactivas, reemplazando el antiguo menú desplegable.
  - El panel izquierdo preparado para futuras "Opciones Avanzadas".
- **UI: Rediseño del Sidebar Principal:**
  - Las secciones del sidebar (Comandos, Expertos, Tareas, Modelos) ahora son **colapsables / expansibles**, permitiendo optimizar el espacio vertical.
  - Nuevos iconos estandarizados (`TerminalSquare`, `Network`, `CalendarClock`, `Cpu`, `FileText`) para los encabezados de cada sección.
  - Mejora en el layout de los comandos y estados de hover de los items.

## [0.9.0] - 2026-03-04

### Añadido
- **Instalador One-Click (`instalar.bat`):** Script batch que permite a usuarios no técnicos instalar el proyecto con un doble click:
  - Verificación automática de Node.js (abre página de descarga si no está instalado).
  - Instalación global de pnpm.
  - Instalación de dependencias y compilación del proyecto.
  - Creación automática de `config.json` desde el template de ejemplo.
- **Lanzador GUI (`ARGenteIA.bat` + `launcher.ps1`):** Panel de control gráfico nativo con Windows Forms:
  - Botones **Iniciar** / **Detener** servidor con indicadores visuales de estado (🟢/🔴).
  - **Log en vivo** del servidor con timestamps.
  - Botón para **abrir en el navegador** (puerto 19666).
  - Botón para **editar `config.json`** directamente desde el panel.
  - Cierre seguro: detiene el servidor automáticamente al cerrar la ventana.
  - Tema oscuro premium acorde a la identidad visual del proyecto.
- **Guía de Instalación Web (`InstallGuide`):** Nuevo componente en la landing page (ARGenteIA Web) visible solo para el rol **usuario**:
  - 4 pasos visuales con íconos: Descargar → Instalar → Configurar → Iniciar.
  - Nota informativa sobre obtención de API keys (OpenRouter, Ollama).
  - Diseño responsive con cards, conectores entre pasos y animaciones reveal.
- **Scripts de UI en `package.json`:**
  - `pnpm run ui:install` — Instala dependencias del frontend (`ui/`).
  - `pnpm run ui:dev` — Levanta el dev server Vite del frontend.

### Mejorado
- **Experiencia de Onboarding:** El flujo completo de instalación ahora es accesible para usuarios sin conocimientos técnicos, reduciendo la barrera de entrada al proyecto.

## [0.8.0] - 2026-03-01

### Añadido
- **Triple RAG (Memoria Vectorial):** Implementación de memoria a largo plazo con *Embeddings* locales (`nomic-embed-text`) y búsqueda por similitud de coseno, dividida en 3 niveles: 
  - **Tool RAG:** Inyección dinámica de descripciones de herramientas para ahorrar tokens.
  - **Global RAG:** Memoria de contexto compartida (`__general__`).
  - **Expert RAG:** Memoria privada para cada sub-agente especialista.
- **RAG Modal Manager:** Creada nueva interfaz en el cliente Web (`RagModal`) para visualizar, subir archivos locales reales y organizar el contexto inyectado en la base de datos `document_chunks`.
- **Streaming de Respuestas:** Integración de streaming de texto vía WebSockets para visualizar las respuestas del asistente en tiempo real a medida que se generan (`assistant_chunk`).
- **Dashboard de Estadísticas:** Nuevo modal interactivo (`DashboardModal`) para visualizar métricas de uso, consumos e historial general del sistema. Soporte completo en backend (`stats-db.ts`).
- **Gestión Avanzada de Modelos:**
  - Posibilidad de otorgar un **nombre personalizado** (`displayName`) a los modelos guardados.
  - Integración de **Model Info** desde OpenRouter para detección automática de capacidades (Visión, Audio, Contexto, Pricing).
  - Nuevo layout del modal `ModelManager` con **paneles laterales deslizables**.
  - Panel izquierdo dedicado a la búsqueda directa e integración de modelos desde **OpenRouter** con botón "Añadir".
  - Panel derecho preparado para futuras **Herramientas de Modelo**.
  - **Solapas laterales** (`modal-side-tab`) integradas visualmente al borde del modal principal.

### Mejorado
- **CSS Modular:** Refactorización de la hoja de estilos global (`index.css`), separándola en múltiples módulos: `sidebar.css`, `chat-sidebar.css`, `modals.css`, `model-manager.css`.
- **Timestamps en Chat:** Visualización de la fecha y hora debajo de cada burbuja de mensaje.
- **UI/UX en Paneles Laterales:** Refinamientos en el `Sidebar` general y el `ChatSidebar` (mejor organización, transiciones fluidas).
- **Resolución Inteligente de Credenciales:**
  - `createClient()` ahora busca API Keys con fallback escalonado: DB → `config.json` (key exacta) → `config.json` (con prefijo `openrouter/`) → cualquier otra key OpenRouter disponible.
- **Fallback de Modelos Mejorado:** El sistema de fallback en `loop.ts` ahora combina modelos de la **DB** y de `config.json` (antes solo usaba `config.json`).

### Corregido
- **Bug crítico en `modelName()`:** La función eliminaba incorrectamente el namespace del vendor en IDs de modelo de 2 partes (ej: `qwen/qwen3-vl-235b-a22b-thinking` → `qwen3-vl-235b-a22b-thinking`). Ahora solo elimina prefijos conocidos (`openrouter/`, `ollama/`).
- **Compilación Frontend:** Resoluciones a conflictos de tipado con la propiedad `model` y múltiples errores de sintaxis JSX en `ModelManager.tsx`.
- **Compilación Backend:** Solucionado error de parseo en `agent/loop.ts` (TS1005: 'try' expected).
- **Layout de Modales:** Ajustado el diseño CSS para garantizar un ancho fijo de 480px en modales principales con expansión fluida de paneles.

## [0.7.0] - 2026-02-27

### Corregido
- **Validación de Expertos:** Implementada validación obligatoria en `upsertExpert` para prevenir la inserción de sub-agentes sin nombre o con nombres inválidos.
- **Type Safety Pro:**
  - Resolución de conflictos entre tipos de Zod y `zod-to-json-schema` en el sistema de delegación de herramientas.
  - Tipado estricto de resultados de base de datos en `expert-db.ts` para evitar inconsistencias en tiempo de ejecución.
- **Estándares Web:** Incorporación de `background-clip` estándar en CSS y limpieza de reglas redundantes en la UI.

### Mejorado
- **Estabilidad del Arranque:** El asistente ahora es más resiliente ante datos inconsistentes en la tabla `sub_agents`.


## [0.6.0] - 2026-02-27

### Añadido
- **Flujo Dinámico de Comunicación:**
  - Sistema de **Action Logs** que notifica al usuario en tiempo real qué está haciendo el asistente (ej: "Procesando solicitud", "Usando herramienta: X").
  - Feedback visual tanto en WebChat como en Telegram (mensajes con emoji ⏳).
- **Interfaz de Usuario Refinada:**
  - **Sidebars Sincronizados:** El sidebar izquierdo ahora es colapsable y está sincronizado con el derecho, optimizando el espacio de trabajo.
  - **Modo Minimalista:** Ocultación global de barras de desplazamiento (scrollbars) para una estética más limpia.
  - **Transiciones Fluidas:** Animaciones CSS suaves para la apertura y cierre de paneles laterales.

### Mejorado
- **Estabilidad de Tareas Programadas:**
  - Corrección crítica en la gestión de `userId` y `chatId` para tareas locales, asegurando que las respuestas se guarden en el historial correcto.
- **Robustez de Telegram:**
  - Mejora en el manejo de múltiples instancias para evitar errores `409 Conflict`.
  - Logging avanzado de tokens ofuscados para depuración de conectividad.
- **Herramienta de Captura de Pantalla:**
  - Depuración profunda integrada con logs de consola detallados (tamaño de archivo, ID de mensaje, estado de envío).
  - Mayor tolerancia a fallos de vinculación de cuenta.

### Corregido
- **Type Safety en Gateway:** Resueltos múltiples errores de TypeScript en `protocol.ts` y `server.ts` relacionados con herencia de tipos y mapeo de mensajes WebSocket.
- **Error `NOT NULL constraint failed: messages.userId`** en la ejecución de tareas programadas por el sistema.
- **Variable `sessionId` indefinida** en diversas funciones del núcleo del agente tras la refactorización a Multi-Chat.

## [0.5.0] - 2026-02-26

### Añadido
- **Gestión de Modelos desde la Web:**
  - Nueva tabla `models` en SQLite para persistir modelos configurados (nombre, API Key, Base URL).
  - Módulo CRUD completo (`model-db.ts`) con seed automático desde `config.json` al primer arranque.
  - **Modal "Gestión de Modelos"** en la WebChat para agregar, editar y eliminar modelos sin tocar archivos de configuración.
  - **Badges de proveedor** con colores diferenciados (OpenRouter, Ollama, Anthropic, OpenAI).
  - **Botón de visibilidad** (👁) para mostrar/ocultar API Keys en el formulario.
  - Sección **"Modelos"** en el Sidebar con contador y acceso rápido al manager.
- **Dropdown de Modelos en Editores:**
  - El campo "Modelo" en el editor de expertos y del Asistente General ahora es un `<select>` desplegable que lista todos los modelos de la DB en vez de un input de texto libre.
- **Resolución Dinámica de Credenciales:**
  - `createClient()` busca primero en la DB y luego en `config.json` como fallback, permitiendo gestionar modelos sin reiniciar el servidor.
- **Protocolo WS extendido:**
  - Nuevos mensajes `list_models` y `model_update` con broadcast automático a todos los clientes conectados.
- **ESLint + Prettier:**
  - Configuración completa de ESLint v9 (flat config) con `typescript-eslint` y `eslint-config-prettier`.
  - `.prettierrc` y `.prettierignore` para formateo consistente.
  - Scripts `lint`, `lint:fix`, `format` y `format:check` en `package.json`.

### Mejorado
- **Type Safety:** Reemplazo masivo de `any` por tipos específicos (`CompletionUsage`, `Record<string, unknown>`, `unknown` en catch blocks) en todo el backend.
- **Error Handling:** Estandarización de `catch (err: unknown)` con mensajes descriptivos en todas las herramientas y canales.
- **Formato HTML en Telegram:** Migración de Markdown a HTML para evitar problemas con caracteres especiales como guiones bajos.

### Corregido
- Errores de tipos `CompletionUsage` vs `Record<string, unknown>` en `loop.ts` y `expert-runner.ts`.
- `no-async-promise-executor` en `server.ts`.
- Imports no utilizados y variables `@ts-ignore` reemplazadas por `@ts-expect-error`.
- Empty catch blocks y parámetros no usados prefijados con `_`.

## [0.4.0] - 2026-02-22

### Añadido
- **Gestión Completa de Tareas (Web & Telegram):**
  - **Panel de Control Web:** Nueva sección en la barra lateral que lista todas las tareas programadas con actualización en tiempo real.
  - **Edición Visual:** Implementado modal de edición de tareas que permite modificar la descripción y la expresión cron sin borrar la tarea.
  - **Comandos de Telegram:** Añadidos comandos `/tareas` (para listar con IDs) y `/borrar_tarea <ID>` (para eliminación remota).
- **Reporte Meteorológico Profesional:**
  - Migración a la API JSON de `wttr.in` para obtener datos estructurados y fiables.
  - Soporte para **Pronóstico Extendido de 3 días** mediante el parámetro `forecast`.
  - El experto en Clima ahora procesa y resume visualmente temperaturas máximas, mínimas y estado del cielo.

### Mejorado
- **Arquitectura de Frontend Pro:** Refactorización completa de la UI siguiendo patrones de diseño escalables (Next.js style).
  - Extracción de lógica a **Hooks personalizados** (`useAssistant`, `useWebSocket`).
  - Modularización de componentes en carpetas especializadas (`components/chat`, `components/layout`, `components/modals`).
  - Centralización de tipos, constantes y servicios.
- **Selector de Horarios Pro:** Rediseñado el editor de tareas para eliminar la necesidad de conocer formato CRON. Ahora incluye selectores numéricos de hora/minuto y chips interactivos para los días de la semana.
- **Botón de Cierre Premium:** Nuevo diseño circular para el botón "X" con animación de rotación y feedback visual mejorado.
- **Modal de Funcionalidades:** Rediseñado con descripciones técnicas precisas de los módulos del sistema.
- **Formularios & Foco:** Mejora en la validación visual y estados de foco (glow) en todos los modales.
- Reorganización de la barra de comandos rápida (Estado, Ayuda, Limpiar, Funciones).
- **Identidad Visual:** Actualización del favicon (`logo.svg`).
- **Protocolo de Comunicación:** Sincronización proactiva de tareas programadas mediante el mensaje `list_tasks` al identificar el usuario.

### Corregido
- **Build & Layout:** 
  - Corregido bug de scroll infinito en la lista de mensajes mediante rigidización del contenedor principal.
  - Eliminados errores de compilación por iconos no utilizados (`ChevronRight`) y variables de estado perdidas tras refactorización.
  - Solucionado el problema de alias del comando de ayuda (`/ayuda` ahora es universal).

## [0.3.1] - 2026-02-22

### Añadido
- **Historial de Chat Persistente (SQLite):** Implementada una nueva tabla `messages` para almacenar de forma definitiva todas las conversaciones del asistente y sus expertos.
- **Asociación de Perfiles (Web-Telegram Login):**
  - Nueva pantalla de inicio de sesión en la Web que permite seleccionar perfiles existentes de Telegram.
  - Sincronización automática de historial: Los mensajes enviados por Telegram ahora son visibles en la interfaz Web.
  - Gestión de sesiones: Botón de "Cerrar Sesión" añadido para permitir el cambio dinámico entre usuarios o modo invitado.
- **Identificación de Origen de Mensajes:** 
  - Sistema de tracking para distinguir si un mensaje fue enviado desde la Web o Telegram.
  - Iconos visuales descriptivos en la interfaz de chat para mensajes con origen móvil/Telegram.
- **Persistencia en Agentes Expertos:** Las interacciones con sub-agentes corporativos ahora se guardan y vinculan correctamente al historial persistente del usuario solicitante.

### Mejorado
- **Carga de Contexto Histórico:** Al identificar un usuario, se recuperan automáticamente los últimos 50 mensajes de la base de datos para mantener la continuidad de la charla.
- **Robustez del Gateway:** Transición fluida de `sessionId` genérico a `userId` específico sin pérdida de conexión.

### Corregido
- **Error Crítico de Asignación:** Solucionado el bug `TypeError: Assignment to constant variable` que impedía la identificación de usuarios en el servidor WebSocket.
- **Build de Producción:** Corregidos errores de tipos y de importaciones de iconos no utilizados que bloqueaban `npm run build`.
- **Integridad de Base de Datos:** Eliminado error de sintaxis en el script de inicialización de tablas SQL.

## [0.3.0] - 2026-02-22

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

## [0.2.0] - 2026-02-22

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


## [0.1.0] - 2026-02-21

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

## [0.0.1] - 2026-02-15
### Añadido
- Proyecto inicial (OpenClaw Lite).
- Soporte para OpenAI y OpenRouter.
- Interfaz WebChat básica y Bot de Telegram.
- Herramientas básicas de búsqueda web y lectura de archivos.
