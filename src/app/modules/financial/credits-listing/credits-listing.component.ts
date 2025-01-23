import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Credito } from '../modal/credit.modal';
import { ActivatedRoute } from '@angular/router';
import { PaginationService } from 'src/app/core/services/pagination.service';
import { CreditService } from '../services/credit.service';

@Component({
  selector: 'app-credits-listing',
  templateUrl: './credits-listing.component.html',
  styleUrls: ['./credits-listing.component.scss'],
})
export class CreditsListingComponent implements OnInit {
  credits: Credito[] = [];
  filteredCredits: Credito[] = [];
  currentPage: number = 1;
  itemsPerPage: number = 50;
  totalPages: number = 0;
  displayedPages: number[] = [];
  searchTerm: string = '';
  dataRange: string = '';
  startItem: number = 0;
  endItem: number = 0;
  showCustomDatePicker: boolean = false;
  customDateRange: { start: string; end: string } = { start: '', end: '' };
  selectedStatus: string = '';

  constructor(
    private route: ActivatedRoute,
    private paginationService: PaginationService,
    private readonly creditService: CreditService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.credits = this.route.snapshot.data['credits'];
    console.log('Loaded credits:', this.credits);

    this.applyFilter(); // Ensure filtering is applied after data is loaded
    console.log('Filtered credits:', this.filteredCredits);
    console.log('Paginated credits:', this.paginatedCredits);
  }

  onSearch(): void {
    this.applyFilter();
  }

  applyFilter(): void {
    console.log('Applying filter with searchTerm:', this.searchTerm);

    let result = [...this.credits];

    const term = this.searchTerm.trim().toLowerCase();
    if (term) {
      result = result.filter((credit) => {
        const cliente = credit.venda.cliente;
        return (
          (cliente.nome_empresa && cliente.nome_empresa.toLowerCase().includes(term)) ||
          (cliente.numero_doc && cliente.numero_doc.includes(term)) ||
          credit.parcela_id.toString().includes(term)
        );
      });
    }

    // Apply additional filters, such as status or date range
    if (this.selectedStatus) {
      result = result.filter((credit) => credit.status_pagamento.status_pagamento_id === +this.selectedStatus);
    }

    if (this.customDateRange.start && this.customDateRange.end) {
      const startDate = new Date(this.customDateRange.start);
      const endDate = new Date(this.customDateRange.end);
      result = result.filter((credit) => {
        const creationDate = new Date(credit.data_criacao);
        return creationDate >= startDate && creationDate <= endDate;
      });
    }

    // Update filteredCredits and recalculate pagination
    this.filteredCredits = result;
    console.log('Filtered credits:', this.filteredCredits);

    this.currentPage = 1;
    this.calculatePagination();
    this.updateDisplayedItems();
  }

  calculatePagination(): void {
    this.totalPages = Math.ceil(this.filteredCredits.length / this.itemsPerPage);
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages || 1; // Se totalPages for 0, define como 1
    }
    this.updateDisplayedPages();
  }

  updateDisplayedPages(): void {
    const maxDisplayedPages = 3;
    let startPage: number;
    let endPage: number;

    if (this.totalPages <= maxDisplayedPages) {
      startPage = 1;
      endPage = this.totalPages;
    } else {
      if (this.currentPage <= Math.ceil(maxDisplayedPages / 2)) {
        startPage = 1;
        endPage = maxDisplayedPages;
      } else if (this.currentPage + Math.floor(maxDisplayedPages / 2) >= this.totalPages) {
        startPage = this.totalPages - maxDisplayedPages + 1;
        endPage = this.totalPages;
      } else {
        startPage = this.currentPage - 1;
        endPage = this.currentPage + 1;
      }
    }
    this.displayedPages = Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
  }

  updateDisplayedItems(): void {
    const { startItem, endItem } = this.paginationService.updateDisplayedItems(this.currentPage, this.itemsPerPage, this.filteredCredits.length);
    this.startItem = startItem;
    this.endItem = endItem;
  }

  get paginatedCredits(): Credito[] {
    return this.paginationService.getPaginatedItems(this.filteredCredits, this.currentPage, this.itemsPerPage);
  }

  previousPage(): void {
    this.currentPage = this.paginationService.navigateToPage(this.currentPage, this.totalPages, 'previous');
    this.updateDisplayedPages();
    this.updateDisplayedItems();
  }

  nextPage(): void {
    this.currentPage = this.paginationService.navigateToPage(this.currentPage, this.totalPages, 'next');
    this.updateDisplayedPages();
    this.updateDisplayedItems();
  }

  goToPage(page: number): void {
    this.currentPage = this.paginationService.navigateToPage(this.currentPage, this.totalPages, page);
    this.updateDisplayedPages();
    this.updateDisplayedItems();
  }

  goToFirstPage(): void {
    this.currentPage = this.paginationService.navigateToPage(this.currentPage, this.totalPages, 'first');
    this.updateDisplayedPages();
    this.updateDisplayedItems();
  }

  goToLastPage(): void {
    this.currentPage = this.paginationService.navigateToPage(this.currentPage, this.totalPages, 'last');
    this.updateDisplayedPages();
    this.updateDisplayedItems();
  }

  onChangeItemsPerPage(): void {
    this.currentPage = 1;
    this.calculatePagination();
    this.updateDisplayedItems();
  }

  getStatusClass(statusId: number): string {
    switch (statusId) {
      case 1: // Pendente
        return 'badge py-3 px-4 fs-7 badge-light-warning';
      case 2: // Pago
        return 'badge py-3 px-4 fs-7 badge-light-primary';
      case 3: // Atrasado
        return 'badge py-3 px-4 fs-7 badge-light-danger';
      case 4: // Cancelado
        return 'badge py-3 px-4 fs-7 badge-light-info';
      default:
        return 'badge py-3 px-4 fs-7 badge-light-secondary';
    }
  }

  onDateRangeChange(): void {
    const selectedRange = this.dataRange;
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    let startDate = new Date(now);
    let endDate = new Date(now);

    switch (selectedRange) {
      case 'today':
        break;

      case 'tomorrow':
        startDate.setDate(now.getDate() + 1);
        endDate = new Date(startDate);
        break;

      case 'next7':
        endDate.setDate(now.getDate() + 7);
        break;

      case 'next15':
        endDate.setDate(now.getDate() + 15);
        break;

      case 'next30':
        endDate.setDate(now.getDate() + 30);
        break;

      case 'nextMonth':
        startDate.setMonth(now.getMonth() + 1);
        endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + 1);
        endDate.setDate(0); // Último dia do mês
        break;

      case 'thisMonth':
        startDate.setDate(1);
        endDate.setMonth(now.getMonth() + 1);
        endDate.setDate(0); // Último dia deste mês
        break;

      case 'lastMonth':
        startDate.setMonth(now.getMonth() - 1);
        startDate.setDate(1);
        endDate = new Date(startDate);
        endDate.setMonth(startDate.getMonth() + 1);
        endDate.setDate(0); // Último dia do mês passado
        break;

      case 'custom':
        this.showCustomDatePicker = true;
        return;

      default:
        // Se não escolheu nada, pega tudo desde 1970 até hoje
        startDate = new Date(0);
        endDate = new Date(now);
        break;
    }

    const fromDate = this.formatDate(startDate);
    const toDate = this.formatDate(endDate);
    console.log('Filtrando por intervalo de datas:', fromDate, toDate);

    // Faz a requisição ao backend com ambos os parâmetros
    this.creditService.getCreditsByDateRange(fromDate, toDate).subscribe({
      next: (credits) => {
        // Sobrescreve o array principal
        this.credits = credits;
        console.log('Pedidos filtrados:', credits);
        this.applyFilter();
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Erro ao filtrar por intervalo de datas:', err),
    });
  }

  // Utilitário para formatar data em yyyy-MM-dd
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
