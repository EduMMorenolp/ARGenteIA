import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import type { Config } from '../config/index.ts';

// Proveedor detectado a partir del nombre del modelo
export type ModelProvider = 'openai' | 'anthropic' | 'ollama';

export function detectProvider(modelKey: string): ModelProvider {
  if (modelKey.startsWith('anthropic/')) return 'anthropic';
  if (modelKey.startsWith('ollama/')) return 'ollama';
  return 'openai'; // OpenAI y OpenRouter usan el mismo SDK
}

// Nombre del modelo limpio (sin prefijo proveedor)
export function modelName(modelKey: string): string {
  const parts = modelKey.split('/');
  // Para openrouter: "openrouter/meta-llama/llama-3.3-70b" → "meta-llama/llama-3.3-70b"
  if (modelKey.startsWith('openrouter/')) return parts.slice(1).join('/');
  // Para ollama/llama3 -> "llama3" o gpt-4o -> "gpt-4o"
  if (parts.length === 2) return parts[1];
  return modelKey;
}

// Crea el cliente correcto según el modelo activo
export function createClient(modelKey: string, config: Config): OpenAI | Anthropic {
  const provider = detectProvider(modelKey);
  let modelCfg = config.models[modelKey];

  // Si el modelo no está en config pero es de Ollama, intentamos ser dinámicos
  if (!modelCfg && provider === 'ollama') {
    // Buscamos si hay alguna otra entrada de ollama para copiar el baseUrl
    const otherOllamaKey = Object.keys(config.models).find((k) => k.startsWith('ollama/'));
    const baseUrl = config.models[otherOllamaKey || '']?.baseUrl || 'http://localhost:11434/v1';

    modelCfg = {
      apiKey: 'ollama',
      baseUrl: baseUrl,
    };
  }

  if (!modelCfg) throw new Error(`Modelo "${modelKey}" no encontrado en config.models`);

  if (provider === 'anthropic') {
    return new Anthropic({ apiKey: modelCfg.apiKey || '' });
  }

  // Ollama y OpenRouter son compatibles con el SDK de OpenAI
  return new OpenAI({
    apiKey: modelCfg.apiKey || 'ollama',
    baseURL: modelCfg.baseUrl,
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
