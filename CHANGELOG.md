# Changelog

Todos los cambios notables en este proyecto serán documentados en este archivo.

## [Unreleased]

### Añadido
- **Dashboard Sidebar**: Nuevo panel de estado para `Messenger-Service` en el modal de métricas, con conectividad, latencia, volumen enviado, fallos y proyectos activos. [22-3-26]
- **Configuración**: Nueva sección `messengerService` en la validación Zod (`enabled`, `baseUrl`, `apiKey`, `timeoutMs`) y en `config.example.opcional.json`. [22-3-26]

### Cambiado
- **Gateway Dashboard**: `request_dashboard` ahora compone estadísticas locales + estado remoto de `Messenger-Service` para UI unificada de operación. [22-3-26]
- **Estándares de Proyecto**: `.cursorrules` ampliado con reglas de comunicación entre microservicios (contrato, auth, desacople, idempotencia y observabilidad). [22-3-26]

### Corregido
- **Memoria Proactiva**: El Orquestador ahora detecta información personal relevante y usa `memorize_fact` automáticamente para construir el Mapa Mental. [15-3-26]
- **Robustez de Embeddings**: Añadidos timeouts y manejo de errores en la generación de vectores para evitar bloqueos del sistema cuando Ollama o APIs externas no responden. [15-3-26]
- **Mapa Mental**: Corregido flujo de datos desde `user_facts` hacia la visualización del grafo. [15-3-26]

### Mejorado
- **Interfaz RAG**: Añadido contador de documentos en la cabecera del modal y en el panel lateral para una mejor gestión visual del contexto. [15-3-26]

## [0.91.0] - 15-3-26

### Corregido
- **Persistencia de Mensajes**: Solucionado error crítico en `runExpert` que impedía el guardado de respuestas del asistente en la base de datos debido a un retorno temprano en el bucle de herramientas. [15-3-26]
- **Sincronización Telegram-Web**: Corregido el guardado de mensajes entrantes desde Telegram en la base de datos (antes solo se transmitían por WebSocket pero no se persistían). [15-3-26]
- **Duplicación de Cuentas**: Corregido fallo que creaba perfiles duplicados al usar Telegram sin vinculación previa. Ahora el sistema utiliza el ID numérico de Telegram para una vinculación persistente y única. [15-3-26]
- **Saneamiento de Historial**: Implementado filtrado automático de bloques JSON del Orquestador y eliminación de prompts técnicos en los mensajes persistidos para mantener un historial limpio. [15-3-26]
- **Consolidación de Chats**: Fusión de chats duplicados de Telegram para un mismo usuario, garantizando una vista única y coherente en el sidebar. [15-3-26]
- **Lista de Chats**: Se ha unificado la visualización de chats web en el sidebar; ahora se muestran todos los chats recientes (asistente general y expertos) independientemente del experto seleccionado, evitando que los chats "desaparezcan" al recibir actualizaciones de otros canales. [15-3-26]
- **Limpieza de Historial**: Eliminado el prefijo redundante `[Experto: ...]` al guardar mensajes de usuario en chats de expertos, mejorando la legibilidad del historial. [15-3-26]
- **Resiliencia de Expertos**: Implementado el sistema de **Model Fallbacks** también para expertos, asegurando que si el modelo preferido falla (Rate Limit u otro), se intente con modelos alternativos de la configuración o base de datos. [15-3-26]

### Añadido
- **Base de Datos**: Nueva columna `telegram_id` en la tabla `users` para garantizar la identificación inequívoca de usuarios procedentes de Telegram. [15-3-26]
- **Prompt de Sistema**: Inyección de metadatos de canal (ID de Telegram y estado de vinculación) en el prompt para que el asistente pueda asistir activamente en la configuración del perfil del usuario. [15-3-26]
- **Herramienta `update_profile`**: Mejorada para soportar la actualización de datos de Telegram y capturar automáticamente el ID de canal durante el uso desde el bot. [15-3-26]
- **Mantenimiento**: Migración completa de ESLint/Prettier a **Biome** para optimización de linting y formateo.
- **Mantenimiento**: Actualización integral de la documentación a la versión **v0.91.0** (README, Technical, Architecture, File Guide) reflejando todos los cambios de infraestructura.
- **Mantenimiento**: Sistema de configuración mejorado: el archivo `config.json` ahora es opcional. El sistema arranca con valores por defecto si no existe.
- **Mantenimiento**: Actualización de `config.example.opcional.json` con todos los parámetros disponibles (Tools, Telegram, Memory, etc.).
- **Mantenimiento**: Consolidación de todas las reglas de proyecto (Overview, TypeScript, UI) en un único archivo `.cursorrules` en la raíz para garantizar su aplicación global.
- **Mantenimiento**: Actualización integral de las habilidades del agente (`.agents/skills`) y creación de nuevas habilidades internas (`/skills`) para Logs, Herramientas Dinámicas y Clima.
- **Mantenimiento**: Implementación del primer sistema de **Workflows** para estandarizar el debugging de la UI.
- **Mantenimiento**: Limpieza de la carpeta `.agents/rules` tras la unificación de estándares.
- **Recordatorios de un solo uso**: Implementación de la herramienta `schedule_delayed_task` para programar acciones puntuales después de N minutos.
- **Programador**: Mejora en el núcleo del planificador para soportar tareas desechables (`is_once`) que se eliminan automáticamente tras su ejecución.
- **Mejora en Resiliencia de Modelos**: 
  - Notificaciones en tiempo real en el chat sobre fallos de modelos y reintentos automáticos.
  - Reporte preciso del modelo final que respondió, corrigiendo errores de visualización durante fallos en cascada.
  - Soporte para notificaciones de Rate Limit (429) y espera inteligente con feedback al usuario.
- **Mapa Mental**: Nueva visualización de grafo de memoria semántica usando embeddings locales.
- **Memoria de Hechos Mejorada**: Ahora los hechos memorizados incluyen representación vectorial.
- **UI: Modal de Gestión de Herramientas y Logs e Informes renovado:**
- **Nuevas Plantillas de Agentes**: Se han añadido 4 perfiles expertos a la librería (Redactor Creativo, Analista Cripto, Community Manager y Personal Trainer & Nutrición).
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

---
Para ver versiones anteriores, consulta [CHANGELOG_OLD.md](docs/CHANGELOG_OLD.md).
