# 🤖 ARGenteIA `v0.91.0`

### El Asistente Personal que Vive en tu PC

ARGenteIA es mucho más que un simple chatbot. Es un ecosistema de IA diseñado para correr localmente, dándote control total sobre tus datos, tus herramientas y tus automatizaciones. Atiéndelo desde tu navegador o llévalo contigo en Telegram.

---

## ✨ Características Principales

*   **🏠 100% Local o Cloud:** Tú eliges. Conéctalo a **Ollama** para privacidad total o a **OpenRouter/OpenAI** para máxima potencia.
*   **🛠️ Herramientas Dinámicas:** Crea y edita herramientas en tiempo real mediante JavaScript (vía UI) sin reiniciar el servidor.
*   **🧠 Memoria Infinita:** No solo recuerda la charla actual. El asistente puede "memorizar" datos sobre ti que persisten para siempre.
*   **🤖 Sistema de Expertos Expandido:** Biblioteca de plantillas con +10 expertos preconfigurados (Cripto, CM, Redactor, Fitness, etc.).
*   **📈 Logs e Informes Avanzados:** Registro detallado de actividad, métricas de rendimiento y KPIs visuales en tiempo real.
*   **📚 Triple RAG (Retrieval-Augmented Generation):** Memoria vectorial persistente a nivel Global, por Experto y Tool RAG dinámico.
*   **🐚 Terminal Inteligente:** Integración nativa con **PowerShell (Windows)** y **Bash (Linux)** con control de seguridad.
*   **📅 Automatización CRON:** Programa tareas (reportes, recordatorios, monitoreo) directamente desde el chat.
*   **⚡ Arquitectura Moderna:** Migración a **Biome** para un desarrollo ultrarápido. Configuración simplificada (`config.json` opcional).
*   **📱 Multi-Canal Nativo:** Web UI premium (Glassmorphism) y bot de **Telegram** con menús interactivos (Inline Keyboards).

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
