import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './common/auth.decorators';
import { FORFAITS, ORDRE_FORFAITS } from './common/fonctionnalites';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  /** Grille tarifaire publique (page d'accueil, paramètres). */
  @Public()
  @Get('forfaits')
  forfaits() {
    return ORDRE_FORFAITS.map((p) => FORFAITS[p]);
  }
}
