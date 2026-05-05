import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

console.warn('[ulp] main.ts — bootstrap starting');

bootstrapApplication(AppComponent, appConfig)
  .then(() => console.warn('[ulp] main.ts — bootstrap COMPLETE'))
  .catch((err) => console.error('[ulp] main.ts — bootstrap FAILED:', err));
