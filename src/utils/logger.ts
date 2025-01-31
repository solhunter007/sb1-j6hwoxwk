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

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
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
    return {
      timestamp: new Date().toISOString(),
      level,
      service: this.serviceName,
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
    const entry = this.createLogEntry('DEBUG', method, message, undefined, context);
    console.debug(this.formatLogEntry(entry));
  }

  info(method: string, message: string, context?: Record<string, any>) {
    const entry = this.createLogEntry('INFO', method, message, undefined, context);
    console.info(this.formatLogEntry(entry));
  }

  warn(method: string, message: string, context?: Record<string, any>) {
    const entry = this.createLogEntry('WARN', method, message, undefined, context);
    console.warn(this.formatLogEntry(entry));
  }

  error(method: string, message: string, error: Error, context?: Record<string, any>) {
    const entry = this.createLogEntry('ERROR', method, message, error, context);
    console.error(this.formatLogEntry(entry));
  }
}

export const logger = Logger.getInstance();