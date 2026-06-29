import * as wheelRepository from "./data/wheelRepository.js";
import { getDashboardKpis } from "./domain/kpiCalculator.js";
import { isWheelActive } from "./domain/wheelModel.js";
import { initializeEvents } from "./ui/events.js";
import { initializeRouteSheetView } from "./ui/routeSheetView.js";
import { initializeWheelFormValidation } from "./ui/wheelFormValidationView.js";
import { renderKpis } from "./ui/kpiView.js";
import {
    initializeBoxResourceView,
    renderBoxesInUse
} from "./ui/boxResourceView.js";
import { initializeProductivityCharts } from "./ui/productivityChartsModal.js";
import { initializeHistoricalTrendsModal } from "./ui/historicalTrendsModal.js";
import { initializeTatAnalyticsModal } from "./ui/tatAnalyticsModal.js";
import { initializeProcessedHistoryModal } from "./ui/processedHistoryModal.js";
import { renderProcessedWheelHistory } from "./ui/processedHistoryView.js";
import {
    filterWheels,
    getCurrentFilters,
    initializeSearchFilters
} from "./ui/searchFilterView.js";
import { renderWheelList } from "./ui/wheelListView.js";
import { initializeTvMonitor, refreshTvMonitorIfOpen } from "./ui/tvMonitorView.js";
import { renderWorkshopFlowLegend } from "./ui/workshopFlowLegendView.js";
import { renderWorkshopMonitor } from "./ui/workshopMonitorView.js";

// ==========================================
// PUNTO DE ARRANQUE
// ==========================================

wheelRepository.load();

function renderWheelListView(filters = getCurrentFilters()) {

    const allWheels = wheelRepository.getAll();
    const activeEntries = filterWheels(allWheels, filters)
        .filter(({ wheel }) => isWheelActive(wheel));

    renderWheelList(activeEntries);
}

function renderProcessedHistoryView() {

    renderProcessedWheelHistory(wheelRepository.getAll());
}

function renderWheels() {

    const allWheels = wheelRepository.getAll();

    renderWheelListView();

    renderProcessedHistoryView();

    renderWorkshopFlowLegend(allWheels);

    renderKpis(getDashboardKpis(allWheels));

    renderBoxesInUse(allWheels);

    renderWorkshopMonitor(allWheels);

    refreshTvMonitorIfOpen(allWheels);
}

renderWheels();

initializeSearchFilters(() => {

    renderWheelListView();
});

initializeEvents(renderWheels);

initializeRouteSheetView();

initializeWheelFormValidation();

initializeTvMonitor(() => wheelRepository.getAll());

initializeProcessedHistoryModal(() => wheelRepository.getAll());

initializeProductivityCharts(() => wheelRepository.getAll());

initializeHistoricalTrendsModal(() => wheelRepository.getAll());

initializeTatAnalyticsModal(() => wheelRepository.getAll());

initializeBoxResourceView(() => wheelRepository.getAll());
