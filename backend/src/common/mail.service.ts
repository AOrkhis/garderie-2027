import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';

const echapper = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ]!,
  );

@Injectable()
export class MailService {
  private readonly logger = new Logger('Courriel');
  private readonly transport: Transporter | null;
  private readonly expediteur: string;
  readonly frontendUrl: string;

  constructor(config: ConfigService) {
    const host = config.get<string>('SMTP_HOST');
    this.expediteur =
      config.get<string>('MAIL_FROM') ??
      'Garderie 2027 <no-reply@garderie2027.ca>';
    this.frontendUrl =
      config.get<string>('FRONTEND_URL') ?? 'http://localhost:5173';
    const port = Number(config.get('SMTP_PORT') ?? 587);
    this.transport = host
      ? createTransport({
          host,
          port,
          // SSL direct sur 465, STARTTLS sur 587
          secure: port === 465,
          auth: {
            user: config.get('SMTP_USER'),
            // Les mots de passe d'application Google s'affichent avec des espaces
            pass: config.get('SMTP_PASSWORD')?.replace(/\s/g, ''),
          },
        })
      : null;
  }

  /** Vrai si aucun SMTP n'est configuré : les courriels sont seulement affichés dans la console. */
  get modeConsole() {
    return !this.transport;
  }

  async envoyer(
    destinataire: string,
    sujet: string,
    texte: string,
    lien?: string,
  ) {
    const corps = lien
      ? `${texte}\n\n${lien}\n\n— L'équipe Garderie 2027`
      : `${texte}\n\n— L'équipe Garderie 2027`;
    if (!this.transport) {
      this.logger.log(`\nÀ : ${destinataire}\nSujet : ${sujet}\n${corps}`);
      return;
    }
    try {
      await this.transport.sendMail({
        from: this.expediteur,
        to: destinataire,
        subject: sujet,
        text: corps,
        html: `<p>${echapper(texte).replace(/\n/g, '<br>')}</p>${
          lien ? `<p><a href="${echapper(lien)}">${echapper(lien)}</a></p>` : ''
        }<p>— L'équipe Garderie 2027</p>`,
      });
    } catch (e) {
      this.logger.error(
        `Échec de l'envoi à ${destinataire} : ${(e as Error).message}`,
      );
    }
  }
}
