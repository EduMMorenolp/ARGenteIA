import { registerTool } from "./index.ts";

export function registerWeatherTool(): void {
  registerTool({
    isEnabled: () => true, // Siempre habilitada por defecto
    spec: {
      type: "function",
      function: {
        name: "get_weather",
        description: "Obtiene el clima actual de una ubicación específica. Puedes pasar la ciudad, país o dejarlo vacío para detectar por IP.",
        parameters: {
          type: "object",
          properties: {
            location: {
              type: "string",
              description: "Nombre de la ciudad o ubicación (ej: 'Buenos Aires', 'Madrid', 'Paris'). Si el usuario no especifica, deja este campo vacío.",
            },
          },
        },
      },
    },
    handler: async (args) => {
      const location = args["location"] ? encodeURIComponent(String(args["location"])) : "";
      const url = `https://wttr.in/${location}?format=%l:+%c+%t+%w+%h`;

      try {
        const resp = await fetch(url, {
          headers: { "User-Agent": "AsistentePersonal/1.0" },
        });

        if (!resp.ok) {
          return `Error al conectar con el servicio de clima: ${resp.statusText}`;
        }

        const data = await resp.text();
        if (!data || data.includes("404")) {
          return `No se pudo encontrar información de clima para: "${args["location"] || "tu ubicación actual"}"`;
        }

        return `Reporte del clima:\n${data}\n\nNota: Datos proporcionados por wttr.in`;
      } catch (err: any) {
        return `Error al procesar la consulta del clima: ${err.message}`;
      }
    },
  });
}
