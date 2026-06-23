import * as wheelRepository from "./data/wheelRepository.js";
import { getDashboardKpis } from "./domain/kpiCalculator.js";
import { initializeEvents } from "./ui/events.js";
import { renderKpis } from "./ui/kpiView.js";
import { renderWheelList } from "./ui/wheelListView.js";

// ==========================================
// PUNTO DE ARRANQUE
// ==========================================

wheelRepository.load();

function renderWheels() {

    renderWheelList(wheelRepository.getAll());

    renderKpis(getDashboardKpis(wheelRepository.getAll()));
}

renderWheels();

initializeEvents(renderWheels);
