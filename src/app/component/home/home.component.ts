import { Component, OnInit, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import readXlsxFile from 'read-excel-file'
import { draw, generate } from 'patternomaly'
import 'jquery'
import "leaflet";
import "leaflet-canvas-marker"
import { CovidService } from 'src/app/services/covid.service';
import { count } from 'rxjs/operators';
declare let L
declare let $
declare let Chart
declare let pattern

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit {
  map
  ciLayer
  markers = []

  countries: Country[] = []
  selectedCountry: Country = null

  affectedHeader = "Confirmed"
  confirmed = 0
  recovered = 0
  death = 0
  active = 0

  doughnutChartCountryDetail = null
  lineChartCountryDetail = null

  cases = []

  countriesSearchInput = ""

  constructor(private cdr: ChangeDetectorRef, private service: CovidService) { }

  ngOnInit() {
    this.map = L.map('map', {
      center: [40.866667, 34.566667],
      zoom: 2,
      preferCanvas: true
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 18,
      id: 'mapbox.streets',
      accessToken: 'pk.eyJ1Ijoid2lsZGhhbnRyaSIsImEiOiJjazYzbW16YXkwOGNkM2twYTRxbzQxN2xwIn0.rshyTLtbA39-KGTzC1bV5A'
    }).addTo(this.map);



    this.doughnutChartCountryDetail = new Chart($('#myChart'), {
      type: 'doughnut',
      data: {
        datasets: [{
          data: [],
          backgroundColor: ['#fdd835', '#00e676', '#e53935']
        }],

        // These labels appear in the legend and in the tooltips when hovering different arcs
        labels: [
          'Aktif',
          'Sembuh',
          'Meninggal'
        ]
      },
    });


    this.lineChartCountryDetail = new Chart($('#myChart2'), {
      type: 'line',
      data: {
        datasets: [{
          label: 'Total',
          data: [],
          borderColor: '#127abe',
          backgroundColor: '#127abe'
        },
          // {
          //   label: 'Aktif',
          //   data: [],
          //   fill: false,
          //   borderColor: '#f8c702'
          // }, {
          //   label: 'Sembuh',
          //   data: [],
          //   fill: false,
          //   borderColor: '#7ace7a'
          // }, {
          //   label: 'Meninggal',
          //   data: [],
          //   fill: false,
          //   borderColor: '#e8776b'
          // }
        ],
        labels: []
      },
    });

    this.loadData()
  }

  loadData() {
    this.service.getSummary().subscribe(
      data => {
        this.markers = []
        for (let d of data) {
          var country: Country = new Country();
          country.id = d["attributes"].OBJECTID;
          country.country_region = d["attributes"].Country_Region;
          country.province_state = d["attributes"].Province_State;
          country.lat = d["attributes"].Lat;
          country.lng = d["attributes"].Long_;
          country.confirmed = d["attributes"].Confirmed;
          country.recovered = d["attributes"].Recovered;
          country.death = d["attributes"].Deaths;
          country.active = d["attributes"].Active;
          country.last_updated = d["attributes"].Last_Updated;


          try {
            var century21icon = L.icon({
              iconUrl: 'assets/markermap.png',
              iconSize: [30, 30]
            });
            var marker = L.marker(new L.LatLng(country.lat, country.lng), { icon: century21icon })
            marker.bindPopup("<b>" + country.country_region + "</b>")
            marker.on('click', (e) => {
              var countryMarker: Country = new Country();
              countryMarker.id = d["attributes"].OBJECTID;
              countryMarker.country_region = d["attributes"].Country_Region;
              countryMarker.province_state = d["attributes"].Province_State;
              countryMarker.lat = d["attributes"].Lat;
              countryMarker.lng = d["attributes"].Long_;
              countryMarker.confirmed = d["attributes"].Confirmed;
              countryMarker.recovered = d["attributes"].Recovered;
              countryMarker.death = d["attributes"].Deaths;
              countryMarker.active = d["attributes"].Active;
              countryMarker.last_updated = d["attributes"].Last_Updated;

              this.clickCountry(countryMarker)
            })
            marker.addTo(this.map)


            // L.circle([country.lat, country.lng], { radius: Math.round(country.confirmed * 0.8) }).addTo(this.map);
          } catch (e) {
            console.error(e)
          }

          this.countries.push(country);


          this.recovered += country.recovered
          this.confirmed += country.confirmed
          this.death += country.death
          this.active += country.active

          this.markers.push(marker)
        }
        this.countries.sort((a, b) => b.confirmed - a.confirmed)

        let indexIndonesia = this.countries.findIndex(c => c.country_region == "Indonesia")
        if (indexIndonesia > -1) {
          this.clickCountry(this.countries[indexIndonesia])
        }
        // this.ciLayer.addMarkers(this.markers)
      }
    )
  }

  getCountries(){
    return this.countriesSearchInput == "" ? this.countries : this.countries.filter(c => c.country_region.toLowerCase().includes(this.countriesSearchInput.toLowerCase()))
  }

  changeAffectedHeader(e) {
    switch (this.affectedHeader) {
      case "Confirmed":
        this.countries.sort((a, b) => b.confirmed - a.confirmed)
        break;
      case "Active":
        this.countries.sort((a, b) => b.active - a.active)
        break;
      case "Recovered":
        this.countries.sort((a, b) => b.recovered - a.recovered)
        break;
      case "Death":
        this.countries.sort((a, b) => b.death - a.death)
        break;
    }
  }

  clickCountry(country: Country) {

    this.selectedCountry = country
    this.map.flyTo(new L.LatLng(country.lat, country.lng), 6, {
      animate: true,
      duration: 1.5
    })

    this.doughnutChartCountryDetail.data.datasets.forEach(ds => {
      ds.data = [country.active, country.recovered, country.death]
    })
    this.doughnutChartCountryDetail.update()

    var countryName = country.country_region
    countryName = countryName.replace(" ", "-")
    countryName = countryName.toLowerCase()

    this.service.getHistoryTracking(countryName, "confirmed").subscribe(
      data => {
        var historyTracks: HistoryTrack[] = []
        var labelsHistory = []
        var casesHistory = []

        let i = 0;

        for (let d of data) {
          var historyTrack: HistoryTrack = new HistoryTrack();
          historyTrack.cases = d.Cases
          historyTrack.country = d.Country
          historyTrack.date = new Date(d.Date)
          historyTracks.push(historyTrack)
          labelsHistory.push(historyTrack.date.getFullYear() + "-" + (historyTrack.date.getMonth() + 1) + "-" + historyTrack.date.getDate())
          casesHistory.push(historyTrack.cases)
        }

        let index = this.lineChartCountryDetail.data.datasets.findIndex(d => d.label == "Total");
        this.lineChartCountryDetail.data.datasets[index].data = casesHistory;
        this.lineChartCountryDetail.data.labels = labelsHistory
        this.lineChartCountryDetail.update()
      }
    )

    // this.service.getHistoryTracking(countryName, "recovered").subscribe(
    //   data => {
    //     console.log(data)
    //     var historyTracks: HistoryTrack[] = []
    //     var labelsHistory = []
    //     var casesHistory = []

    //     let i = 0;

    //     for (let d of data) {
    //       var historyTrack: HistoryTrack = new HistoryTrack();
    //       historyTrack.cases = d.Cases
    //       historyTrack.country = d.Country
    //       historyTrack.date = d.Date

    //       historyTracks.push(historyTrack)
    //       labelsHistory.push("Hari ke - " + i++)
    //       casesHistory.push(historyTrack.cases)
    //     }


    //     let index = this.lineChartCountryDetail.data.datasets.findIndex(d => d.label == "Sembuh");
    //     this.lineChartCountryDetail.data.datasets[index].data = casesHistory;
    //     this.lineChartCountryDetail.data.labels = labelsHistory
    //     this.lineChartCountryDetail.update()
    //   }
    // )

    // this.service.getHistoryTracking(countryName, "deaths").subscribe(
    //   data => {
    //     console.log(data)
    //     var historyTracks: HistoryTrack[] = []
    //     var labelsHistory = []
    //     var casesHistory = []

    //     let i = 0;

    //     for (let d of data) {
    //       var historyTrack: HistoryTrack = new HistoryTrack();
    //       historyTrack.cases = d.Cases
    //       historyTrack.country = d.Country
    //       historyTrack.date = d.Date

    //       historyTracks.push(historyTrack)
    //       labelsHistory.push("Hari ke - " + i++)
    //       casesHistory.push(historyTrack.cases)
    //     }

    //     let index = this.lineChartCountryDetail.data.datasets.findIndex(d => d.label == "Meninggal");
    //     this.lineChartCountryDetail.data.datasets[index].data = casesHistory;
    //     this.lineChartCountryDetail.data.labels = labelsHistory
    //     this.lineChartCountryDetail.update()
    //   }
    // )
  }
}

class Country {
  id: number;
  country_region: string;
  province_state: string;
  lat: number;
  lng: number;
  confirmed: number;
  recovered: number;
  death: number;
  active: number;
  last_updated: Date;
}

class HistoryTrack {
  country: string
  date: Date
  cases: number
}