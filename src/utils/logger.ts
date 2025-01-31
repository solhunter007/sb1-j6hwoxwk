import { format } from 'date-fns';

type LogLevel = 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  service: string;
  requestId?: string;
  userId?: string;
  method: string;
  message: string;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  context?: Record<string, any>;
}

class Logger {
  private static instance: Logger;
  private readonly serviceName: string = 'sermon-buddy';
  private readonly logLevels: Record<LogLevel, number> = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3
  };
  private currentLogLevel: LogLevel = 'INFO';

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  setLogLevel(level: LogLevel) {
    this.currentLogLevel = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return this.logLevels[level] <= this.logLevels[this.currentLogLevel];
  }

  private formatLogEntry(entry: LogEntry): string {
    // Mask sensitive data
    const sanitizedContext = entry.context ? this.maskSensitiveData(entry.context) : undefined;

    const logEntry = {
      ...entry,
      context: sanitizedContext,
    };

    return JSON.stringify(logEntry, null, 2);
  }

  private maskSensitiveData(data: Record<string, any>): Record<string, any> {
    const sensitiveFields = ['password', 'token', 'key', 'secret'];
    const masked = { ...data };

    Object.keys(masked).forEach(key => {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        masked[key] = '***REDACTED***';
      } else if (typeof masked[key] === 'object' && masked[key] !== null) {
        masked[key] = this.maskSensitiveData(masked[key]);
      }
    });

    return masked;
  }

  private createLogEntry(
    level: LogLevel,
    method: string,
    message: string,
    error?: Error,
    context?: Record<string, any>
  ): LogEntry {
    const timestamp = new Date().toISOString();
    const requestId = crypto.randomUUID();

    return {
      timestamp,
      level,
      service: this.serviceName,
      requestId,
      method,
      message,
      ...(error && {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
      }),
      ...(context && { context }),
    };
  }

  debug(method: string, message: string, context?: Record<string, any>) {
    if (!this.shouldLog('DEBUG')) return;
    const entry = this.createLogEntry('DEBUG', method, message, undefined, context);
    console.debug(this.formatLogEntry(entry));
  }

  info(method: string, message: string, context?: Record<string, any>) {
    if (!this.shouldLog('INFO')) return;
    const entry = this.createLogEntry('INFO', method, message, undefined, context);
    console.info(this.formatLogEntry(entry));
  }

  warn(method: string, message: string, context?: Record<string, any>) {
    if (!this.shouldLog('WARN')) return;
    const entry = this.createLogEntry('WARN', method, message, undefined, context);
    console.warn(this.formatLogEntry(entry));
  }

  error(method: string, message: string, error: Error, context?: Record<string, any>) {
    if (!this.shouldLog('ERROR')) return;
    const entry = this.createLogEntry('ERROR', method, message, error, context);
    console.error(this.formatLogEntry(entry));
  }
}

export const logger = Logger.getInstance();