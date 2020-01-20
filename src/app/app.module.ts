import { NgModule, APP_INITIALIZER, ErrorHandler } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';

import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { CacheModule } from "ionic-cache";
import { HTTP } from '@ionic-native/http/ngx';
import { Globalization } from '@ionic-native/globalization/ngx';
import { ConfigService, KretaService } from './_services';
import { AppVersion } from '@ionic-native/app-version/ngx';
import { Network } from '@ionic-native/network/ngx';
import { FirebaseX } from '@ionic-native/firebase-x/ngx';
import { ErrorHandlerService } from './_services/error-handler.service';

export function initializeApp(config: ConfigService, kreta: KretaService) {
  return (): Promise<any> => {
    return Promise.all([
      config.onInit(),
      kreta.onInit(),
    ]);
  };
}

@NgModule({
  declarations: [AppComponent],
  entryComponents: [],
  imports: [
    BrowserModule,
    IonicModule.forRoot(),
    CacheModule.forRoot({ keyPrefix: 'naplo__' }),
    AppRoutingModule
  ],
  providers: [
    StatusBar,
    SplashScreen,
    HTTP,
    Globalization,
    AppVersion,
    Network,
    FirebaseX,
    { provide: APP_INITIALIZER, useFactory: initializeApp, deps: [ConfigService, KretaService], multi: true },
    { provide: ErrorHandler, useClass: ErrorHandlerService },
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
