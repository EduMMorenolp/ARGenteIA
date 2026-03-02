import { getDb } from './db.ts';
import { cosineSimilarity, generateEmbedding } from '../embeddings/provider.ts';

export interface DocumentChunk {
  id: number;
  owner_id: string;
  text_content: string;
  embedding: number[];
  source?: string;
  created_at?: string;
}

export async function addDocumentChunk(owner_id: string, text_content: string, source: string = 'manual'): Promise<number> {
  const db = getDb();
  const embedding = await generateEmbedding(text_content);
  
  const stmt = db.prepare(`
    INSERT INTO document_chunks (owner_id, text_content, embedding, source)
    VALUES (?, ?, ?, ?)
  `);
  
  const info = stmt.run(
    owner_id,
    text_content,
    JSON.stringify(embedding),
    source
  );
  
  return info.lastInsertRowid as number;
}

export async function searchSimilarChunks(query: string, owner_ids: string[], limit: number = 3): Promise<DocumentChunk[]> {
  const queryEmbedding = await generateEmbedding(query);
  if (!queryEmbedding || queryEmbedding.length === 0) return [];

  const db = getDb();
  
  // Prepare IN clause dynamically
  const placeholders = owner_ids.map(() => '?').join(',');
  const sql = `SELECT * FROM document_chunks WHERE owner_id IN (${placeholders})`;
  
  const rows = db.prepare(sql).all(...owner_ids) as any[];

  // Deserialize and calculate similarity
  const chunksWithScores = rows.map(row => {
    let embedding: number[] = [];
    try {
      embedding = JSON.parse(row.embedding);
    } catch(e) {}

    const score = cosineSimilarity(queryEmbedding, embedding);
    return {
      chunk: {
        id: row.id,
        owner_id: row.owner_id,
        text_content: row.text_content,
        embedding,
        source: row.source,
        created_at: row.created_at
      },
      score
    };
  });

  // Sort descending by score
  chunksWithScores.sort((a, b) => b.score - a.score);

  // Return top K
  return chunksWithScores.slice(0, limit).map(c => c.chunk);
}

export function deleteChunk(id: number, owner_id: string): boolean {
  const db = getDb();
  const stmt = db.prepare('DELETE FROM document_chunks WHERE id = ? AND owner_id = ?');
  const info = stmt.run(id, owner_id);
  return info.changes > 0;
}
