import 'dotenv/config'; // Required to load better-auth env
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@/app.module';
import { ValidationPipe } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { GlobalExceptionFilter } from '@/common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    bodyParser: false, // Disable built-in body parser to use raw body for better-auth
  });

  // Use Winston for logging
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  // Global exception filter to handle all exceptions in a consistent way
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Global validation pipe for DTO validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Enable CORS for frontend applications
  app.enableCors({
    origin: process.env.FRONTEND_URL?.split(','),
    credentials: true,
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
}
void bootstrap();
