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

    renderWheelListView();

    renderKpis(getDashboardKpis(wheelRepository.getAll()));
}

renderWheels();

initializeSearchFilters(() => {

    renderWheelListView();
});

initializeEvents(renderWheels);
