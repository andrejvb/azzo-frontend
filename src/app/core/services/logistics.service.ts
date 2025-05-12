import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { StockProjection } from '../../modules/expedition/models';

@Injectable()
export class LogisticsService {
  private baseUrl = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  getStockProjection(): Observable<StockProjection[]> {
    return this.http.get<StockProjection[]>(`${this.baseUrl}sells/projectStock`);
  }
}
