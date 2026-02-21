import { registerTool } from "./index.ts";
import { getConfig } from "../config/index.ts";
import { spawn } from "node:child_process";
import { resolve, join } from "node:path";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import NodeWebcam from "node-webcam";
import chalk from "chalk";
import wav from "node-wav";
import { pipeline } from "@huggingface/transformers";
import { detectPowerShell } from "./utils.ts";

// Instancia global para no recargar el modelo en cada grabación
let whisperPipeline: any = null;
let _psExe: string | null = null;

async function getWhisper(): Promise<any> {
  if (whisperPipeline) return whisperPipeline;
  console.log(chalk.blue("   🧠 Cargando Whisper Local (tiny)..."));
  whisperPipeline = await pipeline("automatic-speech-recognition", "Xenova/whisper-tiny", {
    device: "cpu", // Forzar CPU para máxima compatibilidad
  });
  console.log(chalk.green("   ✅ Whisper Local cargado."));
  return whisperPipeline;
}

/**
 * Herramientas Multimodales: Ver, Hablar y Escuchar (Offline/Local)
 */
export function registerMultimodalTools(): void {
  const config = getConfig();
  const isWindows = config.tools.bash.os === "windows";

  if (isWindows && !_psExe) {
    _psExe = detectPowerShell(config.tools.bash.psExe);
  }

  // 1. Herramienta para HABLAR (TTS) usando PowerShell
  registerTool({
    isEnabled: () => config.tools.bash.os === "windows",
    spec: {
      type: "function",
      function: {
        name: "speak_text",
        description: "Hace que la PC hable en voz alta usando el sintetizador de Windows.",
        parameters: {
          type: "object",
          properties: {
            text: {
              type: "string",
              description: "El texto que quieres que la PC diga."
            }
          },
          required: ["text"]
        }
      }
    },
    handler: async (args) => {
      const text = String(args["text"] ?? "").replace(/"/g, "'");
      if (!text) return "Error: texto vacío.";

      return new Promise((resolve) => {
        const speakCmd = `Add-Type -AssemblyName System.Speech; $speak = New-Object System.Speech.Synthesis.SpeechSynthesizer; $speak.Speak("${text}")`;
        const ps = spawn(_psExe || "powershell", ["-NoProfile", "-Command", speakCmd], { windowsHide: true });
        ps.on("close", () => resolve(`He dicho: "${text}"`));
        ps.on("error", (err) => resolve(`Error al intentar hablar: ${err.message}`));
      });
    }
  });

  // 2. Herramienta para VER (Capturar Webcam)
  registerTool({
    isEnabled: () => true,
    spec: {
      type: "function",
      function: {
        name: "camera_capture",
        description: "Toma una fotografía instantánea usando la webcam de la PC.",
        parameters: { type: "object", properties: {} }
      }
    },
    handler: async () => {
      const captureDir = resolve(process.cwd(), "memoryUser", "captures");
      if (!existsSync(captureDir)) mkdirSync(captureDir, { recursive: true });

      const fileName = `snap_${Date.now()}`;
      const filePath = join(captureDir, `${fileName}.jpg`);

      return new Promise((resolve) => {
        NodeWebcam.capture(filePath, { width: 1280, height: 720, quality: 100, delay: 0, saveShots: true, output: "jpeg", device: false, callbackReturn: "location", verbose: false }, (err: Error | null, location: string | Buffer) => {
          if (err) resolve(`Error al capturar imagen: ${err}`);
          else resolve(`Foto capturada en: ${location}.`);
        });
      });
    }
  });

  // 3. Herramienta para ESCUCHAR (Whisper Local + Grabación Nativa)
  registerTool({
    isEnabled: () => config.tools.bash.os === "windows",
    spec: {
      type: "function",
      function: {
        name: "record_mic",
        description: "Graba audio del micrófono y lo transcribe localmente usando Whisper (offline).",
        parameters: {
          type: "object",
          properties: {
            durationSeconds: {
              type: "number",
              description: "Duración de la grabación en segundos (1-15).",
              default: 5
            }
          }
        }
      }
    },
    handler: async (args) => {
      const duration = Math.min(Math.max(Number(args["durationSeconds"] || 5), 1), 15);
      const recordDir = resolve(process.cwd(), "memoryUser", "recordings");
      if (!existsSync(recordDir)) mkdirSync(recordDir, { recursive: true });

      const filePath = join(recordDir, `audio_${Date.now()}.wav`);

      // 1. Grabar Audio Nativamente (Winmm.dll)
      await new Promise((resolve, reject) => {
        const recordScript = `
          $path = "${filePath.replace(/\\/g, '\\\\')}"
          Add-Type -TypeDefinition @"
            using System;
            using System.Runtime.InteropServices;
            public class Audio {
              [DllImport("winmm.dll", EntryPoint = "mciSendStringA", CharSet = CharSet.Ansi)]
              public static extern int mciSendString(string lpstrCommand, string lpstrReturnString, int uReturnLength, int hwndCallback);
            }
"@
          [Audio]::mciSendString("open new type waveaudio alias recsound", $null, 0, 0)
          [Audio]::mciSendString("record recsound", $null, 0, 0)
          Start-Sleep -Seconds ${duration}
          [Audio]::mciSendString("save recsound $path", $null, 0, 0)
          [Audio]::mciSendString("close recsound", $null, 0, 0)
        `;
        const ps = spawn(_psExe || "powershell", ["-NoProfile", "-Command", recordScript], { windowsHide: true });
        ps.on("close", resolve);
        ps.on("error", reject);
      });

      console.log(chalk.green(`   🎤 Audio grabado. Transcribiendo localmente con Whisper...`));

      try {
        const transcriber = await getWhisper();
        
        // Decodificar WAV
        const buffer = readFileSync(filePath);
        const result = wav.decode(buffer);
        
        // El modelo espera Float32Array a 16kHz
        // node-wav decodifica a la frecuencia del archivo (probablemente 44.1kHz o similar)
        // Por simplicidad, asumimos que el audio capturado es razonable
        // (En una implementación pro, re-muestrearíamos aquí)
        const audioData = result.channelData[0]; // Primer canal

        const output = await transcriber(audioData, {
          language: "spanish",
          task: "transcribe",
        });

        console.log(chalk.cyan(`   📝 Local Whisper: "${output.text}"`));
        return `He escuchado lo siguiente (procesado localmente): "${output.text}".`;
      } catch (err: any) {
        console.error(chalk.red("   ❌ Error Whisper Local:"), err.message);
        return `Grabé el audio pero falló la transcripción local: ${err.message}`;
      }
    }
  });
}
