import { Injectable } from '@angular/core';
import { HttpHeaders, HttpClient } from '@angular/common/http';
import { catchError, map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class CovidService {

  constructor(private http: HttpClient, private router: Router) { }



  getCountries() {
    const headers = new HttpHeaders();
    let url = "https://api.covid19api.com/summary";
    return this.http.get(url,
      {
        headers
      })
      .pipe(
        map((response) => {
          let res = response
          return res;
        }),
        catchError((e: Response) => this.handleError(e))
      );
  }

  getSummary() {
    const headers = new HttpHeaders();
    let url = "https://services1.arcgis.com/0MSEUqKaxRlEPj5g/arcgis/rest/services/ncov_cases/FeatureServer/2/query?where=1%3D1&outFields=*&outSR=4326&f=json";
    return this.http.get(url,
      {
        headers
      })
      .pipe(
        map((response) => {
          let res = response["features"]
          return res;
        }),
        catchError((e: Response) => this.handleError(e))
      );
  }


  getHistoryTracking(country,status) {
    const headers = new HttpHeaders();
    let url = "https://api.covid19api.com/total/dayone/country/"+country+"/status/"+status;
    return this.http.get(url,
      {
        headers
      })
      .pipe(
        map((response) => {
          let res = JSON.parse(JSON.stringify(response))
          return res;
        }),
        catchError((e: Response) => this.handleError(e))
      );
  }

  private handleError(error: any) {
    let errMsg = (error.message) ? error.message :
      error.status ? `${error.status} - ${error.statusText}` : 'Server error';
    console.error(errMsg); // log to console instead
    return Observable.throw(errMsg);
  }
}
