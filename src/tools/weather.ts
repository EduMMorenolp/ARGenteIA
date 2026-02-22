import { registerTool } from "./index.ts";

export function registerWeatherTool(): void {
  registerTool({
    isEnabled: () => true, // Siempre habilitada por defecto
    spec: {
      type: "function",
      function: {
        name: "get_weather",
        description: "Obtiene el clima actual o el pronóstico de una ubicación específica.",
        parameters: {
          type: "object",
          properties: {
            location: {
              type: "string",
              description: "Nombre de la ciudad o ubicación (ej: 'Buenos Aires', 'Madrid').",
            },
            forecast: {
              type: "boolean",
              description: "Si es true, devuelve el pronóstico para los próximos 3 días. Si es false (por defecto), solo el clima actual.",
            }
          },
        },
      },
    },
    handler: async (args) => {
      const location = args["location"] ? encodeURIComponent(String(args["location"])) : "";
      const isForecast = args["forecast"] === true || String(args["forecast"]) === "true";
      
      const url = `https://wttr.in/${location}?format=j1`;

      try {
        const resp = await fetch(url, {
          headers: { "User-Agent": "AsistentePersonal/1.0" },
        });

        if (!resp.ok) {
          return `Error al conectar con el servicio de clima: ${resp.statusText}`;
        }

        const data = await resp.json() as any;
        if (!data || !data.current_condition) {
          return `No se pudo encontrar información de clima para: "${args["location"] || "tu ubicación actual"}"`;
        }

        const current = data.current_condition[0];
        const area = data.nearest_area[0];
        
        let report = `Clima actual en ${area.areaName[0].value}, ${area.country[0].value}:\n`;
        report += `- Temperatura: ${current.temp_C}°C (Sensación: ${current.FeelsLikeC}°C)\n`;
        report += `- Estado: ${current.lang_es ? current.lang_es[0].value : current.weatherDesc[0].value}\n`;
        report += `- Humedad: ${current.humidity}%\n`;
        report += `- Viento: ${current.windspeedKmph} km/h\n`;

        if (isForecast && data.weather) {
          report += `\nPRONÓSTICO PRÓXIMOS DÍAS:\n`;
          data.weather.slice(0, 3).forEach((day: any) => {
            report += `\n📅 Fecha: ${day.date}\n`;
            report += `   - Máx: ${day.maxtempC}°C / Mín: ${day.mintempC}°C\n`;
            report += `   - Estado: ${day.hourly[4].weatherDesc[0].value}\n`; // 12:00 aprox
          });
        }

        return report;
      } catch (err: any) {
        return `Error al procesar la consulta del clima: ${err.message}`;
      }
    },
  });
}
