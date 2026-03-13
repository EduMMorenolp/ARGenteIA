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
