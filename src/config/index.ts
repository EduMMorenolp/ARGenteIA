import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import JSON5 from "json5";
import chalk from "chalk";

// ─── Schemas ─────────────────────────────────────────────────────────────────

const ModelConfigSchema = z.object({
  apiKey: z.string().optional(),
  baseUrl: z.string().url().optional(),
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
  os: z.enum(["windows", "linux"]).default("linux"),
  psExe: z.string().optional(),
});

const ToolsBasicSchema = z.object({
  enabled: z.boolean().default(false),
});

const ToolsConfigSchema = z.object({
  bash: ToolsBashSchema.default(() => ({
    enabled: false,
    allowlist: [],
    os: "linux" as const,
  })),
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
    bash: { enabled: false, allowlist: [], os: "linux" as const },
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
    console.error(chalk.red(`❌ No se encontró config.json en: ${path}`));
    console.error(
      chalk.yellow(
        `   Copiá config.example.json → config.json y completá tus credenciales.`,
      ),
    );
    process.exit(1);
  }

  const content = readFileSync(path, "utf-8").trim();

  if (!content) {
    console.error(chalk.red(`❌ El archivo config.json está vacío.`));
    console.error(
      chalk.yellow(
        `   Por favor, configurá tu modelo y API keys antes de continuar.`,
      ),
    );
    process.exit(1);
  }

  let raw: unknown;
  try {
    raw = JSON5.parse(content);
  } catch (err: any) {
    console.error(chalk.red(`❌ Error de sintaxis en config.json:`));
    console.error(chalk.white(`   ${err.message}`));
    process.exit(1);
  }

  const result = ConfigSchema.safeParse(raw);
  if (!result.success) {
    console.error(chalk.red(`❌ Configuración inválida en config.json:`));
    for (const issue of result.error.issues) {
      const pathStr = issue.path.join(".");
      console.error(
        chalk.yellow(`   • [${pathStr || "root"}]: ${issue.message}`),
      );
    }
    process.exit(1);
  }

  // Verificar que el modelo activo esté definido en models
  const { agent, models } = result.data;
  if (!models[agent.model]) {
    console.error(
      chalk.red(
        `❌ Error: El modelo "${agent.model}" no está definido en la sección "models".`,
      ),
    );
    console.error(
      chalk.yellow(
        `   Modelos configurados: ${Object.keys(models).join(", ") || "ninguno"}`,
      ),
    );
    process.exit(1);
  }

  // Verificar si hay API keys con placeholders
  for (const [name, cfg] of Object.entries(models) as [string, ModelConfig][]) {
    if (
      cfg.apiKey &&
      (cfg.apiKey.includes("...") || cfg.apiKey.startsWith("tu_"))
    ) {
      console.warn(
        chalk.magenta(
          `⚠️  Advertencia: La API Key para "${name}" parece ser un placeholder.`,
        ),
      );
    }
  }

  _config = result.data;
  return _config;
}

export function getConfig(): Config {
  if (!_config)
    throw new Error("Config no inicializada. Llamá loadConfig() primero.");
  return _config;
}
