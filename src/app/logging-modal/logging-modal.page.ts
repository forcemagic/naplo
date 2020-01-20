import { Component, OnInit, ViewChild, ViewChildren, QueryList, Input, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Lesson, OsztalyTanuloi, Mulasztas, JavasoltJelenletTemplate, Feljegyzes } from '../_models';
import { IonSlides, LoadingController, ModalController, IonContent } from '@ionic/angular';
import { ErtekelesComponent, TanuloJelenletComponent, TanuloFeljegyzesComponent } from '../_components';
import { KretaService, ConfigService, NetworkStatusService, ConnectionStatus } from '../_services';
import { ErrorHelper, DateHelper } from '../_helpers';
import { takeUntil } from 'rxjs/operators';
import { componentDestroyed } from '@w11k/ngx-componentdestroyed';
import { FirebaseX } from '@ionic-native/firebase-x/ngx';
import { CurriculumModalPage } from '../curriculum-modal/curriculum-modal.page';

@Component({
  selector: 'app-logging-modal',
  templateUrl: './logging-modal.page.html',
  styleUrls: ['./logging-modal.page.scss'],
})
export class LoggingModalPage implements OnInit, OnDestroy {

  @Input() lesson: Lesson;

  public loading: string[];
  public kezdete: Date;
  public activeTabIndex: number = 0;
  public currentlyOffline: boolean;

  // mulasztások tab
  public tema: string;
  public osztalyTanuloi: OsztalyTanuloi;
  public mulasztasok: Mulasztas[];
  public javasoltJelenlet: JavasoltJelenletTemplate;

  // házi feladat tab
  public hfHatarido: string;
  public hfSzoveg: string;

  // feljegyzések tab
  public feljegyzesek: Feljegyzes[];

  @ViewChild('slides', { static: true }) slides: IonSlides;
  @ViewChild('ertekeles', { static: true }) private ertekeles: ErtekelesComponent;
  @ViewChild(IonContent, { static: true }) content: IonContent;

  @ViewChildren(TanuloJelenletComponent)
  private jelenletComponents: QueryList<TanuloJelenletComponent>;

  @ViewChildren(TanuloFeljegyzesComponent)
  private feljegyzesComponents: QueryList<TanuloFeljegyzesComponent>;

  constructor(
    private kreta: KretaService,
    public config: ConfigService,
    private error: ErrorHelper,
    private loadingController: LoadingController,
    public dateHelper: DateHelper,
    public modalController: ModalController,
    private networkStatus: NetworkStatusService,
    private cd: ChangeDetectorRef,
    private firebase: FirebaseX,
  ) { }

  async ngOnInit() {
    this.loading = ["osztalyTanuloi", "javasoltJelenlet"];

    this.firebase.setScreenName("logging_modal");

    if (this.lesson && this.lesson.KezdeteUtc) {
      this.kezdete = new Date(this.lesson.KezdeteUtc);
      this.tema = this.lesson.Tema;
      this.hfHatarido = this.lesson.HazifeladatHataridoUtc ? new Date(this.lesson.HazifeladatHataridoUtc).toISOString() : null;
      this.hfSzoveg = this.lesson.HazifeladatSzovege ? this.lesson.HazifeladatSzovege.replace(/\<br \/\>/g, '\n') : null;

      await this.firebase.startTrace("logging_modal_load_time");

      (await this.kreta.getOsztalyTanuloi(this.lesson.OsztalyCsoportId))
        .pipe(takeUntil(componentDestroyed(this)))
        .subscribe(x => {
          this.osztalyTanuloi = x;
          this.loadingDone("osztalyTanuloi");
        });

      if (this.lesson.Allapot.Nev == "Naplozott") {
        this.loading.push("mulasztas");
        (await this.kreta.getMulasztas(this.lesson.TanitasiOraId))
          .pipe(takeUntil(componentDestroyed(this)))
          .subscribe(x => {
            this.mulasztasok = x;
            this.loadingDone("mulasztas");
          });


        this.loading.push("feljegyzesek");
        (await this.kreta.getFeljegyzes(this.lesson.TanitasiOraId))
          .pipe(takeUntil(componentDestroyed(this)))
          .subscribe(x => {
            this.feljegyzesek = x;
            this.loadingDone("feljegyzesek");
          });
      }

      (await this.kreta.getJavasoltJelenlet(this.lesson))
        .pipe(takeUntil(componentDestroyed(this)))
        .subscribe(x => {
          this.javasoltJelenlet = x;
          this.loadingDone("javasoltJelenlet");
        });


      this.firebase.stopTrace("logging_modal_load_time");
    }

    this.networkStatus.onNetworkChange()
      .pipe(takeUntil(componentDestroyed(this)))
      .subscribe(status => {
        this.currentlyOffline = status === ConnectionStatus.Offline;
        this.cd.detectChanges();
      });

  }

  ngOnDestroy(): void { }

  private loadingDone(key: string) {
    var index = this.loading.indexOf(key);
    if (index !== -1) this.loading.splice(index, 1);
  }

  async onSlideChange() {
    this.content.scrollToTop(500);
    this.activeTabIndex = await this.slides.getActiveIndex();
  }

  async slideToTab(index: number) {
    await this.slides.slideTo(index);
  }

  async save() {
    // ellenőrzés
    if (this.tema.trim().length <= 0) {
      await this.error.presentAlert("Az óra témáját kötelező kitölteni!");
      return;
    }
    if (this.hfHatarido && this.hfSzoveg.trim().length <= 0) {
      await this.error.presentAlert("A házi feladat leírását kötelező megadni, ha ki lett választva határidő!");
      return;
    }

    let tanuloLista = this.getTanuloLista();

    let request = [
      {
        "MobilId": 9,
        "OrarendiOraId": this.lesson.OrarendiOraId,
        "TanitasiOraId": this.lesson.TanitasiOraId,
        "TantargyId": this.lesson.TantargyId,
        "DatumUtc": this.lesson.KezdeteUtc,
        "RogzitesDatumUtc": new Date().toISOString(),
        "OraVegDatumaUtc": this.lesson.VegeUtc,
        "IsElmaradt": false,
        "Tema": this.tema,
        "Hazifeladat": this.hfSzoveg ? this.hfSzoveg : null,
        "HazifeladatId": this.lesson.HazifeladatId ? this.lesson.HazifeladatId : null,
        "HazifeladatHataridoUtc": this.hfHatarido ? new Date(this.hfHatarido).toISOString() : null,
        "TanuloLista": tanuloLista
      }
    ];

    if (!await this.ertekeles.isValid())
      return;


    const loading = await this.loadingController.create({ message: 'Mentés...' });
    await loading.present();

    await this.firebase.startTrace("lesson_logging_post_time");
    const result = await this.kreta.postLesson(request);
    const ertekelesSaveResult = await this.ertekeles.save();
    this.firebase.stopTrace("lesson_logging_post_time");

    await loading.dismiss();

    if (result && result[0] && result[0].Exception != null) {
      this.firebase.logError("logging_modal postLesson error: " + result[0].Exception.Message);
      return await this.error.presentAlert(result[0].Exception.Message);
    }

    this.firebase.logEvent("lesson_logged", {});

    // sikeres naplózás
    this.kreta.removeDayFromCache(this.lesson.KezdeteUtc);
    this.kreta.removeMulasztasFromCache(this.lesson.TanitasiOraId);
    this.kreta.removeFeljegyzesFromCache(this.lesson.TanitasiOraId);

    if (ertekelesSaveResult)
      this.modalController.dismiss({ success: true });

  }

  getTanuloLista() {
    let tanuloLista = [];
    this.jelenletComponents.forEach(t => {

      let tanuloKivalasztottFeljegyzesei = this.feljegyzesComponents.find(x => x.tanulo.Id == t.tanulo.Id);

      tanuloLista.push({
        "Id": t.tanulo.Id,
        "Mulasztas": t.getJsonOutput(),
        "FeljegyzesTipusLista": tanuloKivalasztottFeljegyzesei.getJsonOutput(),
      });

    });

    return tanuloLista;
  }

  async openTanmenet() {
    const modal = await this.modalController.create({
      component: CurriculumModalPage,
      componentProps: {
        lesson: this.lesson,
      }
    });

    await modal.present();
    const { data } = await modal.onWillDismiss();
    if (data && data.tanmenetElem)
      this.tema = data.tanmenetElem.Tema;

  }

  dismiss() {
    this.modalController.dismiss();
  }

}
