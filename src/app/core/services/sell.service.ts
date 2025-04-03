import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Order, Ranking, UpdateSellStatus } from '../../modules/commerce/models';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { BrandSales } from 'src/app/modules/sellers/models/brand-sales.model';

@Injectable()
export class SellService {
  private baseUrl = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  getAllOrders() {
    return this.http.get<Order[]>(`${this.baseUrl}sells`);
  }

  getOrdersByDateRange(fromDate: string, toDate?: string) {
    return this.http.get<Order[]>(`${this.baseUrl}sells/between?fromDate=${fromDate}${toDate}`);
  }

  getOrderById(id: number) {
    return this.http.get<Order>(`${this.baseUrl}sells/${id}`);
  }

  getOrdersByDate(fromDate: string) {
    return this.http.get<Order[]>(`${this.baseUrl}sells?fromDate=${fromDate}`);
  }

  syncroAllOrders() {
    return this.http.get<{ message: string }>(`${this.baseUrl}sells/syncro`);
  }

  updateSellStatus(updateStatus: UpdateSellStatus) {
    return this.http.patch<{ message: string }>(`${this.baseUrl}sells/status`, updateStatus);
  }

  exportTiny(id: number) {
    return this.http.get<{ message: string }>(`${this.baseUrl}sells/export/${id}`);
  }

  getSellerRanking(): Observable<Ranking> {
    return this.http.get<Ranking>(`${this.baseUrl}sells/ranking`);
  }

  getSellsByBrand(): Observable<BrandSales> {
    return this.http.get<BrandSales>(`${this.baseUrl}sells/brand`);
  }
}
