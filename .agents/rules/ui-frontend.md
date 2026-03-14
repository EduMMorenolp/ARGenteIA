---
activation: glob
glob: "ui/**/*"
---

# UI Frontend Standards — ARGenteIA Project

## Stack del Frontend
- **Framework**: Vite + TypeScript
- **Estilos**: CSS nativo con variables personalizadas (NO Tailwind)
- **Comunicación**: WebSockets para streaming en tiempo real
- **Build**: `pnpm ui:build` desde la raíz del proyecto

## Diseño
- **Tema**: Dark mode premium con estética Glassmorphism
- **Paleta**: Fondo `#08090d`, acentos `#4f8cff`, glassmorphism con `backdrop-filter: blur()`
- **Tipografía**: Google Fonts (Outfit, JetBrains Mono)
- **Animaciones**: Micro-animaciones en hover (transitions suaves, transforms)

## Reglas de UI
- Mantener consistencia visual con el sistema de diseño existente.
- No agregar dependencias nuevas al frontend sin evaluar el impacto en el bundle.
- Las variables CSS globales están centralizadas — usar variables en vez de valores hardcodeados.
- Los iconos se implementan como SVG inline o componentes simples, no bibliotecas externas pesadas.
- **Verificación Obligatoria:** Siempre que se modifique la UI (Vite en modo desarrollo), se debe utilizar el subagente de navegador web o pedir al usuario que verifique los cambios visualmente ingresando a `http://localhost:5173/`. Por defecto, el servidor backend corre en otros puertos, pero el frontend en desarrollo Vite usa el 5173.

## Comunicación con el Backend
- El WebSocket se conecta a `ws://localhost:<PORT>`.
- El streaming de tokens llega en formato de chunks — acumular y renderizar progresivamente.
- Manejar desconexiones con reconexión automática.

## Organización
```
ui/src/
├── components/   # Componentes reutilizables
├── styles/       # Variables CSS y estilos globales
├── utils/        # Helpers y utilidades
└── main.ts       # Entry point
```
