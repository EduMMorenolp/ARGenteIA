import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { getConfig } from "../config/index.ts";
import type { Config } from "../config/index.ts";

// Proveedor detectado a partir del nombre del modelo
export type ModelProvider = "openai" | "anthropic";

export function detectProvider(modelKey: string): ModelProvider {
  if (modelKey.startsWith("anthropic/")) return "anthropic";
  return "openai"; // OpenAI y OpenRouter usan el mismo SDK
}

// Nombre del modelo limpio (sin prefijo proveedor)
export function modelName(modelKey: string): string {
  const parts = modelKey.split("/");
  // Para openrouter: "openrouter/meta-llama/llama-3.3-70b" → "meta-llama/llama-3.3-70b"
  if (modelKey.startsWith("openrouter/")) return parts.slice(1).join("/");
  // Para openai/gpt-4o → "gpt-4o"
  if (parts.length === 2) return parts[1];
  return modelKey;
}

// Crea el cliente correcto según el modelo activo
export function createClient(modelKey: string, config: Config): OpenAI | Anthropic {
  const provider = detectProvider(modelKey);
  const modelCfg = config.models[modelKey];
  if (!modelCfg) throw new Error(`Modelo "${modelKey}" no encontrado en config.models`);

  if (provider === "anthropic") {
    return new Anthropic({ apiKey: modelCfg.apiKey });
  }

  return new OpenAI({
    apiKey: modelCfg.apiKey,
    baseURL: modelCfg.baseUrl,
  });
}
