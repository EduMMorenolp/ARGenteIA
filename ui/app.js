// ─── WebSocket Client ─────────────────────────────────────────────────────────

const WS_URL = `ws://${location.host}`;

let ws = null;
let messageCount = 0;
let isWaiting = false;

// DOM refs
const messagesEl = document.getElementById("messages");
const formEl = document.getElementById("chat-form");
const inputEl = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const typingEl = document.getElementById("typing");
const modelNameEl = document.getElementById("model-name");
const connStatusEl = document.getElementById("conn-status");
const connDotEl = connStatusEl.querySelector(".status-dot");
const connTextEl = connStatusEl.querySelector(".status-text");
const msgCountEl = document.getElementById("msg-count");

// Configurar marked.js
if (window.marked) {
    marked.setOptions({ breaks: true, gfm: true });
}

// ─── Conexión WebSocket ────────────────────────────────────────────────────────

function connect() {
    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
        setConnected(true);
    };

    ws.onclose = () => {
        setConnected(false);
        setTimeout(connect, 3000); // reconectar automáticamente
    };

    ws.onerror = () => {
        setConnected(false);
    };

    ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        handleServerMessage(msg);
    };
}

function setConnected(connected) {
    connDotEl.classList.toggle("connected", connected);
    connTextEl.textContent = connected ? "Conectado" : "Desconectado";
    sendBtn.disabled = !connected;
}

// ─── Manejo de mensajes del servidor ──────────────────────────────────────────

function handleServerMessage(msg) {
    switch (msg.type) {
        case "status":
            modelNameEl.textContent = msg.model || "–";
            msgCountEl.textContent = `${msg.messageCount} mensajes`;
            break;

        case "typing":
            setTyping(msg.isTyping);
            break;

        case "assistant_message":
            setTyping(false);
            isWaiting = false;
            addMessage("assistant", msg.text, msg.model);
            messageCount++;
            msgCountEl.textContent = `${messageCount} mensajes`;
            enableInput();
            break;

        case "command_result":
            setTyping(false);
            isWaiting = false;
            addCommandResult(msg.command, msg.result);
            enableInput();
            break;

        case "error":
            setTyping(false);
            isWaiting = false;
            addErrorMessage(msg.message);
            enableInput();
            break;
    }
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

function setTyping(show) {
    typingEl.style.display = show ? "flex" : "none";
}

function enableInput() {
    inputEl.disabled = false;
    sendBtn.disabled = false;
    inputEl.focus();
}

function disableInput() {
    inputEl.disabled = true;
    sendBtn.disabled = true;
}

function clearWelcome() {
    const welcome = messagesEl.querySelector(".welcome-msg");
    if (welcome) welcome.remove();
}

function addMessage(role, text, model = "") {
    clearWelcome();
    const wrap = document.createElement("div");
    wrap.className = `message ${role}`;

    const avatar = document.createElement("div");
    avatar.className = "msg-avatar";
    avatar.textContent = role === "user" ? "👤" : "🤖";

    const bubble = document.createElement("div");
    bubble.className = "msg-bubble";

    if (role === "assistant" && model) {
        const meta = document.createElement("div");
        meta.className = "msg-meta";
        meta.textContent = model;
        bubble.appendChild(meta);
    }

    const content = document.createElement("div");
    content.className = "msg-content";

    if (role === "assistant" && window.marked) {
        content.innerHTML = marked.parse(text);
    } else {
        content.textContent = text;
    }

    bubble.appendChild(content);
    wrap.appendChild(avatar);
    wrap.appendChild(bubble);
    messagesEl.appendChild(wrap);
    scrollToBottom();
}

function addCommandResult(command, result) {
    clearWelcome();
    const wrap = document.createElement("div");
    wrap.className = "message assistant";

    const avatar = document.createElement("div");
    avatar.className = "msg-avatar";
    avatar.textContent = "⚙️";

    const bubble = document.createElement("div");
    bubble.className = "msg-bubble command";

    const content = document.createElement("div");
    content.className = "msg-content";
    if (window.marked) {
        content.innerHTML = marked.parse(result);
    } else {
        content.textContent = result;
    }

    bubble.appendChild(content);
    wrap.appendChild(avatar);
    wrap.appendChild(bubble);
    messagesEl.appendChild(wrap);
    scrollToBottom();
}

function addErrorMessage(message) {
    clearWelcome();
    const wrap = document.createElement("div");
    wrap.className = "message assistant";

    const avatar = document.createElement("div");
    avatar.className = "msg-avatar";
    avatar.textContent = "❌";

    const bubble = document.createElement("div");
    bubble.className = "msg-bubble error";
    bubble.textContent = message;

    wrap.appendChild(avatar);
    wrap.appendChild(bubble);
    messagesEl.appendChild(wrap);
    scrollToBottom();
}

function scrollToBottom() {
    messagesEl.scrollTo({ top: messagesEl.scrollHeight, behavior: "smooth" });
}

// ─── Envío de mensajes ────────────────────────────────────────────────────────

function sendMessage(text) {
    if (!text.trim() || !ws || ws.readyState !== WebSocket.OPEN) return;

    addMessage("user", text);
    messageCount++;
    msgCountEl.textContent = `${messageCount} mensajes`;

    ws.send(JSON.stringify({ type: "user_message", text }));
    isWaiting = true;
    disableInput();
    setTyping(true);
}

// Formulario
formEl.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = inputEl.value.trim();
    if (!text || isWaiting) return;
    inputEl.value = "";
    autoResize();
    sendMessage(text);
});

// Enter para enviar, Shift+Enter para nueva línea
inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        formEl.dispatchEvent(new Event("submit"));
    }
});

// Auto-resize del textarea
function autoResize() {
    inputEl.style.height = "auto";
    inputEl.style.height = Math.min(inputEl.scrollHeight, 200) + "px";
}
inputEl.addEventListener("input", autoResize);

// ─── Botones de comandos rápidos ──────────────────────────────────────────────
document.querySelectorAll(".cmd-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
        const cmd = btn.dataset.cmd;
        if (!cmd || isWaiting) return;
        sendMessage(cmd);
    });
});

// ─── Iniciar ──────────────────────────────────────────────────────────────────
connect();
inputEl.focus();
