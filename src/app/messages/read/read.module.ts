import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

import { IonicModule } from "@ionic/angular";

import { ReadPageRoutingModule } from "./read-routing.module";

import { ReadPage } from "./read.page";
import { ComponentsModule } from "src/app/_components/components.module";
import { TranslateModule } from "@ngx-translate/core";
import { FileOpener } from "@ionic-native/file-opener/ngx";

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        IonicModule,
        ReadPageRoutingModule,
        ComponentsModule,
        TranslateModule,
    ],
    declarations: [ReadPage],
    providers: [FileOpener],
})
export class ReadPageModule {}
