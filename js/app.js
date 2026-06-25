import * as wheelRepository from "./data/wheelRepository.js";
import { getDashboardKpis } from "./domain/kpiCalculator.js";
import { isWheelActive } from "./domain/wheelModel.js";
import { initializeEvents } from "./ui/events.js";
import { initializeRouteSheetView } from "./ui/routeSheetView.js";
import { initializeWheelFormValidation } from "./ui/wheelFormValidationView.js";
import { renderKpis } from "./ui/kpiView.js";
import { renderProcessedWheelHistory } from "./ui/processedHistoryView.js";
import {
    filterWheels,
    getCurrentFilters,
    initializeSearchFilters,
    isFullListVisible
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

    renderWheelList(
        activeEntries,
        { persist: isFullListVisible(filters) }
    );
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
