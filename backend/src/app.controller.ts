import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './common/auth.decorators';
import { ForfaitsService } from './common/forfaits.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly forfaitsService: ForfaitsService,
  ) {}

  @Public()
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  /** Grille tarifaire publique (page d'accueil, paramètres). */
  @Public()
  @Get('forfaits')
  forfaits() {
    return this.forfaitsService.public();
  }
}
