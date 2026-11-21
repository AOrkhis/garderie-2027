export function dateDuJour(fuseauHoraire: string, date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: fuseauHoraire }).format(
    date,
  );
}

export function heureActuelle(
  fuseauHoraire: string,
  date = new Date(),
): string {
  return new Intl.DateTimeFormat('fr-CA', {
    timeZone: fuseauHoraire,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
    .format(date)
    .replace(/\s*h\s*/, ':');
}
