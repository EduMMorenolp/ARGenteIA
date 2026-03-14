import { getConfig } from '../config/index.ts';

// We implement an in-memory cosine similarity search to avoid compiling SQLite vector extensions
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function generateEmbedding(text: string): Promise<number[]> {
  // First try Ollama locally (cheap, fast, unlimited)
  try {
    const res = await fetch('http://localhost:11434/api/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'nomic-embed-text', // Or 'mxbai-embed-large' 
        prompt: text
      })
    });
    
    if (res.ok) {
        const body = await res.json() as { embedding: number[] };
        if (body.embedding && body.embedding.length > 0) {
            return body.embedding;
        }
    }
  } catch (err) {
      // Ignore and fallback
  }

  // Fallback to OpenAI API (via OpenRouter or direct)
  const config = getConfig();
  let apiKey = '';
  let baseUrl = 'https://api.openai.com/v1';

  // Try to find a model with an API key
  for (const modelKey of Object.keys(config.models)) {
        if (config.models[modelKey].apiKey) {
            apiKey = config.models[modelKey].apiKey as string;
            baseUrl = config.models[modelKey].baseUrl || baseUrl;
            break;
        }
  }

  if (!apiKey) {
      console.warn("⚠️ No API keys found and Ollama unreachable. Cannot embed text.");
      return [];
  }

  try {
      const res = await fetch(`${baseUrl.replace(/\/$/, '')}/embeddings`, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
              input: text,
              model: 'text-embedding-3-small' // standard fallback
          })
      });

      if (res.ok) {
          const body = await res.json() as any;
          if (body.data && body.data.length > 0) {
              return body.data[0].embedding;
          }
      }
  } catch(err) {
      console.error("Embedding generation failed completely:", err);
  }

  return [];
}
