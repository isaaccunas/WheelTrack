import { getWheelSerialSummary } from "../domain/wheelModel.js";
import {
    getProcessedWheelEntries,
    renderProcessedWheelCards
} from "./processedHistoryView.js";

let processedHistoryModal = null;
let allProcessedEntries = [];
let getWheels = null;

function filterProcessedEntries(entries, query) {

    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
        return entries;
    }

    return entries.filter(({ wheel }) => {

        const numeroRueda = (wheel.numeroRueda ?? "").toLowerCase();
        const avion = (wheel.avion ?? "").toLowerCase();
        const serial = getWheelSerialSummary(wheel).toLowerCase();

        return (
            numeroRueda.includes(normalizedQuery) ||
            avion.includes(normalizedQuery) ||
            serial.includes(normalizedQuery)
        );
    });
}

function renderProcessedHistoryModalList(entries) {

    const listContainer = document.getElementById("processedHistoryModalList");

    if (!listContainer) {
        return;
    }

    if (entries.length === 0) {

        listContainer.innerHTML = `
            <p class="processed-history-empty mb-0">
                No se encontraron ruedas procesadas.
            </p>
        `;

        return;
    }

    listContainer.innerHTML = renderProcessedWheelCards(entries);
}

export function openProcessedHistoryModal(wheels) {

    const modalElement = document.getElementById("modalProcessedHistory");
    const searchInput = document.getElementById("processedHistoryModalSearch");

    if (!modalElement) {
        return;
    }

    allProcessedEntries = getProcessedWheelEntries(wheels);

    if (searchInput) {
        searchInput.value = "";
    }

    renderProcessedHistoryModalList(allProcessedEntries);

    if (!processedHistoryModal) {
        processedHistoryModal = new bootstrap.Modal(modalElement);
    }

    processedHistoryModal.show();
}

export function initializeProcessedHistoryModal(getWheelsFn) {

    const modalElement = document.getElementById("modalProcessedHistory");
    const searchInput = document.getElementById("processedHistoryModalSearch");
    const kpiCard = document.getElementById("totalProcessedKpiCard");

    if (!modalElement || typeof getWheelsFn !== "function") {
        return;
    }

    getWheels = getWheelsFn;
    processedHistoryModal = new bootstrap.Modal(modalElement);

    if (kpiCard) {

        kpiCard.addEventListener("click", () => {

            openProcessedHistoryModal(getWheels());
        });

        kpiCard.addEventListener("keydown", (event) => {

            if (event.key === "Enter" || event.key === " ") {

                event.preventDefault();
                openProcessedHistoryModal(getWheels());
            }
        });
    }

    if (searchInput) {

        searchInput.addEventListener("input", (event) => {

            renderProcessedHistoryModalList(
                filterProcessedEntries(allProcessedEntries, event.target.value)
            );
        });
    }

    window.openProcessedHistoryModal = () => {

        openProcessedHistoryModal(getWheels());
    };
}

export function refreshProcessedHistoryModal() {

    const modalElement = document.getElementById("modalProcessedHistory");

    if (!modalElement?.classList.contains("show")) {
        return;
    }

    const searchInput = document.getElementById("processedHistoryModalSearch");
    const query = searchInput?.value ?? "";

    allProcessedEntries = getProcessedWheelEntries(
        typeof getWheels === "function" ? getWheels() : []
    );

    renderProcessedHistoryModalList(
        filterProcessedEntries(allProcessedEntries, query)
    );
}
