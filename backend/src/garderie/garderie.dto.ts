import { Transform } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Role } from '../common/enums';

export class ModifierGarderieDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(150) nom?: string;
  @IsOptional() @IsString() @MaxLength(255) adresse?: string;
  @IsOptional() @IsString() @MaxLength(30) telephone?: string;
  @IsOptional() @IsEmail() courriel?: string;
  @IsOptional() @IsString() @MaxLength(100) heuresOuverture?: string;
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(60) fuseauHoraire?: string;
}

export class GroupeDto {
  @IsString() @IsNotEmpty() @MaxLength(100) nom: string;
  @IsOptional() @IsString() @MaxLength(60) trancheAge?: string;
  @IsOptional() @IsString() @MaxLength(20) couleur?: string;
  @IsOptional() @IsInt() @Min(0) @Max(240) ageMinMois?: number | null;
  @IsOptional() @IsInt() @Min(1) @Max(240) ageMaxMois?: number | null;
  @IsOptional() @IsString() @MaxLength(3000) description?: string;
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  gestionnaireIds?: number[];
}

export class ModifierGroupeDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(100) nom?: string;
  @IsOptional() @IsString() @MaxLength(60) trancheAge?: string;
  @IsOptional() @IsString() @MaxLength(20) couleur?: string;
  @IsOptional() @IsInt() @Min(0) @Max(240) ageMinMois?: number | null;
  @IsOptional() @IsInt() @Min(1) @Max(240) ageMaxMois?: number | null;
  @IsOptional() @IsString() @MaxLength(3000) description?: string;
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  gestionnaireIds?: number[];
}

export class ReaffecterDto {
  @IsArray() @ArrayUnique() @IsInt({ each: true }) enfantIds: number[];
}

export class InviterPersonnelDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  courriel: string;
  @IsOptional() @IsString() @MaxLength(80) prenom?: string;
  @IsOptional() @IsString() @MaxLength(80) nom?: string;
  @IsIn([Role.ADMIN, Role.GESTIONNAIRE]) role: Role;
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  groupeIds?: number[];
}

export class ModifierMembreDto {
  @IsOptional() @IsBoolean() actif?: boolean;
  @IsOptional() @IsIn([Role.ADMIN, Role.GESTIONNAIRE]) role?: Role;
}
