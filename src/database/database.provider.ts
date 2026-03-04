import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

export const DATABASE_SOURCE = 'DATA_SOURCE';

export const databaseProviders = [
  {
    provide: DATABASE_SOURCE,
    inject: [ConfigService],
    useFactory: async (config: ConfigService) => {
      const dataSource = new DataSource({
        type: 'postgres',
        host: config.get<string>('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        username: config.get<string>('DB_USERNAME'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_NAME'),
        synchronize: config.get<boolean>('DB_SYNC', false),
        logging: config.get<string>('NODE_ENV') === 'development',
        entities: [__dirname + '/entities/**/*.entity{.ts,.js}'],
      });

      return dataSource.initialize();
    },
  },
];
