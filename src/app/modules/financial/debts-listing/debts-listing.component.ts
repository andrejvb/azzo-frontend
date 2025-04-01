import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Categoria, Debt, Departamento } from '../modal/debt.modal';
import { ActivatedRoute, Router } from '@angular/router';
import { PaginationService } from '../../../core/services';
import { DebtService } from '../services/debt.service';

@Component({
  selector: 'app-debts-listing',
  templateUrl: './debts-listing.component.html',
  styleUrls: ['./debts-listing.component.scss'],
})
export class DebtsListingComponent implements OnInit {
  debts: Debt[] = [];
  filteredDebts: Debt[] = [];
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
  selectedDepartment: string = '';
  selectedCategory: string = '';
  departments: Departamento[];
  categories: Categoria[];
  sortField: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  constructor(
    private route: ActivatedRoute,
    private paginationService: PaginationService,
    private debtService: DebtService,
    private cdr: ChangeDetectorRef,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.debts = this.route.snapshot.data['debts'];
    this.sortField = 'debito_id';
    this.sortDirection = 'desc';
    this.loadDepartments();
    this.loadCategories();
    this.applyFilter();
    this.cdr.detectChanges();

    console.log('Loaded debts:', this.debts);
  }

  onSearch(): void {
    this.applyFilter();
  }

  private loadDepartments(): void {
    this.debtService.getAllDepartaments().subscribe((department) => {
      this.departments = department;
    });
  }

  private loadCategories(): void {
    this.debtService.getAllCategories().subscribe((categories) => {
      this.categories = categories;
    });
  }

  applyFilter(): void {
    let result = [...this.debts];

    // 1. Filter by search term
    const term = this.searchTerm.trim().toLowerCase();
    if (term) {
      result = result.filter(
        (debt) =>
          (debt.descricao || '').toLowerCase().includes(term) ||
          (debt.nome || '').toLowerCase().includes(term) ||
          (debt.empresa || '').toLowerCase().includes(term),
      );
    }

    // 2. Filter by category
    if (this.selectedCategory) {
      result = result.filter((debt) => debt.categoria.categoria_id === +this.selectedCategory);
    }

    // 3. Filter by department
    if (this.selectedDepartment) {
      result = result.filter((debt) => debt.departamento.departamento_id === +this.selectedDepartment);
    }

    // 4. Filter by status
    if (this.selectedStatus) {
      result = result.filter((debt) => debt.status_pagamento.status_pagamento_id === +this.selectedStatus);
    }

    // 5. Filter by date range (if custom dates are selected)
    if (this.customDateRange.start && this.customDateRange.end) {
      const startDate = new Date(this.customDateRange.start);
      const endDate = new Date(this.customDateRange.end);
      result = result.filter((debt) => {
        const competenciaDate = new Date(debt.data_competencia);
        return competenciaDate >= startDate && competenciaDate <= endDate;
      });
    }

    const getField = (d: Debt): any => {
      switch (this.sortField) {
        case 'debito_id':
          return d.debito_id;
        case 'nome':
          return d.nome;
        case 'valor_total':
          return +d.valor_total || 0;
        case 'conta':
          return d.conta;
        case 'proxVencimento':
          const vencimento = this.nextDueDate(d);
          return vencimento ? new Date(vencimento) : new Date(9999, 11, 31);
        case 'datCompetencia':
          return d.data_competencia ? new Date(d.data_competencia) : new Date(9999, 11, 31);

        default:
          return '';
      }
    };

    result.sort((a, b) => {
      const valA = getField(a);
      const valB = getField(b);

      if (valA instanceof Date && valB instanceof Date) {
        return this.sortDirection === 'asc' ? valA.getTime() - valB.getTime() : valB.getTime() - valA.getTime();
      }

      if (typeof valA === 'string') {
        return this.sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }

      return this.sortDirection === 'asc' ? valA - valB : valB - valA;
    });

    // 6. Update filtered debts and pagination
    this.filteredDebts = result;
    this.currentPage = 1;
    this.calculatePagination();
    this.updateDisplayedItems();
  }

  sortBy(field: string): void {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }
    this.applyFilter();
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

  calculatePagination(): void {
    this.totalPages = Math.ceil(this.filteredDebts.length / this.itemsPerPage);
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages || 1; // Se totalPages for 0, define como 1
    }
    this.updateDisplayedPages();
  }

  updateDisplayedItems(): void {
    const { startItem, endItem } = this.paginationService.updateDisplayedItems(this.currentPage, this.itemsPerPage, this.filteredDebts.length);
    this.startItem = startItem;
    this.endItem = endItem;
  }

  get paginatedDebts(): Debt[] {
    return this.paginationService.getPaginatedItems(this.filteredDebts, this.currentPage, this.itemsPerPage);
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

  editOrder(id: number): void {
    this.router.navigate(['financial/debts', id]);
  }

  nextDueDate(debt: Debt): string | null {
    if (!debt?.parcela_debito?.length) return null;

    const today = new Date();

    const next = debt.parcela_debito
      .filter((p) => p.status_pagamento?.status_pagamento_id === 1)
      .sort((a, b) => new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime())[0];

    if (next && new Date(next.data_vencimento) === today) {
      return next.data_vencimento; // Retorna o vencimento se for hoje
    }

    return next?.data_vencimento ?? null;
  }

  get totalDebts(): number {
    return this.filteredDebts.reduce((acc, debt) => acc + +debt.valor_total, 0);
  }

  onDateRangeChange(): void {
    const selectedRange = this.dataRange;
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    let startDate = new Date(now);
    let endDate = new Date(now);

    if (selectedRange === 'custom') {
      this.showCustomDatePicker = true;

      const start = this.customDateRange.start;
      const end = this.customDateRange.end;

      if (!start) return; // Se não tem início, não faz nada
      const from = new Date(start);
      from.setDate(from.getDate() + 1);
      const fromDate = this.formatDate(from);

      if (end) {
        const to = new Date(end);
        to.setDate(to.getDate() + 2);
        const toDate = this.formatDate(to);

        this.debtService.getDebtsBetweenDates(fromDate, toDate).subscribe({
          next: (debts) => {
            console.log('📦 DADOS RECEBIDOS DA API:', debts);
            this.debts = debts;
            this.applyFilter();
            this.cdr.detectChanges();
          },
          error: (err) => console.error('Erro ao filtrar intervalo personalizado:', err),
        });
        return;
      } else {
        this.debtService.getDebtsBetweenDates(fromDate).subscribe({
          next: (debts) => {
            this.debts = debts;
            this.applyFilter();
            this.cdr.detectChanges();
          },
          error: (err) => console.error('Erro ao filtrar data inicial personalizada:', err),
        });
      }

      return;
    }

    this.showCustomDatePicker = false;

    switch (selectedRange) {
      case 'today':
        break;

      case 'yesterday':
        startDate.setDate(now.getDate() - 1);
        break;

      case 'last7':
        startDate.setDate(now.getDate() - 7);
        break;

      case 'last30':
        startDate.setDate(now.getDate() - 30);
        break;

      case 'thisMonth':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        const f = this.formatDate(startDate);
        endDate.setDate(endDate.getDate() + 1);
        const t = this.formatDate(endDate);

        this.debtService.getDebtsBetweenDates(f, t).subscribe({
          next: (debts) => {
            this.debts = debts;
            this.applyFilter();
            this.cdr.detectChanges();
          },
          error: (err) => console.error('Erro ao filtrar mês atual:', err),
        });
        return;

      case 'lastMonth':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);

        const from = this.formatDate(startDate);
        const to = this.formatDate(endDate);

        this.debtService.getDebtsBetweenDates(from, to).subscribe({
          next: (debts) => {
            this.debts = debts;
            this.applyFilter();
            this.cdr.detectChanges();
          },
          error: (err) => console.error('Erro ao filtrar mês passado:', err),
        });
        return;

      default:
        startDate = new Date(0);
        break;
    }
    const fromDate = this.formatDate(startDate);
    this.debtService.getDebtsFromDate(fromDate).subscribe({
      next: (debts) => {
        this.debts = debts;
        this.applyFilter();
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Erro ao filtrar por data:', err),
    });
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
