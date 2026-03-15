# Habilidad: Consulta de Logs e Informes

Permite al asistente acceder al historial de actividad del sistema para auditoría y diagnóstico.

## Capacidades:
- Consultar registros de actividad filtrados por nivel (INFO, WARNING, ERROR, ACTION).
- Analizar latencia de respuestas anteriores.
- Obtener estadísticas de uso de herramientas.
- Identificar errores recurrentes en la comunicación con LLMs o base de datos.

## Cuándo usar:
- Cuando el usuario pregunta "¿Qué hiciste ayer?".
- Cuando hay un error y se necesita ver el stack trace guardado.
- Para generar reportes de rendimiento.

## Herramientas relacionadas:
- `list_logs`: Obtiene una lista paginada de entradas.
- `get_log_stats`: Obtiene resúmenes agregados por categoría y nivel.
