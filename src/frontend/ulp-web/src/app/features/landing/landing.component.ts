import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { Router } from '@angular/router';
import { KeycloakService } from 'keycloak-angular';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { environment } from '../../../environments/environment';

/**
 * Sign-in page — single centered card on a soft lavender→pink wash.
 *
 * Layout: full viewport height, lavender (left) → pink (right) gradient
 * background, one large white card centered with the SCMCube logo,
 * brand headline, subtitle, the 6 product pills, the primary sign-in CTA,
 * and the help links. Stable at any screen size.
 */
@Component({
  selector: 'ulp-landing',
  standalone: true,
  imports: [MatButtonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="signin-page">
      <div class="signin-card">
        <a class="brand" href="/">
          <img class="brand__logo"
               src="assets/brand/logo-color.jpg"
               alt="SCM CUBE — NextGen Solutions"
               (error)="onLogoMissing($event)" />
          <span class="brand__fallback" [class.brand__fallback--show]="logoMissing">
            <strong>SCM&nbsp;&nbsp;CUBE</strong>
            <small>NextGen Solutions</small>
          </span>
        </a>

        <h1 class="brand-heading">The Unified Logistics Platform</h1>
        <p class="signin-card__lede">
          One platform for freight forwarding, customs clearance,
          warehousing, transport and accounting — across India and the
          United States.
        </p>

        <ul class="product-pills">
          <li><span class="dot dot--p1"></span>FreightCube</li>
          <li><span class="dot dot--p2"></span>ImpexCube</li>
          <li><span class="dot dot--p3"></span>WMSCube</li>
          <li><span class="dot dot--p4"></span>TMSCube</li>
          <li><span class="dot dot--p5"></span>FACube</li>
          <li><span class="dot dot--p6"></span>EximCube</li>
        </ul>

        <button mat-flat-button class="cta-primary" (click)="signIn()">
          <mat-icon>login</mat-icon>
          Sign in with SCMCube&nbsp;ID
        </button>

        <div class="signin-card__sep"><span>Need help?</span></div>

        <ul class="signin-card__links">
          <li><a>Forgot password</a></li>
          <li><a>Contact your administrator</a></li>
        </ul>

        <p class="signin-card__legal">
          © 2026 SCMCube · Multi-region SaaS · IN&nbsp;+&nbsp;US
        </p>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; min-height: 100vh; }

    .signin-page {
      min-height: 100vh;
      padding: 32px;
      display: flex; align-items: center; justify-content: center;
      position: relative; overflow: hidden;
      background:
        radial-gradient(ellipse 60% 70% at 5% 10%, rgba(91, 63, 160, 0.12) 0%, rgba(91, 63, 160, 0) 60%),
        radial-gradient(ellipse 60% 70% at 95% 90%, rgba(239, 125, 126, 0.10) 0%, rgba(239, 125, 126, 0) 60%),
        linear-gradient(95deg, #E8DEF5 0%, #EDDCF3 30%, #F0DCEE 50%, #F5DCEA 75%, #FCDDE0 100%);
    }

    .signin-card {
      width: 100%; max-width: 720px;
      background: #FFFFFF;
      border-radius: 20px;
      padding: 48px 56px;
      box-shadow:
        0 28px 72px rgba(63, 45, 124, 0.20),
        0 6px 14px rgba(63, 45, 124, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.6);
      text-align: center;
      display: flex; flex-direction: column; align-items: center;
      gap: 0;
    }

    .brand {
      display: inline-flex; align-items: center;
      text-decoration: none;
      margin-bottom: 28px;
    }
    .brand__logo { height: 72px; width: auto; display: block; }
    .brand__fallback { display: none; flex-direction: column; line-height: 1.1; }
    .brand__fallback--show { display: inline-flex; }
    .brand__fallback strong { color: #3F2D7C; font-weight: 800; font-size: 32px; letter-spacing: 0.5px; }
    .brand__fallback small { color: #2C2C36; font-size: 12px; font-weight: 500; margin-top: 4px; }

    h1 {
      font-weight: 800;
      font-size: 36px; line-height: 44px;
      margin: 0 0 12px;
      max-width: 580px;
    }
    .signin-card__lede {
      color: #5C5C66; font-size: 15px; line-height: 24px;
      margin: 0 0 24px;
      max-width: 540px;
    }

    .product-pills {
      list-style: none; padding: 0; margin: 0 0 32px;
      display: flex; flex-wrap: wrap; justify-content: center; gap: 8px;
    }
    .product-pills li {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 6px 12px;
      background: #F5F2FB;
      border: 1px solid rgba(63, 45, 124, 0.08);
      border-radius: 999px;
      color: #3F2D7C; font-weight: 600; font-size: 12px;
    }
    .dot { width: 8px; height: 8px; border-radius: 50%; }
    .dot--p1 { background: #5B3FA0; }
    .dot--p2 { background: #8B6FC8; }
    .dot--p3 { background: #A397DF; }
    .dot--p4 { background: #6B3FA0; }
    .dot--p5 { background: #4A3590; }
    .dot--p6 { background: #C9BEEC; }

    .cta-primary {
      background: #3F2D7C !important; color: #FFFFFF !important;
      padding: 0 32px !important; font-weight: 600;
      border-radius: 999px; height: 56px; min-width: 280px;
      box-shadow: 0 6px 16px rgba(63, 45, 124, 0.30) !important;
      display: inline-flex !important; align-items: center; justify-content: center; gap: 10px;
      font-size: 15px;
    }
    .cta-primary:hover { background: #5B3FA0 !important; }
    .cta-primary mat-icon { font-size: 20px; width: 20px; height: 20px; line-height: 20px; }

    .signin-card__sep {
      display: flex; align-items: center; gap: 12px;
      width: 100%; max-width: 360px;
      margin: 28px 0 12px;
      color: #9A9AA3; font-size: 11px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.8px;
    }
    .signin-card__sep::before, .signin-card__sep::after {
      content: ''; flex: 1; height: 1px; background: #EFEFF3;
    }

    .signin-card__links {
      list-style: none; padding: 0; margin: 0;
      display: flex; gap: 24px; flex-wrap: wrap; justify-content: center;
    }
    .signin-card__links a {
      color: #3F2D7C; font-weight: 600; font-size: 13px;
      cursor: pointer; padding: 6px 8px; border-radius: 6px;
    }
    .signin-card__links a:hover { background: #F5F2FB; }

    .signin-card__legal {
      margin: 28px 0 0;
      color: #9A9AA3; font-size: 11px; line-height: 16px;
    }

    /* Smaller screens — keep the card readable but reduce padding */
    @media (max-width: 720px) {
      .signin-page { padding: 16px; }
      .signin-card { padding: 32px 24px; border-radius: 16px; }
      .brand__logo { height: 56px; }
      h1 { font-size: 26px; line-height: 32px; }
      .signin-card__lede { font-size: 14px; line-height: 22px; }
      .cta-primary { min-width: 240px; }
    }
  `],
})
export class LandingComponent {
  private readonly keycloak = inject(KeycloakService);
  private readonly router = inject(Router);

  protected logoMissing = false;

  onLogoMissing(event: Event) {
    this.logoMissing = true;
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }

  async signIn() {
    try {
      // Keycloak is initialised at app bootstrap (see app.config.ts APP_INITIALIZER).
      if (this.keycloak.isLoggedIn()) {
        await this.router.navigate(['/app']);
        return;
      }
      await this.keycloak.login({ redirectUri: window.location.origin + '/app' });
    } catch (err: any) {
      console.error('[ulp] Sign-in failed', err);
      const msg = err?.message || err?.error || String(err);
      alert(
        'Sign-in failed.\n\n' +
        'Likely causes:\n' +
        '  - Keycloak not running on http://localhost:8080 (run: powershell -ExecutionPolicy Bypass -File infra\\scripts\\stack-up.ps1)\n' +
        '  - Realm "ulp" not imported (check Keycloak logs)\n' +
        '  - Redirect URI not whitelisted for client "ulp-web"\n\n' +
        'Error: ' + msg
      );
    }
  }
}
