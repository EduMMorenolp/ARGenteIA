import { registerTool } from './index.ts';

export function registerWeatherTool(): void {
  registerTool({
    isEnabled: () => true, // Siempre habilitada por defecto
    spec: {
      type: 'function',
      function: {
        name: 'get_weather',
        description: 'Obtiene el clima actual o el pronóstico de una ubicación específica.',
        parameters: {
          type: 'object',
          properties: {
            location: {
              type: 'string',
              description: "Nombre de la ciudad o ubicación (ej: 'Buenos Aires', 'Madrid').",
            },
            forecast: {
              type: 'boolean',
              description:
                'Si es true, devuelve el pronóstico para los próximos 3 días. Si es false (por defecto), solo el clima actual.',
            },
          },
        },
      },
    },
    handler: async (args) => {
      const location = args['location'] ? encodeURIComponent(String(args['location'])) : '';
      const isForecast = args['forecast'] === true || String(args['forecast']) === 'true';

      const url = `https://wttr.in/${location}?format=j1`;

      try {
        const resp = await fetch(url, {
          headers: { 'User-Agent': 'AsistentePersonal/1.0' },
        });

        if (!resp.ok) {
          return `Error al conectar con el servicio de clima: ${resp.statusText}`;
        }

        const data = (await resp.json()) as Record<string, unknown>;
        const currentCondition = data.current_condition as Record<string, unknown>[] | undefined;
        if (!data || !currentCondition) {
          return `No se pudo encontrar información de clima para: "${args['location'] || 'tu ubicación actual'}"`;
        }

        const current = currentCondition[0] as Record<string, unknown>;
        const nearestArea = data.nearest_area as Record<string, unknown>[];
        const area = nearestArea[0] as Record<string, unknown>;

        const areaName = (area.areaName as Array<{ value: string }>)[0].value;
        const country = (area.country as Array<{ value: string }>)[0].value;
        let report = `Clima actual en ${areaName}, ${country}:\n`;
        report += `- Temperatura: ${current.temp_C}°C (Sensación: ${current.FeelsLikeC}°C)\n`;
        const langEs = current.lang_es as Array<{ value: string }> | undefined;
        const weatherDesc = (current.weatherDesc as Array<{ value: string }>)[0].value;
        report += `- Estado: ${langEs ? langEs[0].value : weatherDesc}\n`;
        report += `- Humedad: ${current.humidity}%\n`;
        report += `- Viento: ${current.windspeedKmph} km/h\n`;

        if (isForecast && data.weather) {
          report += `\nPRONÓSTICO PRÓXIMOS DÍAS:\n`;
          (data.weather as Record<string, unknown>[])
            .slice(0, 3)
            .forEach((day: Record<string, unknown>) => {
              report += `\n📅 Fecha: ${day.date}\n`;
              report += `   - Máx: ${day.maxtempC}°C / Mín: ${day.mintempC}°C\n`;
              report += `   - Estado: ${((day.hourly as Record<string, unknown>[])[4].weatherDesc as Array<{ value: string }>)[0].value}\n`; // 12:00 aprox
            });
        }

        return report;
      } catch (err: unknown) {
        return `Error al procesar la consulta del clima: ${err instanceof Error ? err.message : String(err)}`;
      }
    },
  });
}
