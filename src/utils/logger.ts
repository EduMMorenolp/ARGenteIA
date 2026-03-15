import chalk from 'chalk';
import { insertLog, type LogEntry } from '../memory/log-db.ts';

/**
 * Logger centralizado del sistema.
 * Registra en consola y persiste en base de datos.
 */
export const logger = {
  info(message: string, context?: Partial<LogEntry>) {
    console.log(chalk.blue(`[INFO]`), message);
    this._persist('info', 'system', message, context);
  },

  warn(message: string, context?: Partial<LogEntry>) {
    console.warn(chalk.yellow(`[WARN]`), message);
    this._persist('warning', 'system', message, context);
  },

  error(message: string, error?: any, context?: Partial<LogEntry>) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const fullMsg = `${message}: ${errorMsg}`;
    console.error(chalk.red(`[ERROR]`), fullMsg);
    this._persist('error', 'system', fullMsg, { 
      ...context, 
      data: { stack: error instanceof Error ? error.stack : undefined, ...context?.data } 
    });
  },

  /**
   * Registro específico para acciones de herramientas.
   */
  tool(toolName: string, success: boolean, args: any, result: any, context: { userId: string, chatId?: string, latencyMs?: number }) {
    const status = success ? chalk.green('SUCCESS') : chalk.red('FAILED');
    console.log(chalk.magenta(`[TOOL]`), `${toolName} - ${status}`);
    
    this._persist(success ? 'info' : 'error', 'tool', toolName, {
      ...context,
      level: 'action',
      message: toolName,
      data: { args, result, success }
    });
  },

  /**
   * Registro específico para actividad del agente/IA.
   */
  agent(message: string, context: { userId: string, chatId: string, model: string, latencyMs?: number, data?: any }) {
    console.log(chalk.cyan(`[AGENT]`), message);
    this._persist('info', 'agent', message, context);
  },

  /**
   * Registro de seguridad (login, acceso fallido, etc).
   */
  security(message: string, context: Partial<LogEntry>) {
    console.log(chalk.bgRed(`[SECURITY]`), message);
    this._persist('warning', 'security', message, context);
  },

  _persist(level: LogEntry['level'], category: LogEntry['category'], message: string, context?: Partial<LogEntry>) {
    try {
      insertLog({
        level: context?.level || level,
        category,
        message,
        userId: context?.userId,
        chatId: context?.chatId,
        data: context?.data,
        latencyMs: context?.latencyMs
      });
      
      // TODO: Aquí podríamos emitir el log vía WebSocket si hay un broadcast global configurado
    } catch (err) {
      // Evitar loop infinito si insertLog falla
      console.error(chalk.red('Critical failure in logger persistence:'), err);
    }
  }
};
