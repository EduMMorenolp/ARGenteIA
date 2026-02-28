import chalk from 'chalk';

export interface ModelCapabilities {
  supportsVision: boolean;
  supportsAudio: boolean;
  contextLength: number;
  description?: string;
  inputModalities: string[];
  outputModalities: string[];
  pricing?: { prompt: string; completion: string };
}

// Cache en memoria para evitar llamadas repetidas
const capabilitiesCache = new Map<string, ModelCapabilities>();

// Modelos conocidos con vision (heurística por nombre)
const VISION_PATTERNS = [
  'vision', 'vl', '4o', 'gpt-4o', 'llava', 'pixtral', 'gemini',
  'claude-3', 'claude-3.5', 'qwen-vl', 'qwen2-vl', 'qwen3-vl',
  'internvl', 'minicpm-v', 'bakllava',
];

const AUDIO_PATTERNS = ['whisper', 'audio', 'realtime'];

function detectCapabilitiesByName(modelName: string): ModelCapabilities {
  const lower = modelName.toLowerCase();
  const supportsVision = VISION_PATTERNS.some((p) => lower.includes(p));
  const supportsAudio = AUDIO_PATTERNS.some((p) => lower.includes(p));

  return {
    supportsVision,
    supportsAudio,
    contextLength: 4096,
    inputModalities: ['text', ...(supportsVision ? ['image'] : []), ...(supportsAudio ? ['audio'] : [])],
    outputModalities: ['text'],
  };
}

/**
 * Obtiene las capacidades de un modelo.
 * Para OpenRouter: consulta la API. Para otros: usa heurísticas.
 */
export async function fetchModelCapabilities(
  modelKey: string,
  baseUrl?: string,
  apiKey?: string,
): Promise<ModelCapabilities> {
  // Retornar del cache si existe
  if (capabilitiesCache.has(modelKey)) {
    return capabilitiesCache.get(modelKey)!;
  }

  let result: ModelCapabilities;

  if (modelKey.startsWith('openrouter/')) {
    result = await fetchOpenRouterInfo(modelKey, apiKey);
  } else {
    result = detectCapabilitiesByName(modelKey);
  }

  capabilitiesCache.set(modelKey, result);
  return result;
}

async function fetchOpenRouterInfo(modelKey: string, apiKey?: string): Promise<ModelCapabilities> {
  // El id en OpenRouter es sin el prefijo "openrouter/"
  const modelId = modelKey.replace(/^openrouter\//, '');

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    const res = await fetch('https://openrouter.ai/api/v1/models', { headers });
    if (!res.ok) throw new Error(`OpenRouter API error: ${res.statusText}`);

    const data = (await res.json()) as {
      data: Array<{
        id: string;
        name: string;
        description?: string;
        context_length?: number;
        architecture?: {
          modality?: string;
          input_modalities?: string[];
          output_modalities?: string[];
        };
        pricing?: {
          prompt?: string;
          completion?: string;
        };
      }>;
    };

    const model = data.data.find(
      (m) => m.id === modelId || m.id === modelKey,
    );

    if (!model) {
      console.log(chalk.yellow(`⚠️ Modelo ${modelId} no encontrado en OpenRouter, usando heurísticas`));
      return detectCapabilitiesByName(modelKey);
    }

    const inputMods = model.architecture?.input_modalities || ['text'];
    const outputMods = model.architecture?.output_modalities || ['text'];

    return {
      supportsVision: inputMods.includes('image'),
      supportsAudio: inputMods.includes('audio'),
      contextLength: model.context_length || 4096,
      description: model.description,
      inputModalities: inputMods,
      outputModalities: outputMods,
      pricing: model.pricing
        ? {
            prompt: model.pricing.prompt || '0',
            completion: model.pricing.completion || '0',
          }
        : undefined,
    };
  } catch (err) {
    console.error(chalk.red('❌ Error consultando OpenRouter:'), err);
    return detectCapabilitiesByName(modelKey);
  }
}
