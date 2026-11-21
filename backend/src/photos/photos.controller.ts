import {
  BadRequestException,
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Res,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Transform } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import type { Response } from 'express';
import {
  Public,
  Roles,
  Utilisateur,
  UtilisateurConnecte,
} from '../common/auth.decorators';
import { Role } from '../common/enums';
import { PhotosService, TYPES_IMAGE } from './photos.service';

class TeleverserPhotosDto {
  @Transform(({ value }) =>
    (Array.isArray(value) ? value : String(value ?? '').split(','))
      .map((v: unknown) => Number(v))
      .filter((n: number) => !Number.isNaN(n) && n > 0),
  )
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  enfantIds: number[];

  @IsOptional() @IsString() @MaxLength(255) legende?: string;
}

class DateOptionnelleDto {
  @IsOptional() @IsString() date?: string;
  @IsOptional() @IsString() page?: string;
}

@Controller()
export class PhotosController {
  constructor(private readonly service: PhotosService) {}

  @Roles(Role.ADMIN, Role.GESTIONNAIRE)
  @Post('photos')
  @UseInterceptors(
    FilesInterceptor('photos', 20, {
      limits: { fileSize: 15 * 1024 * 1024 },
      fileFilter: (_req, f, cb) =>
        TYPES_IMAGE.includes(f.mimetype)
          ? cb(null, true)
          : cb(
              new BadRequestException(
                `Format non pris en charge pour « ${f.originalname} » (JPEG, PNG ou WebP).`,
              ),
              false,
            ),
    }),
  )
  televerser(
    @Utilisateur() user: UtilisateurConnecte,
    @UploadedFiles() fichiers: Express.Multer.File[],
    @Body() dto: TeleverserPhotosDto,
  ) {
    return this.service.televerser(user, fichiers, dto.enfantIds, dto.legende);
  }

  @Roles(Role.ADMIN, Role.GESTIONNAIRE)
  @Get('photos')
  recentes(
    @Utilisateur() user: UtilisateurConnecte,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
  ) {
    return this.service.listerRecentes(user, page);
  }

  @Roles(Role.ADMIN, Role.GESTIONNAIRE, Role.PARENT)
  @Get('enfants/:id/photos')
  pourEnfant(
    @Utilisateur() user: UtilisateurConnecte,
    @Param('id', ParseIntPipe) id: number,
    @Query() q: DateOptionnelleDto,
  ) {
    return this.service.listerPourEnfant(
      user,
      id,
      Math.max(1, Number(q.page) || 1),
      q.date,
    );
  }

  @Public()
  @Get('photos/:id/fichier')
  async fichier(
    @Param('id', ParseIntPipe) id: number,
    @Query('jeton') jeton: string,
    @Query('taille') taille: string | undefined,
    @Res() res: Response,
  ) {
    const f = await this.service.fichierPhoto(id, jeton ?? '', taille);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    if (f.buffer) {
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Content-Length', f.buffer.length);
      return res.send(f.buffer);
    }
    res.sendFile(
      f.chemin!,
      (err) =>
        err &&
        !res.headersSent &&
        res.status(404).json({ message: 'Fichier introuvable.' }),
    );
  }

  @Roles(Role.ADMIN, Role.GESTIONNAIRE)
  @HttpCode(204)
  @Delete('photos/:id')
  supprimer(
    @Utilisateur() user: UtilisateurConnecte,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.supprimer(user, id);
  }
}
