import { setDefaultResultOrder } from 'node:dns';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { validationPipe } from './common/validation';

// Préférer IPv4 : sur certains hébergeurs (Railway…), l'IPv6 vers des services
// externes comme SMTP Gmail se bloque et fait patienter les requêtes.
setDefaultResultOrder('ipv4first');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: (process.env.CORS_ORIGIN ?? 'http://localhost:5173').split(','),
  });
  app.useGlobalPipes(validationPipe);
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
