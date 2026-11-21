import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  Matches,
} from 'class-validator';
import { TypeEntree } from '../common/enums';
import { HEURE_REGEX } from './schemas';

export class CreerEntreeDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsInt({ each: true })
  enfantIds: number[];
  @IsEnum(TypeEntree) type: TypeEntree;
  @IsOptional() @IsDateString() date?: string;
  @IsOptional() @Matches(HEURE_REGEX) heure?: string;
  @IsOptional() @IsObject() donnees?: Record<string, unknown>;
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  photoIds?: number[];
}

export class ModifierEntreeDto {
  @IsOptional() @Matches(HEURE_REGEX) heure?: string;
  @IsOptional() @IsObject() donnees?: Record<string, unknown>;
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  photoIds?: number[];
}

export class TerminerSiesteDto {
  @IsOptional() @Matches(HEURE_REGEX) fin?: string;
}

export class DateDto {
  @IsOptional() @IsDateString() date?: string;
}

export class VueJourDto {
  @IsOptional() @IsDateString() date?: string;
  @IsOptional() @Type(() => Number) @IsInt() groupeId?: number;
}
