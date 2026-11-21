import {
  BadRequestException,
  ValidationError,
  ValidationPipe,
} from '@nestjs/common';

const MESSAGES: Record<string, string> = {
  isNotEmpty: 'est requis',
  isDefined: 'est requis',
  isEmail: 'doit être un courriel valide',
  minLength: 'est trop court',
  maxLength: 'est trop long',
  isString: 'doit être un texte',
  isInt: 'doit être un nombre entier',
  isNumber: 'doit être un nombre',
  isBoolean: 'doit être vrai ou faux',
  isEnum: "n'est pas une valeur permise",
  isIn: "n'est pas une valeur permise",
  isDateString: 'doit être une date valide',
  matches: "n'est pas au bon format",
  isArray: 'doit être une liste',
  min: 'est trop petit',
  max: 'est trop grand',
  arrayNotEmpty: 'ne doit pas être vide',
  whitelistValidation: "n'est pas un champ permis",
};

function aplatir(erreurs: ValidationError[], parent = ''): string[] {
  return erreurs.flatMap((e) => {
    const champ = parent ? `${parent}.${e.property}` : e.property;
    const contraintes = Object.keys(e.constraints ?? {});
    const principale =
      contraintes.find((c) => c === 'isNotEmpty' || c === 'isDefined') ??
      contraintes[0];
    const propres = principale
      ? [`Le champ « ${champ} » ${MESSAGES[principale] ?? "n'est pas valide"}.`]
      : [];
    return [...propres, ...aplatir(e.children ?? [], champ)];
  });
}

export const validationPipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  exceptionFactory: (erreurs) =>
    new BadRequestException({
      statusCode: 400,
      message: aplatir(erreurs),
      error: 'Requête invalide',
    }),
});
