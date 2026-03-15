---
description: Guía paso a paso para diagnosticar y corregir errores visuales en el frontend de React/Vite.
---

# Workflow: UI Debugging & Fix

Este flujo debe seguirse cuando se detecta un error visual o de runtime en el frontend (ej: el Sidebar no se renderiza).

## 1. Identificar el Error
- Mirar los logs de la consola del navegador (si están disponibles).
- Buscar errores de tipo `ReferenceError` o `Layout break`.

## 2. Verificar Dependencias de UI
// turbo
- Ejecutar `biome check ui/` para encontrar errores de sintaxis o imports faltantes.

## 3. Corregir y Validar
- Realizar la corrección técnica.
- **IMPORTANTE**: Solicitar al usuario que verifique en `http://localhost:5173/` (Vite Dev Server).

## 4. Limpieza
- Correr `pnpm run format` para asegurar que el estilo sea consistente con Biome.
