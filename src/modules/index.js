import { DashboardModule } from './DashboardModule.jsx';
import { BirdManagementModule } from './BirdManagementModule.jsx';
import { BatchManagementModule } from './BatchManagementModule.jsx';
import { FeedManagementModule } from './FeedManagementModule.jsx';
import { MedicationManagementModule } from './MedicationManagementModule.jsx';
import { VaccinationManagementModule } from './VaccinationManagementModule.jsx';
import { EggProductionModule } from './EggProductionModule.jsx';
import { MortalityManagementModule } from './MortalityManagementModule.jsx';
import { SalesManagementModule } from './SalesManagementModule.jsx';
import { ExpensesManagementModule } from './ExpensesManagementModule.jsx';
import { InventoryManagementModule } from './InventoryManagementModule.jsx';
import { ReportsAnalyticsModule } from './ReportsAnalyticsModule.jsx';
import { SettingsModule } from './SettingsModule.jsx';
import { ModulePlaceholder } from './ModulePlaceholder.jsx';

/**
 * FreshNest Module Registry
 * Future module developers simply import and replace the placeholder component here
 * without modifying layout, sidebar, routing, or database architecture.
 */
export const MODULE_REGISTRY = {
  dashboard: DashboardModule,
  birds: BirdManagementModule,
  batches: BatchManagementModule,
  feed: FeedManagementModule,
  medication: MedicationManagementModule,
  vaccination: VaccinationManagementModule,
  eggs: EggProductionModule,
  mortality: MortalityManagementModule,
  sales: SalesManagementModule,
  expenses: ExpensesManagementModule,
  inventory: InventoryManagementModule,
  reports: ReportsAnalyticsModule,
  settings: SettingsModule,
};

export {
  DashboardModule,
  BirdManagementModule,
  BatchManagementModule,
  FeedManagementModule,
  MedicationManagementModule,
  VaccinationManagementModule,
  EggProductionModule,
  MortalityManagementModule,
  SalesManagementModule,
  ExpensesManagementModule,
  InventoryManagementModule,
  ReportsAnalyticsModule,
  SettingsModule,
  ModulePlaceholder,
};



