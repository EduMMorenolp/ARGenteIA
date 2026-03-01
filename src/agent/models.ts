import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import type { Config } from '../config/index.ts';
import { getModel } from '../memory/model-db.ts';

// Proveedor detectado a partir del nombre del modelo
export type ModelProvider = 'openai' | 'anthropic' | 'ollama';

export function detectProvider(modelKey: string): ModelProvider {
  if (modelKey.startsWith('anthropic/')) return 'anthropic';
  if (modelKey.startsWith('ollama/')) return 'ollama';
  return 'openai'; // OpenAI y OpenRouter usan el mismo SDK
}

// Nombre del modelo limpio (sin prefijo proveedor)
export function modelName(modelKey: string): string {
  // Para openrouter: "openrouter/meta-llama/llama-3.3-70b" → "meta-llama/llama-3.3-70b"
  if (modelKey.startsWith('openrouter/')) return modelKey.slice('openrouter/'.length);
  // Para ollama: "ollama/llama3" → "llama3"
  if (modelKey.startsWith('ollama/')) return modelKey.slice('ollama/'.length);
  // Todo lo demás se deja intacto (ej: "qwen/qwen3-vl-235b-a22b-thinking", "gpt-4o")
  return modelKey;
}

// Crea el cliente correcto según el modelo activo
export function createClient(modelKey: string, config: Config): OpenAI | Anthropic {
  const provider = detectProvider(modelKey);

  // 1. Buscar en la DB primero
  let apiKey: string | undefined;
  let baseUrl: string | undefined;

  try {
    const dbModel = getModel(modelKey);
    if (dbModel) {
      apiKey = dbModel.apiKey || undefined;
      baseUrl = dbModel.baseUrl || undefined;
    }
  } catch {
    // DB no disponible aún, usar config
  }

  // 2. Fallback a config.json (buscar key exacta y también con prefijo openrouter/)
  if (!apiKey || !baseUrl) {
    const modelCfg = config.models[modelKey] || config.models[`openrouter/${modelKey}`];
    if (modelCfg) {
      if (!apiKey) apiKey = modelCfg.apiKey;
      if (!baseUrl) baseUrl = modelCfg.baseUrl;
    }
  }

  // 3. Si aún no tenemos apiKey y el modelo parece de OpenRouter, buscar key de otro modelo OR
  if (!apiKey && (baseUrl?.includes('openrouter.ai') || modelKey.startsWith('openrouter/'))) {
    const orConfigKey = Object.keys(config.models).find(
      (k) => k.startsWith('openrouter/') && config.models[k].apiKey,
    );
    if (orConfigKey) {
      apiKey = config.models[orConfigKey].apiKey;
      if (!baseUrl) baseUrl = config.models[orConfigKey].baseUrl;
    }
  }

  // 4. Si es Ollama y aún no tenemos config, buscar baseUrl de otro modelo Ollama
  if (!apiKey && !baseUrl && provider === 'ollama') {
    const otherOllamaKey = Object.keys(config.models).find((k) => k.startsWith('ollama/'));
    baseUrl = config.models[otherOllamaKey || '']?.baseUrl || 'http://localhost:11434/v1';
    apiKey = 'ollama';
  }

  if (!apiKey && !baseUrl)
    throw new Error(`Modelo "${modelKey}" no encontrado en DB ni en config.models`);

  if (provider === 'anthropic') {
    return new Anthropic({ apiKey: apiKey || '' });
  }

  // Ollama y OpenRouter son compatibles con el SDK de OpenAI
  return new OpenAI({
    apiKey: apiKey || 'ollama',
    baseURL: baseUrl,
  });
}

/**
 * Obtiene la lista de modelos disponibles en la instancia local de Ollama.
 * Intenta usar el baseUrl configurado para cualquier modelo que empiece con "ollama/"
 */
export async function getOllamaModels(config: Config): Promise<string[]> {
  // Buscar cualquier configuración de ollama para obtener el baseUrl
  const ollamaKey = Object.keys(config.models).find((k) => k.startsWith('ollama/'));
  const baseUrl = config.models[ollamaKey || '']?.baseUrl || 'http://localhost:11434/v1';

  // Ollama API para tags es /api/tags, transformamos baseUrl si termina en /v1
  const apiUrl = baseUrl.replace(/\/v1\/?$/, '') + '/api/tags';

  try {
    const res = await fetch(apiUrl);
    if (!res.ok) throw new Error(`Ollama error: ${res.statusText}`);
    const data = (await res.json()) as { models: { name: string }[] };
    return data.models.map((m) => m.name);
  } catch (err) {
    console.error('❌ Error conectando con Ollama:', err);
    return [];
  }
}
