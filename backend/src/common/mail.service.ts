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
  private readonly cleApiBrevo?: string;
  readonly frontendUrl: string;

  constructor(config: ConfigService) {
    const host = config.get<string>('SMTP_HOST');
    this.expediteur =
      config.get<string>('MAIL_FROM') ??
      'Garderie 2027 <no-reply@garderie2027.ca>';
    this.frontendUrl =
      config.get<string>('FRONTEND_URL') ?? 'http://localhost:5173';
    // API HTTPS Brevo : contourne les ports SMTP bloqués par l'hébergeur
    this.cleApiBrevo = config.get<string>('BREVO_API_KEY') || undefined;
    const port = Number(config.get('SMTP_PORT') ?? 587);
    this.transport = host
      ? createTransport({
          host,
          port,
          // SSL direct sur 465, STARTTLS sur 587
          secure: port === 465,
          connectionTimeout: 15000,
          greetingTimeout: 15000,
          socketTimeout: 30000,
          auth: {
            user: config.get('SMTP_USER'),
            // Les mots de passe d'application Google s'affichent avec des espaces
            pass: config.get('SMTP_PASSWORD')?.replace(/\s/g, ''),
          },
        })
      : null;
  }

  /** Vrai si aucun envoi n'est configuré : les courriels sont seulement affichés dans la console. */
  get modeConsole() {
    return !this.transport && !this.cleApiBrevo;
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
    const html = `<p>${echapper(texte).replace(/\n/g, '<br>')}</p>${
      lien ? `<p><a href="${echapper(lien)}">${echapper(lien)}</a></p>` : ''
    }<p>— L'équipe Garderie 2027</p>`;
    if (this.cleApiBrevo) {
      await this.envoyerBrevo(destinataire, sujet, corps, html);
      return;
    }
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
        html,
      });
    } catch (e) {
      this.logger.error(
        `Échec de l'envoi à ${destinataire} : ${(e as Error).message}`,
      );
    }
  }

  /** Envoi via l'API HTTPS de Brevo (port 443, jamais bloqué par les hébergeurs). */
  private async envoyerBrevo(
    destinataire: string,
    sujet: string,
    texte: string,
    html: string,
  ) {
    // MAIL_FROM au format « Nom <courriel> » ou « courriel » seul
    const m = /^(?:"?([^"<]*)"?\s*)?<?([^<>\s]+@[^<>\s]+)>?$/.exec(
      this.expediteur.trim(),
    );
    const sender = {
      name: (m?.[1] ?? 'Garderie 2027').trim() || 'Garderie 2027',
      email: m?.[2] ?? this.expediteur,
    };
    try {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': this.cleApiBrevo!,
          'Content-Type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({
          sender,
          to: [{ email: destinataire }],
          subject: sujet,
          textContent: texte,
          htmlContent: html,
        }),
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) {
        this.logger.error(
          `Échec de l'envoi à ${destinataire} : Brevo ${res.status} ${await res.text()}`,
        );
      }
    } catch (e) {
      this.logger.error(
        `Échec de l'envoi à ${destinataire} : ${(e as Error).message}`,
      );
    }
  }
}
