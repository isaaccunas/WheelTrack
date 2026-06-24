import * as wheelRepository from "./data/wheelRepository.js";
import { getDashboardKpis } from "./domain/kpiCalculator.js";
import { initializeEvents } from "./ui/events.js";
import { renderKpis } from "./ui/kpiView.js";
import {
    filterWheels,
    getCurrentFilters,
    initializeSearchFilters,
    isFullListVisible
} from "./ui/searchFilterView.js";
import { renderWheelList } from "./ui/wheelListView.js";
import { renderWorkshopMonitor } from "./ui/workshopMonitorView.js";

// ==========================================
// PUNTO DE ARRANQUE
// ==========================================

wheelRepository.load();

function renderWheelListView(filters = getCurrentFilters()) {

    const allWheels = wheelRepository.getAll();

    renderWheelList(
        filterWheels(allWheels, filters),
        { persist: isFullListVisible(filters) }
    );
}

function renderWheels() {

    const allWheels = wheelRepository.getAll();

    renderWheelListView();

    renderKpis(getDashboardKpis(allWheels));

    renderWorkshopMonitor(allWheels);
}

renderWheels();

initializeSearchFilters(() => {

    renderWheelListView();
});

initializeEvents(renderWheels);
