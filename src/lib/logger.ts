import * as fs from 'fs';
import * as path from 'path';
import { config } from '../config.js';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const levels: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class Logger {
  private currentLevel: number;
  private logFile: string;

  constructor() {
    this.currentLevel = levels[config.LOG_LEVEL as LogLevel] || levels.info;
    this.logFile = path.resolve(process.cwd(), config.LOG_FILE);
    this.ensureLogDirectory();
  }

  private ensureLogDirectory() {
    const dir = path.dirname(this.logFile);
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch (e) {
        console.error('Failed to create log directory:', e);
      }
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return levels[level] >= this.currentLevel;
  }

  private format(level: LogLevel, message: string, meta?: any): string {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      message,
      pid: process.pid,
      ...meta,
    });
  }

  private write(level: LogLevel, message: string, meta?: any) {
    if (!this.shouldLog(level)) return;

    const entry = this.format(level, message, meta);
    
    // Write to stderr
    console.error(entry);

    // Write to file
    try {
      fs.appendFileSync(this.logFile, entry + '\n');
    } catch (e) {
      // Prevent infinite loops if writing fails
      console.error('Failed to write to log file:', e);
    }
  }

  debug(message: string, meta?: any) {
    this.write('debug', message, meta);
  }

  info(message: string, meta?: any) {
    this.write('info', message, meta);
  }

  warn(message: string, meta?: any) {
    this.write('warn', message, meta);
  }

  error(message: string, meta?: any) {
    this.write('error', message, meta);
  }
}

export const logger = new Logger();
