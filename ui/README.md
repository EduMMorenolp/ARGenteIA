# ARGenteIA - Interfaz Web (React + Vite)

Esta es la interfaz de chat moderna para tu asistente personal, construida con **React**, **TypeScript** y **Vite**. Ofrece una experiencia fluida con renderizado de Markdown, iconos modernos y actualizaciones en tiempo real mediante WebSockets.

## 🚀 Guía de Inicio Rápido

### Requisitos Previos
- Node.js (v18 o superior)
- pnpm (instalado globalmente)

### Instalación
1. Navega a la carpeta de la interfaz:
   ```bash
   cd ui
   ```
2. Instala las dependencias:
   ```bash
   pnpm install
   ```

## 🛠️ Modos de Desarrollo

### 1. Desarrollo Activo (Recomendado)
Si quieres realizar cambios en la interfaz y verlos al instante:
1. Asegúrate de que el servidor backend (en la raíz) esté corriendo (`pnpm dev`).
2. En la carpeta `ui`, ejecuta:
   ```bash
   pnpm dev
   ```
3. Abre [http://localhost:5173](http://localhost:5173) en tu navegador.
   *Nota: Se ha configurado un proxy automático hacia el backend en el puerto 19666.*

### 2. Modo Producción
Para usar la interfaz de forma optimizada servida directamente por Node.js:
1. Genera la versión compilada:
   ```bash
   pnpm build
   ```
2. Inicia el proyecto desde la raíz del asistente:
   ```bash
   cd ..
   pnpm dev
   ```
3. Accede a través de [http://localhost:19666](http://localhost:19666).

## 📁 Estructura del Proyecto
- `src/App.tsx`: Componente principal con la lógica de chat y conexión WebSocket.
- `src/index.css`: Estilos globales y sistema de diseño (modo oscuro).
- `src/main.tsx`: Punto de entrada de React.
- `vite.config.ts`: Configuración de Vite y proxy para el backend.

## ✨ Características
- **Markdown**: Formateo de código, tablas y negritas en los mensajes del asistente.
- **Iconos**: Integración con `lucide-react`.
- **Responsive**: Diseño adaptado para móviles y escritorio.
- **Comandos Rápidos**: Botones de acceso directo para las funciones más comunes.
- **Indicador de Escritura**: Feedback visual mientras el asistente procesa la respuesta.
