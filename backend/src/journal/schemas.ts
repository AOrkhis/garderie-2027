import { BadRequestException } from '@nestjs/common';
import { TypeEntree } from '../common/enums';

interface Champ {
  requis?: boolean;
  valeurs?: string[];
  heure?: boolean;
  max?: number;
}

export const HEURE_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export const MOMENTS_REPAS = [
  'DEJEUNER',
  'COLLATION_AM',
  'DINER',
  'COLLATION_PM',
  'SOUPER',
];
export const QUANTITES = ['TOUT', 'BIEN', 'UN_PEU', 'RIEN'];

const SCHEMAS: Record<TypeEntree, Record<string, Champ>> = {
  [TypeEntree.ARRIVEE]: { parQui: { max: 120 }, remarque: { max: 1000 } },
  [TypeEntree.DEPART]: { parQui: { max: 120 }, remarque: { max: 1000 } },
  [TypeEntree.REPAS]: {
    moment: { requis: true, valeurs: MOMENTS_REPAS },
    menu: { max: 255 },
    quantite: { requis: true, valeurs: QUANTITES },
    commentaire: { max: 1000 },
  },
  [TypeEntree.SIESTE]: {
    debut: { requis: true, heure: true },
    fin: { heure: true },
    qualite: { valeurs: ['BIEN', 'AGITE', 'PAS_DORMI'] },
    commentaire: { max: 1000 },
  },
  [TypeEntree.ACTIVITE]: {
    titre: { requis: true, max: 150 },
    description: { max: 2000 },
    categorie: {
      valeurs: [
        'MOTRICITE',
        'ART',
        'MUSIQUE',
        'PLEIN_AIR',
        'LANGAGE',
        'LECTURE',
        'JEU_LIBRE',
        'SCIENCE',
        'AUTRE',
      ],
    },
  },
  [TypeEntree.HYGIENE]: {
    genre: { requis: true, valeurs: ['COUCHE', 'TOILETTE'] },
    detail: { valeurs: ['MOUILLEE', 'SELLE', 'SECHE'] },
    remarque: { max: 1000 },
  },
  [TypeEntree.HUMEUR]: {
    humeur: {
      requis: true,
      valeurs: ['JOYEUX', 'CALME', 'FATIGUE', 'TRISTE', 'AGITE'],
    },
    commentaire: { max: 1000 },
  },
  [TypeEntree.REMARQUE]: {
    texte: { requis: true, max: 2000 },
    importance: { valeurs: ['INFO', 'IMPORTANT'] },
  },
  [TypeEntree.PHOTO]: { legende: { max: 255 } },
};

/** Valide et nettoie les données d'une entrée selon son type. */
export function nettoyerDonnees(
  type: TypeEntree,
  donnees: Record<string, unknown> = {},
): Record<string, string> {
  const schema = SCHEMAS[type];
  const propres: Record<string, string> = {};
  for (const [cle, regle] of Object.entries(schema)) {
    const brut = donnees[cle];
    const valeur =
      typeof brut === 'string' ? brut.trim() : brut == null ? '' : String(brut);
    if (!valeur) {
      if (regle.requis)
        throw new BadRequestException(`Le champ « ${cle} » est requis.`);
      continue;
    }
    if (regle.valeurs && !regle.valeurs.includes(valeur))
      throw new BadRequestException(
        `La valeur du champ « ${cle} » n'est pas permise.`,
      );
    if (regle.heure && !HEURE_REGEX.test(valeur))
      throw new BadRequestException(
        `Le champ « ${cle} » doit être une heure (HH:MM).`,
      );
    if (regle.max && valeur.length > regle.max)
      throw new BadRequestException(`Le champ « ${cle} » est trop long.`);
    propres[cle] = valeur;
  }
  if (type === TypeEntree.REMARQUE && !propres.importance)
    propres.importance = 'INFO';
  return propres;
}
