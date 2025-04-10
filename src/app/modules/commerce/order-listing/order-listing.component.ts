import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { Order, Ranking } from '../models/order.model';
import { ActivatedRoute, Router } from '@angular/router';
import { LocalStorageService, PaginationService } from '../../../core/services';
import { OrderService } from '../services/order.service';
import { SweetAlertOptions } from 'sweetalert2';
import { SwalComponent } from '@sweetalert2/ngx-sweetalert2';
import { BehaviorSubject } from 'rxjs';
import Swal from 'sweetalert2';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { SellerRankingModalComponent } from '../seller-ranking-modal/seller-ranking-modal.component';

@Component({
  selector: 'app-order-listing',
  templateUrl: './order-listing.component.html',
  styleUrls: ['./order-listing.component.scss'],
})
export class OrderListingComponent implements OnInit {
  orders: Order[] = [];
  filteredOrders: Order[] = [];
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
  @ViewChild('noticeSwal') noticeSwal!: SwalComponent;
  swalOptions: SweetAlertOptions = {};
  isLoading$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  sortDirection: 'asc' | 'desc' = 'asc';
  private baseUrl = environment.apiUrl;
  @ViewChild('rankingModal') rankingModal!: SellerRankingModalComponent;
  ranking: Ranking[] = [];
  selectAll: boolean = false;
  selectedOrders: Order[] = [];
  user: string = '';

  constructor(
    private route: ActivatedRoute,
    private paginationService: PaginationService,
    private router: Router,
    private readonly orderService: OrderService,
    private cdr: ChangeDetectorRef,
    private http: HttpClient,
    private modalService: NgbModal,
    private localStorage: LocalStorageService,
  ) {}

  ngOnInit(): void {
    this.orders = this.route.snapshot.data['orders'];
    this.ranking = this.route.snapshot.data['ranking'];
    console.log('PEDIDOS ===> ', this.orders);
    this.sortByCode('desc'); // Ordenação padrão em ordem ascendente
    this.applyFilter();
    const storageInfo = this.localStorage.get('STORAGE_MY_INFO');
    this.user = storageInfo ? JSON.parse(storageInfo).nome : '';
  }

  sortByCode(direction: 'asc' | 'desc' = 'asc'): void {
    this.filteredOrders.sort((a, b) => {
      const codeA = Number(a.codigo);
      const codeB = Number(b.codigo);

      return direction === 'desc' ? codeB - codeA : codeA - codeB;
    });
    this.sortDirection = direction;
  }

  showAlert(swalOptions: SweetAlertOptions) {
    this.swalOptions = swalOptions;
    this.cdr.detectChanges();
    this.noticeSwal.fire();
  }

  syncroSells(): void {
    this.isLoading$.next(true);
    this.orderService.syncroAllOrders().subscribe({
      next: (resp) => {
        this.showAlert({
          icon: 'success',
          title: 'Sincronização concluída com sucesso!',
          text: resp.message,
          confirmButtonText: 'Ok',
        });
        this.isLoading$.next(false);
        this.onDateRangeChange();
        this.cdr.detectChanges();
      },
      complete: () => {
        console.log('Sync complete');
      },
      error: (err) => {
        this.showAlert({
          icon: 'error',
          title: 'Erro!',
          text: 'Não foi possível sincronizar os pedidos.',
          confirmButtonText: 'Ok',
        });
        this.cdr.detectChanges();
        console.error(err);
      },
    });
  }

  onSearch(): void {
    this.applyFilter();
  }

  applyFilter(): void {
    let result = [...this.orders];

    const term = this.searchTerm.trim().toLowerCase();
    if (term) {
      result = result.filter((order) => {
        const cliente = order.cliente;
        return (
          (cliente && cliente.nome_empresa.toLowerCase().includes(term)) ||
          (cliente && cliente.numero_doc && cliente.numero_doc.includes(term)) ||
          order.codigo.toString().includes(term)
        );
      });
    }

    // 3) Filtrar por status (se selectedStatus não for vazio)
    if (this.selectedStatus) {
      result = result.filter((order) => order.status_venda.status_venda_id === +this.selectedStatus);
    }

    // 4) Atualiza filteredOrders e a paginação
    this.filteredOrders = result;
    // Ordene os pedidos filtrados por data
    this.sortByCode(this.sortDirection);
    this.currentPage = 1;
    this.calculatePagination();
    this.updateDisplayedItems();
  }

  editOrder(id: number): void {
    this.router.navigate(['commerce/orders', id]);
  }

  getStatusClass(statusId: number): string {
    switch (statusId) {
      case 11138: // Aguardando Aprovação
        return 'badge py-3 px-4 fs-7 badge-light-warning';
      case 11139: // Pedido
        return 'badge py-3 px-4 fs-7 badge-light-primary';
      case 11468: // Reprovado
        return 'badge py-3 px-4 fs-7 badge-light-danger';
      case 11491: // Faturado
        return 'badge py-3 px-4 fs-7 badge-light-info';
      case 11541: // Pronto para Envio
        return 'badge py-3 px-4 fs-7 badge-light-info';
      case 11542: // Enviado
        return 'badge py-3 px-4 fs-7 badge-light-info';
      case 11543: // Entregue
        return 'badge py-3 px-4 fs-7 badge-light-success';
      default:
        return 'badge py-3 px-4 fs-7 badge-light-secondary';
    }
  }

  getStatusPagClass(statusId: number): string {
    switch (statusId) {
      case 1: // Pendente
        return 'badge py-2 px-3 fs-7 badge-light-warning opacity-75 text-muted';
      case 2: // Pago
        return 'badge py-2 px-3 fs-7 badge-light-primary opacity-75 text-muted';
      case 3: // Atrasado
        return 'badge py-3 px-4 fs-7 badge-light-danger text-dark';
      case 4: // Cancelado
        return 'badge py-2 px-3 fs-7 badge-light-info opacity-75 text-muted';
      default:
        return 'badge py-2 px-3 fs-7 badge-light-secondary opacity-50 text-muted';
    }
  }

  calculatePagination(): void {
    this.totalPages = Math.ceil(this.filteredOrders.length / this.itemsPerPage);
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
    const { startItem, endItem } = this.paginationService.updateDisplayedItems(this.currentPage, this.itemsPerPage, this.filteredOrders.length);
    this.startItem = startItem;
    this.endItem = endItem;
  }

  get paginatedOrders(): Order[] {
    return this.paginationService.getPaginatedItems(this.filteredOrders, this.currentPage, this.itemsPerPage);
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

  onDateRangeChange(): void {
    const selectedRange = this.dataRange;
    const now = new Date();

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

        this.orderService.getOrdersBetweenDates(fromDate, toDate).subscribe({
          next: (orders) => {
            this.orders = orders;
            this.applyFilter();
            this.cdr.detectChanges();
          },
          error: (err) => console.error('Erro ao filtrar intervalo personalizado:', err),
        });
        return;
      } else {
        this.orderService.getOrdersBetweenDates(fromDate).subscribe({
          next: (orders) => {
            this.orders = orders;
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
        const y = this.formatDate(startDate);

        this.orderService.getOrdersBetweenDates(y).subscribe({
          next: (orders) => {
            this.orders = orders;
            this.applyFilter();
            this.cdr.detectChanges();
          },
          error: (err) => console.error('Erro ao filtrar intervalo personalizado:', err),
        });
        return;

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

        this.orderService.getOrdersBetweenDates(f, t).subscribe({
          next: (orders) => {
            this.orders = orders;
            this.applyFilter();
            this.cdr.detectChanges();
          },
          error: (err) => console.error('Erro ao filtrar mês atual:', err),
        });
        return;

      case 'lastMonth':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0); // Last day of previous month

        const lastMonthFrom = this.formatDate(startDate);
        const lastMonthTo = this.formatDate(endDate);

        this.orderService.getOrdersBetweenDates(lastMonthFrom, lastMonthTo).subscribe({
          next: (orders) => {
            this.orders = orders;
            this.applyFilter();
            this.cdr.detectChanges();
          },
          error: (err) => console.error('Erro ao filtrar mês passado:', err),
        });
        return;

      case 'lastWeek':
        const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday

        startDate.setDate(now.getDate() - dayOfWeek - 7); // Sunday last week
        startDate.setHours(0, 0, 0, 0);

        endDate.setDate(now.getDate() - dayOfWeek - 1); // Saturday last week
        endDate.setHours(23, 59, 59, 999);

        const lastWeekFrom = this.formatDate(startDate);
        const lastWeekTo = this.formatDate(endDate);

        this.orderService.getOrdersBetweenDates(lastWeekFrom, lastWeekTo).subscribe({
          next: (orders) => {
            this.orders = orders;
            this.applyFilter();
            this.cdr.detectChanges();
          },
          error: (err) => console.error('Erro ao filtrar semana passada:', err),
        });
        return;

      default:
        startDate = new Date(0);
        break;
    }

    // Converte a data para string no formato YYYY-MM-DD
    const fromDate = this.formatDate(startDate);

    // Faz a requisição ao backend
    this.orderService.getOrdersByDate(fromDate).subscribe({
      next: (orders) => {
        // Sobrescreve o array principal
        this.orders = orders;
        this.applyFilter();
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Erro ao filtrar por data:', err),
    });
  }

  // Utilitário para formatar data em yyyy-MM-dd
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  get totalBruto(): number {
    return this.filteredOrders.reduce((acc, order) => {
      const valor = parseFloat(order.valor_final || '0');
      return acc + valor;
    }, 0);
  }

  get totalLucro(): number {
    let total = 0;

    for (const order of this.filteredOrders) {
      if (order.itensVenda && order.itensVenda.length > 0) {
        for (const item of order.itensVenda) {
          const custoUnit = +item.produto?.preco_custo;
          const qtd = item.quantidade;
          const valorTotal = +item.valor_total;

          // Lucro de cada item
          const lucroItem = valorTotal - custoUnit * qtd;
          total += lucroItem;
        }
      }
    }

    return total;
  }

  exportTiny(id: number, uf: string, exportado: number): void {
    let message = `Deseja exportar para o Tiny ${uf}?`;

    // Se já foi exportado, exibe um aviso antes
    if (exportado === 1) {
      message = `Este pedido já foi exportado para o Tiny ${uf}. Deseja exportá-lo novamente?`;
    }

    Swal.fire({
      title: 'Confirmação',
      text: message,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sim, Exportar!',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.isConfirmed) {
        // Se o usuário confirmar, faz a exportação
        this.orderService.exportTiny(id).subscribe({
          next: (resp) => {
            Swal.fire({
              icon: 'success',
              title: `Exportação concluída com sucesso! Tiny ${uf}`,
              text: resp.message,
              confirmButtonText: 'Ok',
            });
          },
          error: (err) => {
            Swal.fire({
              icon: 'error',
              title: `Erro na exportação! Tiny ${uf}`,
              text: 'Não foi possível exportar o pedido. ' + err.error.message,
              confirmButtonText: 'Ok',
            });
            console.error('Erro ao exportar para Tiny:', err);
          },
        });
      }
    });
  }

  generateLabel(orderId: number, orderCode: number): void {
    const responsible = this.user;
    Swal.fire({
      title: 'Gerar Etiquetas',
      html: `
          <input id="totalVolumes" class="swal2-input" type="number" placeholder="Total de Volumes">
        `,
      showCancelButton: true,
      confirmButtonText: 'Gerar',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const totalVolumes = (document.getElementById('totalVolumes') as HTMLInputElement).value;

        if (!totalVolumes || !responsible) {
          Swal.showValidationMessage('Todos os campos são obrigatórios.');
          return null;
        }

        if (isNaN(Number(totalVolumes)) || Number(totalVolumes) <= 0) {
          Swal.showValidationMessage('O número de volumes deve ser maior que zero.');
          return null;
        }

        return { totalVolumes: +totalVolumes, responsible };
      },
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        const { totalVolumes, responsible } = result.value;

        // Exibir um "carregando" enquanto o PDF é gerado
        Swal.fire({
          title: 'Gerando PDF...',
          text: 'Aguarde enquanto o PDF está sendo criado.',
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading(),
        });

        this.http.post(`${this.baseUrl}sells/${orderId}/label`, { totalVolumes, responsible }, { responseType: 'blob' }).subscribe({
          next: (pdfBlob) => {
            if (!pdfBlob || pdfBlob.size === 0) {
              Swal.fire({
                icon: 'error',
                title: 'Erro!',
                text: 'PDF gerado está vazio.',
                confirmButtonText: 'Ok',
              });
              return;
            }
            this.orderService.addVolumeSell(orderId, totalVolumes).subscribe({
              next: (resp) => {
                console.log('Volume atualizado:', resp);
              },
              error: (err) => {
                console.error('Erro ao atualizar volume:', err);
              },
            });

            const blob = new Blob([pdfBlob], { type: 'application/pdf' });
            const blobUrl = URL.createObjectURL(blob);
            const printWindow = window.open('', '_blank');

            if (printWindow) {
              printWindow.document.write(`
                <html>
                  <head><title>Etiqueta ${orderCode}</title></head>
                  <body style="margin:0">
                    <iframe src="${blobUrl}" style="border:none;width:100vw;height:100vh;" onload="this.contentWindow.print()"></iframe>
                  </body>
                </html>
              `);
              printWindow.document.close();
            }

            Swal.fire({
              icon: 'success',
              title: 'Etiqueta Gerada!',
              text: '',
              confirmButtonText: 'Ok',
            });
          },
          error: (err) => {
            Swal.fire({
              icon: 'error',
              title: 'Erro!',
              text: 'Não foi possível gerar a etiqueta.',
              confirmButtonText: 'Ok',
            });
            console.error('Erro ao gerar etiqueta:', err);
          },
        });
      }
    });
  }

  openSellerRankingModal(): void {
    const modalRef = this.modalService.open(SellerRankingModalComponent, {
      size: 'lg',
      centered: true,
      backdrop: 'static',
      keyboard: false,
    });

    modalRef.componentInstance.ranking = this.ranking; // <-- Aqui envia os dados
  }

  toggleSelectAll(): void {
    for (const order of this.paginatedOrders) {
      order.selected = this.selectAll;
    }
    this.updateSelection();
  }

  updateSelection(): void {
    this.selectedOrders = this.orders.filter((order) => order.selected);
    this.selectAll = this.paginatedOrders.every((order) => order.selected);
  }

  printSelectedOrders(): void {
    if (this.selectedOrders.length === 0) return;

    Swal.fire({
      title: 'Imprimir Pedidos Selecionados',
      html: `<p>Você selecionou <strong>${this.selectedOrders.length}</strong> pedido(s).</p>`,
      showCancelButton: true,
      confirmButtonText: 'Sim!',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.isConfirmed) {
        const responsible = this.user;

        Swal.fire({
          title: 'Gerando PDFs...',
          text: 'Aguarde enquanto os arquivos estão sendo criados.',
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading(),
        });

        const requests = this.selectedOrders.map((order) =>
          this.http.post(`${this.baseUrl}sells/${order.venda_id}/print`, { responsible }, { responseType: 'blob' }).toPromise(),
        );

        Promise.all(requests).then((pdfBlobs) => {
          const win = window.open('', '_blank');
          if (!win) return;

          const iframesHtml = pdfBlobs
            .filter((blob): blob is Blob => !!blob && blob.size > 0)
            .map((blob, index) => {
              const blobUrl = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
              return `<iframe src="${blobUrl}" style="width:100%;height:100vh;border:none;" id="pdf_${index}"></iframe>`;
            })
            .join('');

          win.document.write(`
            <html>
              <head><title>Pedidos Selecionados</title></head>
              <body style="margin:0;padding:0;">
                ${iframesHtml}
                <script>
                  window.onload = () => setTimeout(() => window.print(), 1000);
                </script>
              </body>
            </html>
          `);
          win.document.close();
          Swal.close();
        });
      }
    });
  }

  // generateLabelsForSelected(): void {
  //   if (this.selectedOrders.length === 0) return;

  //   Swal.fire({
  //     title: 'Imprimir Etiquetas',
  //     html: `
  //       <p>Você selecionou <strong>${this.selectedOrders.length}</strong> pedido(s).</p>
  //       <input id="totalVolumes" class="swal2-input" type="number" placeholder="Total de Volumes">
  //     `,
  //     showCancelButton: true,
  //     confirmButtonText: 'Sim!',
  //     cancelButtonText: 'Cancelar',
  //     preConfirm: () => {
  //       const totalVolumes = (document.getElementById('totalVolumes') as HTMLInputElement).value;

  //       if (!totalVolumes) {
  //         Swal.showValidationMessage('Por favor, informe o total de volumes.');
  //         return null;
  //       }
  //       if (isNaN(Number(totalVolumes)) || Number(totalVolumes) <= 0) {
  //         Swal.showValidationMessage('O número de volumes deve ser maior que zero.');
  //         return null;
  //       }

  //       return { totalVolumes: +totalVolumes };
  //     },
  //   }).then((result) => {
  //     if (result.isConfirmed && result.value) {
  //       const { totalVolumes } = result.value;
  //       const responsible = this.user;

  //       Swal.fire({
  //         title: 'Gerando Etiquetas...',
  //         text: 'Aguarde enquanto os arquivos estão sendo criados.',
  //         allowOutsideClick: false,
  //         didOpen: () => Swal.showLoading(),
  //       });

  //       const windows = this.selectedOrders.map(() => window.open('', '_blank'));

  //       const requests = this.selectedOrders.map((order, index) =>
  //         this.http
  //           .post(`${this.baseUrl}sells/${order.venda_id}/label`, { totalVolumes, responsible }, { responseType: 'blob' })
  //           .toPromise()
  //           .then((pdfBlob) => {
  //             if (!pdfBlob || pdfBlob.size === 0) {
  //               console.warn(`Etiqueta vazia para o pedido ${order.venda_id}`);
  //               return;
  //             }

  //             const blob = new Blob([pdfBlob], { type: 'application/pdf' });
  //             const blobUrl = URL.createObjectURL(blob);
  //             const win = windows[index];

  //             if (win) {
  //               win.document.write(`
  //                 <html>
  //                   <head><title>Etiqueta ${order.codigo}</title></head>
  //                   <body style="margin:0">
  //                     <iframe src="${blobUrl}" style="border:none;width:100vw;height:100vh;" onload="this.contentWindow.print()"></iframe>
  //                   </body>
  //                 </html>
  //               `);
  //               win.document.close();
  //             }
  //           })
  //           .catch((err) => {
  //             console.error(`Erro ao gerar etiqueta para pedido ${order.codigo}:`, err);
  //           }),
  //       );

  //       Promise.all(requests).finally(() => Swal.close());
  //     }
  //   });
  // }
}
