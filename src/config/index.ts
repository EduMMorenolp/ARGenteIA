import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";

// ─── Schemas ─────────────────────────────────────────────────────────────────

const ModelConfigSchema = z.object({
  apiKey: z.string(),
  baseUrl: z.url().optional(),
});

const AgentConfigSchema = z.object({
  model: z.string(),
  systemPrompt: z.string().default("Eres un asistente personal útil."),
  maxTokens: z.number().int().positive().default(4096),
  maxContextMessages: z.number().int().positive().default(40),
});

const GatewayConfigSchema = z.object({
  port: z.number().int().min(1024).max(65535).default(18000),
});

const TelegramConfigSchema = z.object({
  botToken: z.string(),
  allowFrom: z.array(z.string()).default([]),
});

const ToolsBashSchema = z.object({
  enabled: z.boolean().default(false),
  allowlist: z.array(z.string()).default([]),
});

const ToolsBasicSchema = z.object({
  enabled: z.boolean().default(false),
});

const ToolsConfigSchema = z.object({
  bash: ToolsBashSchema.default(() => ({ enabled: false, allowlist: [] })),
  webSearch: ToolsBasicSchema.default(() => ({ enabled: false })),
  readFile: ToolsBasicSchema.default(() => ({ enabled: false })),
  writeFile: ToolsBasicSchema.default(() => ({ enabled: false })),
  readUrl: ToolsBasicSchema.default(() => ({ enabled: false })),
});

const MemoryConfigSchema = z.object({
  dbPath: z.string().default("./assistant.db"),
  maxContextMessages: z.number().int().positive().default(40),
  compactAt: z.number().int().positive().default(60),
});

const ConfigSchema = z.object({
  agent: AgentConfigSchema,
  models: z.record(z.string(), ModelConfigSchema),
  gateway: GatewayConfigSchema.default(() => ({ port: 18000 })),
  channels: z
    .object({
      telegram: TelegramConfigSchema.optional(),
    })
    .default(() => ({})),
  tools: ToolsConfigSchema.default(() => ({
    bash: { enabled: false, allowlist: [] },
    webSearch: { enabled: false },
    readFile: { enabled: false },
    writeFile: { enabled: false },
    readUrl: { enabled: false },
  })),
  memory: MemoryConfigSchema.default(() => ({
    dbPath: "./assistant.db",
    maxContextMessages: 40,
    compactAt: 60,
  })),
});

export type Config = z.infer<typeof ConfigSchema>;
export type ModelConfig = z.infer<typeof ModelConfigSchema>;

// ─── Loader ──────────────────────────────────────────────────────────────────

let _config: Config | null = null;

export function loadConfig(configPath?: string): Config {
  if (_config) return _config;

  const path = configPath ?? resolve(process.cwd(), "config.json");

  if (!existsSync(path)) {
    console.error(`❌ No se encontró config.json en: ${path}`);
    console.error(`   Copiá config.example.json → config.json y completá tus credenciales.`);
    process.exit(1);
  }

  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(path, "utf-8"));
  } catch (err) {
    console.error(`❌ Error al parsear config.json:`, err);
    process.exit(1);
  }

  const result = ConfigSchema.safeParse(raw);
  if (!result.success) {
    console.error(`❌ Configuración inválida:`);
    for (const issue of result.error.issues) {
      console.error(`   ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
  }

  // Verificar que el modelo activo esté definido en models
  const { agent, models } = result.data;
  if (!models[agent.model]) {
    console.error(`❌ El modelo "${agent.model}" no está en la sección "models" de config.json`);
    process.exit(1);
  }

  _config = result.data;
  return _config;
}

export function getConfig(): Config {
  if (!_config) throw new Error("Config no inicializada. Llamá loadConfig() primero.");
  return _config;
}
