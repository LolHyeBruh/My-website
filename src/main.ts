
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app/app.component.enhanced';
import { routes } from './app/app.routes.enhanced';

bootstrapApplication(AppComponent, {
  providers: [provideRouter(routes)]
})
.catch(err => console.error(err));
