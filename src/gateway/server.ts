import http from "node:http";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import express from "express";
import { WebSocketServer, WebSocket } from "ws";
import chalk from "chalk";
import { getConfig } from "../config/index.ts";
import { handleWebChatMessage } from "../channels/webchat.ts";
import type { WsMessage } from "./protocol.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface GatewayServer {
  httpServer: http.Server;
  wss: WebSocketServer;
  start: () => Promise<void>;
}

export function createGateway(): GatewayServer {
  const config = getConfig();
  const app = express();
  const httpServer = http.createServer(app);
  const wss = new WebSocketServer({ server: httpServer });

  // ─── Servir WebChat UI estática ────────────────────────────────────────────
  const uiPath = join(__dirname, "../../ui");
  app.use(express.static(uiPath));
  app.use(express.json());

  // Health check
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", model: config.agent.model });
  });

  // ─── WebSocket ─────────────────────────────────────────────────────────────
  wss.on("connection", (ws: WebSocket) => {
    const sessionId = `webchat-${Date.now()}`;
    console.log(chalk.cyan(`🌐 WebChat conectado [${sessionId}]`));

    // Enviar estado inicial
    send(ws, {
      type: "status",
      model: config.agent.model,
      sessionId,
      messageCount: 0,
    });

    ws.on("message", async (data) => {
      let msg: WsMessage;
      try {
        msg = JSON.parse(data.toString()) as WsMessage;
      } catch {
        send(ws, { type: "error", message: "Mensaje inválido (JSON malformado)" });
        return;
      }

      if (msg.type === "user_message") {
        await handleWebChatMessage({
          ws,
          sessionId,
          text: msg.text,
          send,
        });
      }
    });

    ws.on("close", () => {
      console.log(chalk.gray(`🌐 WebChat desconectado [${sessionId}]`));
    });

    ws.on("error", (err) => {
      console.error(chalk.red("❌ WS error:"), err.message);
    });
  });

  // ─── Start ─────────────────────────────────────────────────────────────────
  const start = (): Promise<void> =>
    new Promise((resolve) => {
      httpServer.listen(config.gateway.port, () => {
        console.log(chalk.green(`\n🤖 Asistente Personal IA`));
        console.log(chalk.dim(`   Gateway: `) + chalk.white(`http://localhost:${config.gateway.port}`));
        console.log(chalk.dim(`   WebChat: `) + chalk.white(`http://localhost:${config.gateway.port}`));
        console.log(chalk.dim(`   Modelo:  `) + chalk.white(config.agent.model));
        console.log();
        resolve();
      });
    });

  return { httpServer, wss, start };
}

// Helper para enviar mensajes WS de forma segura
export function send(ws: WebSocket, msg: WsMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}
