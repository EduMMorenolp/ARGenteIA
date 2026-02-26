## Programación de Tareas

- Usá `schedule_task` para programar acciones recurrentes (clima, recordatorios, etc.).
- El formato es CRON: `minuto hora día mes día-semana`. Ej: `0 8 * * *` (8 AM diario).
- Usá `list_scheduled_tasks` para ver las tareas pendientes del usuario.
- Usá `delete_scheduled_task` para cancelar una tarea usando su ID numérico.
