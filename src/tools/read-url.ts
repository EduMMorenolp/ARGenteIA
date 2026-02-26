import { parse } from 'node-html-parser';
import type { Config } from '../config/index.ts';
import { registerTool } from './index.ts';

export function registerReadUrl(config: Config): void {
  registerTool({
    isEnabled: () => config.tools.readUrl.enabled,
    spec: {
      type: 'function',
      function: {
        name: 'read_url',
        description:
          'Descarga una URL y extrae su contenido como texto plano. Úsalo para leer artículos, documentación, páginas web, etc.',
        parameters: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'La URL a leer',
            },
          },
          required: ['url'],
        },
      },
    },
    handler: async (args, _context) => {
      const url = String(args['url'] ?? '');

      try {
        const resp = await fetch(url, {
          headers: {
            'User-Agent': 'AsistentePersonal/1.0',
            Accept: 'text/html,text/plain',
          },
          signal: AbortSignal.timeout(15000),
        });

        const contentType = resp.headers.get('content-type') ?? '';
        const isHtml = contentType.includes('html');

        const rawText = await resp.text();

        let text: string;
        if (isHtml) {
          const root = parse(rawText);
          // Eliminar scripts, estilos y nav que no aportan contenido
          root
            .querySelectorAll('script, style, nav, header, footer, aside')
            .forEach((el) => el.remove());
          text = root.structuredText.replace(/\n{3,}/g, '\n\n').trim();
        } else {
          text = rawText.trim();
        }

        // Limitar a ~4000 caracteres para no saturar el contexto
        const MAX = 4000;
        const truncated =
          text.length > MAX ? text.slice(0, MAX) + '\n\n[... contenido truncado]' : text;

        return `**Contenido de ${url}:**\n\n${truncated}`;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return `Error al leer "${url}": ${msg}`;
      }
    },
  });
}
