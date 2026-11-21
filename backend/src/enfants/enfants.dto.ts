import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { LienParent, StatutEnfant } from '../common/enums';

export class ContactUrgenceDto {
  @IsString() @IsNotEmpty() @MaxLength(160) nom: string;
  @IsString() @IsNotEmpty() @MaxLength(30) telephone: string;
  @IsOptional() @IsString() @MaxLength(60) lien?: string;
  @IsOptional() @IsBoolean() autoriseARecuperer?: boolean;
}

export class EnfantDto {
  @IsString() @IsNotEmpty() @MaxLength(80) prenom: string;
  @IsString() @IsNotEmpty() @MaxLength(80) nom: string;
  @IsDateString() dateNaissance: string;
  @IsOptional() @IsInt() groupeId?: number | null;
  @IsOptional() @IsString() allergies?: string;
  @IsOptional() @IsString() restrictionsAlimentaires?: string;
  @IsOptional() @IsString() notesMedicales?: string;
  @IsOptional() @IsBoolean() consentementPhoto?: boolean;
  @IsOptional() @IsDateString() dateEntree?: string;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContactUrgenceDto)
  contactsUrgence?: ContactUrgenceDto[];
}

export class ModifierEnfantDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(80) prenom?: string;
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(80) nom?: string;
  @IsOptional() @IsDateString() dateNaissance?: string;
  @IsOptional() @IsInt() groupeId?: number | null;
  @IsOptional() @IsString() allergies?: string;
  @IsOptional() @IsString() restrictionsAlimentaires?: string;
  @IsOptional() @IsString() notesMedicales?: string;
  @IsOptional() @IsBoolean() consentementPhoto?: boolean;
  @IsOptional() @IsDateString() dateEntree?: string;
  @IsOptional() @IsEnum(StatutEnfant) statut?: StatutEnfant;
  /** Vrai : recalculer le groupe selon l'âge de l'enfant. */
  @IsOptional() @IsBoolean() groupeAuto?: boolean;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContactUrgenceDto)
  contactsUrgence?: ContactUrgenceDto[];
}

export class FiltreEnfantsDto {
  @IsOptional() @Type(() => Number) @IsInt() groupeId?: number;
  @IsOptional() @IsEnum(StatutEnfant) statut?: StatutEnfant;
}

export class AjouterParentDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  courriel: string;
  @IsOptional() @IsString() @MaxLength(80) prenom?: string;
  @IsOptional() @IsString() @MaxLength(80) nom?: string;
  @IsEnum(LienParent) lien: LienParent;
}
