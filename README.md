# 🤖 ARGenteIA `v0.8.0`

### El Asistente Personal que Vive en tu PC

ARGenteIA es mucho más que un simple chatbot. Es un ecosistema de IA diseñado para correr localmente, dándote control total sobre tus datos, tus herramientas y tus automatizaciones. Atiéndelo desde tu navegador o llévalo contigo en Telegram.

---

## ✨ Características Principales

*   **🏠 100% Local o Cloud:** Tú eliges. Conéctalo a **Ollama** para privacidad total o a **OpenRouter/OpenAI** para máxima potencia.
*   **🧠 Memoria Infinita:** No solo recuerda la charla actual. El asistente puede "memorizar" datos sobre ti (tus gustos, fechas importantes, notas) que persisten para siempre.
*   **🤖 Sistema de Expertos (Multi-Agente):** Crea agentes especializados para tareas específicas: un experto en programación, un asistente de cocina o un analista financiero.
*   **📚 Triple RAG (Retrieval-Augmented Generation):** El asistente cuenta con memoria a largo plazo basada en vectores (Embeddings) tanto a nivel **Global** como **Por Experto**, además de inyectar las descripciones de herramientas (Tool RAG) dinámicamente para ahorrar tokens.
*   **🐚 Terminal Inteligente:** Pídele que ejecute comandos, instale paquetes o analice logs. Soporta **Windows (PowerShell)** y **Linux (Bash)**.
*   **📅 Automatización CRON:** Programa tareas para que el asistente las haga por ti mientras duermes (reportes, recordatorios, monitoreo).
*   **📊 Dashboard y Gestor de Modelos:** Control visual del consumo y gestión integral de tus APIs (OpenRouter, Ollama) con búsqueda e integración directa desde la UI.
*   **⚡ Respuestas en Tiempo Real:** Interfaz **Streaming** nativa (vía WebSockets) para que la interacción fluya como un chat humano.
*   **📱 Multi-Canal Nativo:** Chatea con una interfaz Web moderna y premium o usa el bot de **Telegram** para enviarte archivos y comandos desde cualquier lugar.

---

## 📸 Experiencia de Usuario

| Login | WebChat Premium |
| :--- | :--- |
| ![Login](./docs/img/login.png) | ![WebChat](./docs/img/dashboard.png) |
| ![Telegram](./docs/img/image.png) | ![Experts](./docs/img/functions_modal.png) |

*Interfaz diseñada con estética **Glassmorphism Dark**, optimizada para enfoque y productividad.*

---

## 🛠️ Lo que ARGenteIA puede hacer por ti

- **"Avísame todos los lunes a las 9am que revise el presupuesto."** *(Automatización)*
- **"Busca en la web las últimas noticias de IA y resúmelas en un archivo .txt."** *(Herramientas)*
- **"¿Recuerdas cuál era mi café favorito?"** *(Memoria Long-term)*
- **"Toma una captura de pantalla de mi escritorio y envíamela por Telegram."** *(Control remoto)*

---

## 🏁 Inicio Rápido

¿Quieres probarlo? Solo necesitas Node.js y 5 minutos:

```bash
pnpm install
cp config.example.json config.json
pnpm dev
```

> [!TIP]
> Para una guía detallada de instalación y configuración técnica, consulta nuestro [**Documento Técnico (TECHNICAL.md)**](./docs/TECHNICAL.md).

---

## 📂 Documentación Adicional

- [**Guía Técnica**](./docs/TECHNICAL.md): Arquitectura, Instalación y Configuración.
- [**Guía de Archivos**](./docs/GUIA_ARCHIVOS.md): Entiende cómo funciona el código por dentro.
- [**Arquitectura del Sistema**](./docs/ARQUITECTURA.md): Flujos de datos y diseño interno.
- [**Changelog**](./CHANGELOG.md): Historial detallado de cambios por versión.

---

## 📄 Licencia

Este proyecto está bajo la licencia **MIT**. Eres libre de usarlo, modificarlo y distribuirlo para tus propios fines.

---

<p align="center">
  Hecho con ❤️ para la comunidad de IA local.
</p>
