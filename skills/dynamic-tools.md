# Habilidad: Gestión de Herramientas Dinámicas

Permite al asistente proponer o modificar funcionalidades en tiempo real sin reiniciar el servidor.

## Capacidades:
- Proponer la creación de nuevas herramientas basadas en scripts de JavaScript.
- Listar y describir todas las herramientas (tanto de sistema como dinámicas).
- Habilitar o deshabilitar herramientas según la necesidad del contexto.

## Cuándo usar:
- Cuando el usuario necesita una función que no existe (ej: "necesito que calcules el interés compuesto de X").
- Para automatizar tareas repetitivas mediante scripts personalizados.

## Instrucciones:
- Al crear una herramienta, siempre usar Zod para definir los parámetros.
- Asegurarse de manejar errores dentro del script.
- Retornar siempre un String o un Objeto JSON.
