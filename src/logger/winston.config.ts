import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  WinstonModuleOptions,
  WinstonModuleOptionsFactory,
} from 'nest-winston';
import * as winston from 'winston';

@Injectable()
export class WinstonConfig implements WinstonModuleOptionsFactory {
  constructor(private readonly config: ConfigService) {}

  createWinstonModuleOptions():
    | Promise<WinstonModuleOptions>
    | WinstonModuleOptions {
    return {
      level: this.config.get<string>('LOG_LEVEL') || 'info',
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp({ format: 'DD-MM-YYYY HH:mm:ss' }),
            winston.format.colorize(),
            winston.format.printf(
              ({ timestamp, level, message, context, trace }) =>
                `[${timestamp}] [${level}] ${context ? `[${context}]` : ''} ${message}${trace ? `\n${trace}` : ''}`,
            ),
          ),
        }),
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
          format: winston.format.combine(
            winston.format.timestamp({ format: 'DD-MM-YYYY HH:mm:ss' }),
            winston.format.json(),
          ),
        }),
        new winston.transports.File({
          filename: 'logs/combined.log',
          format: winston.format.combine(
            winston.format.timestamp({ format: 'DD-MM-YYYY HH:mm:ss' }),
            winston.format.json(),
          ),
        }),
      ],
    };
  }
}
