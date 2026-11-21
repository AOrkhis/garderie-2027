import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CommonModule } from './common/common.module';
import { EnfantsModule } from './enfants/enfants.module';
import { GarderieModule } from './garderie/garderie.module';
import { JournalModule } from './journal/journal.module';
import { PhotosModule } from './photos/photos.module';
import { SuperAdminModule } from './super-admin/super-admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.getOrThrow('DB_HOST'),
        port: Number(config.get('DB_PORT') ?? 3306),
        username: config.getOrThrow('DB_USER'),
        password: config.getOrThrow('DB_PASSWORD'),
        database: config.getOrThrow('DB_NAME'),
        charset: 'utf8mb4_unicode_ci',
        timezone: 'Z',
        // Les colonnes DATE restent des chaînes « AAAA-MM-JJ » (sinon décalage d'un jour selon le fuseau)
        dateStrings: ['DATE'],
        autoLoadEntities: true,
        synchronize: config.get('DB_SYNCHRONIZE') === 'true',
      }),
    }),
    CommonModule,
    AuthModule,
    GarderieModule,
    EnfantsModule,
    JournalModule,
    PhotosModule,
    SuperAdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
