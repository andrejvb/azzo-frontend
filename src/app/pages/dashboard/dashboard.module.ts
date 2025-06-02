import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DashboardComponent } from './dashboard.component';
import { ModalsModule } from '../../_metronic/partials';
import { AuthGuard } from '../../core/guards/auth.guard';
import { SalesComparisonResolver } from './sales-comparison.resolver';
import { DebtsComparisonResolver } from './debts-comparison.resolver';
import { FormsModule } from '@angular/forms';

@NgModule({
  declarations: [DashboardComponent],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule.forChild([
      {
        path: '',
        component: DashboardComponent,
        resolve: {
          salesPerformance: SalesComparisonResolver,
          debtsPerformance: DebtsComparisonResolver,
        },
        canActivate: [AuthGuard],
      },
    ]),
    ModalsModule,
  ],
})
export class DashboardModule {}
