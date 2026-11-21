import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

const minuscules = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class InscriptionGarderieDto {
  @IsString() @IsNotEmpty() @MaxLength(150) nomGarderie: string;
  @IsOptional() @IsString() @MaxLength(255) adresse?: string;
  @IsOptional() @IsString() @MaxLength(30) telephone?: string;
  @IsString() @IsNotEmpty() @MaxLength(80) prenom: string;
  @IsString() @IsNotEmpty() @MaxLength(80) nom: string;
  @Transform(minuscules) @IsEmail() courriel: string;
  @IsString() @MinLength(8) @MaxLength(100) motDePasse: string;
}

export class ConnexionDto {
  @Transform(minuscules) @IsEmail() courriel: string;
  @IsString() @IsNotEmpty() motDePasse: string;
}

export class RafraichirDto {
  @IsString() @IsNotEmpty() refreshToken: string;
}

export class ChangerAdhesionDto {
  @IsInt() adhesionId: number;
}

export class MotDePasseOublieDto {
  @Transform(minuscules) @IsEmail() courriel: string;
}

export class ReinitialiserDto {
  @IsString() @IsNotEmpty() jeton: string;
  @IsString() @MinLength(8) @MaxLength(100) motDePasse: string;
}

export class ModifierProfilDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(80) prenom?: string;
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(80) nom?: string;
  @IsOptional() @IsString() @MaxLength(30) telephone?: string;
}

export class ChangerMotDePasseDto {
  @IsString() @IsNotEmpty() actuel: string;
  @IsString() @MinLength(8) @MaxLength(100) nouveau: string;
}

export class ConfirmerCourrielDto {
  @IsString() @IsNotEmpty() jeton: string;
}

export class RenvoyerConfirmationDto {
  @Transform(minuscules) @IsEmail() courriel: string;
}

export class AccepterInvitationDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(80) prenom?: string;
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(80) nom?: string;
  @IsString() @MinLength(8) @MaxLength(100) motDePasse: string;
}
