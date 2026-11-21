import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import Stripe from 'stripe';
import { Repository } from 'typeorm';
import { parametresEnCache } from '../common/fonctionnalites';
import { UtilisateurConnecte } from '../common/auth.decorators';
import { EvenementStripe, Forfait, Garderie } from '../entities';

export type IntervalleFacturation = 'mensuel' | 'annuel';

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private stripe: Stripe | null = null;

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(Garderie)
    private readonly garderies: Repository<Garderie>,
    @InjectRepository(Forfait)
    private readonly forfaits: Repository<Forfait>,
    @InjectRepository(EvenementStripe)
    private readonly evenements: Repository<EvenementStripe>,
  ) {}

  private get client(): Stripe {
    if (!this.stripe) {
      const cle = this.config.get<string>('STRIPE_SECRET_KEY');
      if (!cle)
        throw new ServiceUnavailableException(
          "Stripe n'est pas configuré sur le serveur.",
        );
      this.stripe = new Stripe(cle);
    }
    return this.stripe;
  }

  private get frontendUrl() {
    return this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:5173';
  }

  /** URL Stripe Checkout pour abonner la garderie à un forfait. */
  async creerSessionCheckout(
    user: UtilisateurConnecte,
    codeForfait: string,
    intervalle: IntervalleFacturation,
  ) {
    const [garderie, f] = await Promise.all([
      this.garderies.findOneByOrFail({ id: user.garderieId! }),
      this.forfaits.findOneBy({ code: codeForfait }),
    ]);
    if (!f) throw new NotFoundException('Forfait introuvable.');
    const prixId =
      intervalle === 'annuel' ? f.stripePrixAnnuelId : f.stripePrixMensuelId;
    if (!prixId)
      throw new BadRequestException(
        `Le forfait ${f.nom} n'est pas vendu en ligne en ${intervalle}.`,
      );
    if (!f.public && garderie.plan !== f.code)
      throw new BadRequestException('Ce forfait est sur invitation seulement.');

    const meta = { garderieId: String(garderie.id), forfait: f.code };
    const session = await this.client.checkout.sessions.create({
      mode: 'subscription',
      customer: garderie.stripeClientId ?? undefined,
      customer_email: garderie.stripeClientId
        ? undefined
        : (garderie.courriel ?? undefined),
      line_items: [{ price: prixId, quantity: 1 }],
      success_url: `${this.frontendUrl}/parametres?abonnement=succes`,
      cancel_url: `${this.frontendUrl}/parametres?abonnement=annule`,
      metadata: meta,
      subscription_data: { metadata: meta },
    });
    return { url: session.url };
  }

  /** Portail client Stripe : carte, factures, annulation. */
  async creerSessionPortail(user: UtilisateurConnecte) {
    const garderie = await this.garderies.findOneByOrFail({
      id: user.garderieId!,
    });
    if (!garderie.stripeClientId)
      throw new BadRequestException('Aucun paiement Stripe enregistré.');
    const session = await this.client.billingPortal.sessions.create({
      customer: garderie.stripeClientId,
      return_url: `${this.frontendUrl}/parametres`,
    });
    return { url: session.url };
  }

  // ---------- Webhook ----------

  async traiterWebhook(corps: Buffer, signature: string) {
    const secret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!secret)
      throw new ServiceUnavailableException(
        'Webhook Stripe non configuré sur le serveur.',
      );
    let evenement: Stripe.Event;
    try {
      evenement = this.client.webhooks.constructEvent(corps, signature, secret);
    } catch {
      throw new BadRequestException('Signature Stripe invalide.');
    }

    // Idempotence : ignorer si déjà traité (Stripe renvoie parfois les mêmes événements).
    if (await this.evenements.existsBy({ id: evenement.id }))
      return { recu: true, doublon: true };

    switch (evenement.type) {
      case 'checkout.session.completed':
        await this.surCheckoutComplete(
          evenement.data.object as Stripe.Checkout.Session,
        );
        break;
      case 'customer.subscription.updated':
        await this.surAbonnementMaj(
          evenement.data.object as Stripe.Subscription,
        );
        break;
      case 'customer.subscription.deleted':
        await this.surAbonnementSupprime(
          evenement.data.object as Stripe.Subscription,
        );
        break;
      case 'invoice.paid':
        await this.surFacturePayee(evenement.data.object as Stripe.Invoice);
        break;
      case 'invoice.payment_failed':
        await this.surFactureEchouee(evenement.data.object as Stripe.Invoice);
        break;
      default:
        this.logger.log(`Événement Stripe ignoré : ${evenement.type}`);
    }

    await this.evenements.save(
      this.evenements.create({ id: evenement.id, type: evenement.type }),
    );
    return { recu: true };
  }

  private async surCheckoutComplete(session: Stripe.Checkout.Session) {
    const garderieId = Number(session.metadata?.garderieId);
    if (!garderieId) return;
    const garderie = await this.garderies.findOneBy({ id: garderieId });
    if (!garderie) return;

    garderie.stripeClientId = this.idDe(session.customer);
    garderie.stripeAbonnementId = this.idDe(session.subscription);
    garderie.stripeStatut = 'active';

    const ancien = garderie.stripeAbonnementId;
    const abonnement = garderie.stripeAbonnementId
      ? await this.client.subscriptions.retrieve(garderie.stripeAbonnementId)
      : null;
    if (abonnement) {
      garderie.payeJusquau = this.finPeriode(abonnement);
      const code = await this.forfaitDepuisAbonnement(abonnement);
      if (code) {
        garderie.plan = code;
        garderie.essaiJusquau = null; // l'essai interne s'efface devant un vrai paiement
      }
    }
    // Un nouveau Checkout pendant un abonnement actif : résilier l'ancien pour
    // éviter une double facturation (Stripe ne le fait pas tout seul).
    if (ancien && ancien !== garderie.stripeAbonnementId) {
      await this.garderies.save(garderie); // le nouvel ID est sauvegardé avant l'annulation
      try {
        await this.client.subscriptions.cancel(ancien);
      } catch (e) {
        this.logger.warn(
          `Annulation de l'ancien abonnement ${ancien} impossible : ${e}`,
        );
      }
      return;
    }
    await this.garderies.save(garderie);
    this.logger.log(
      `Abonnement activé : garderie ${garderieId} → ${garderie.plan}`,
    );
  }

  private async surAbonnementMaj(abonnement: Stripe.Subscription) {
    const garderie = await this.garderieDepuisAbonnement(abonnement);
    if (!garderie) return;
    // Ignorer les mises à jour d'un ancien abonnement remplacé par un nouveau.
    if (
      garderie.stripeAbonnementId &&
      garderie.stripeAbonnementId !== abonnement.id
    )
      return;
    garderie.stripeClientId = this.idDe(abonnement.customer);
    garderie.stripeStatut = abonnement.status;
    garderie.payeJusquau = this.finPeriode(abonnement);
    const code = await this.forfaitDepuisAbonnement(abonnement);
    if (code) garderie.plan = code;
    await this.garderies.save(garderie);
  }

  private async surAbonnementSupprime(abonnement: Stripe.Subscription) {
    const garderie = await this.garderieDepuisAbonnement(abonnement);
    if (!garderie) return;
    // Ignorer la résiliation d'un ancien abonnement remplacé par un nouveau.
    if (
      garderie.stripeAbonnementId &&
      garderie.stripeAbonnementId !== abonnement.id
    )
      return;
    garderie.stripeStatut = 'canceled';
    garderie.stripeAbonnementId = null;
    garderie.payeJusquau = null;
    garderie.plan = parametresEnCache()?.forfaitDefaut ?? 'GRATUIT';
    await this.garderies.save(garderie);
    this.logger.log(
      `Abonnement résilié : garderie ${garderie.id} → ${garderie.plan}`,
    );
  }

  private async surFacturePayee(facture: Stripe.Invoice) {
    const abonnementId = this.abonnementIdDe(facture);
    if (!abonnementId) return;
    const garderie = await this.garderies.findOneBy({
      stripeAbonnementId: abonnementId,
    });
    if (!garderie) return;
    const abonnement = await this.client.subscriptions.retrieve(abonnementId);
    garderie.stripeStatut = abonnement.status;
    garderie.payeJusquau = this.finPeriode(abonnement);
    await this.garderies.save(garderie);
  }

  private async surFactureEchouee(facture: Stripe.Invoice) {
    const abonnementId = this.abonnementIdDe(facture);
    if (!abonnementId) return;
    await this.garderies.update(
      { stripeAbonnementId: abonnementId },
      { stripeStatut: 'past_due' },
    );
  }

  /** API Stripe 2025+ : la fin de période est sur l'item d'abonnement. */
  private finPeriode(abonnement: Stripe.Subscription): Date | null {
    const fin = abonnement.items.data[0]?.current_period_end;
    return fin ? new Date(fin * 1000) : null;
  }

  private abonnementIdDe(facture: Stripe.Invoice) {
    const s = facture.parent?.subscription_details?.subscription;
    return this.idDe(s ?? null);
  }

  private idDe(v: string | { id: string } | null | undefined): string | null {
    return typeof v === 'string' ? v : (v?.id ?? null);
  }

  private async garderieDepuisAbonnement(abonnement: Stripe.Subscription) {
    const garderieId = Number(abonnement.metadata?.garderieId);
    return (
      (garderieId
        ? await this.garderies.findOneBy({ id: garderieId })
        : null) ??
      (await this.garderies.findOneBy({ stripeAbonnementId: abonnement.id }))
    );
  }

  /** Code du forfait dont un prix Stripe correspond au prix de l'abonnement. */
  private async forfaitDepuisAbonnement(abonnement: Stripe.Subscription) {
    const prixId = abonnement.items.data[0]?.price.id;
    if (!prixId) return null;
    const f = await this.forfaits
      .createQueryBuilder('f')
      .where('f.stripePrixMensuelId = :p OR f.stripePrixAnnuelId = :p', {
        p: prixId,
      })
      .getOne();
    return f?.code ?? null;
  }
}
