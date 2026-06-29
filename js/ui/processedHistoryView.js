import {
    formatBoxLabel,
    formatClosedDate,
    getWheelSerialSummary,
    getWheelTotalProcessMinutes,
    getWheelTypeLabel,
    isWheelProcessed,
    normalizeOperationalStatus
} from "../domain/wheelModel.js";
import { formatDurationMinutes } from "../domain/kpiCalculator.js";

const DASHBOARD_PROCESSED_LIMIT = 3;

export function getProcessedWheelEntries(wheels) {

    return wheels
        .map((wheel, index) => ({ wheel, index }))
        .filter(({ wheel }) => isWheelProcessed(wheel))
        .sort((entryA, entryB) => {

            const closedAtA = normalizeOperationalStatus(
                entryA.wheel.operationalStatus
            ).closedAt;
            const closedAtB = normalizeOperationalStatus(
                entryB.wheel.operationalStatus
            ).closedAt;

            return new Date(closedAtB || 0) - new Date(closedAtA || 0);
        });
}

export function renderProcessedWheelCard({ wheel, index }) {

    const serialSummary = getWheelSerialSummary(wheel);

    return `
        <div class="processed-history-row">

            <div class="processed-history-content">

                <div class="processed-history-main">

                    <strong class="processed-history-number">
                        #${wheel.numeroRueda || "-"}
                    </strong>

                    <span class="processed-history-serial">
                        S/N ${serialSummary}
                    </span>

                    <span class="processed-history-aircraft">
                        ${wheel.avion || "-"}
                    </span>

                </div>

                <div class="processed-history-meta">

                    <span>${getWheelTypeLabel(wheel.wheelType)}</span>
                    <span>${formatBoxLabel(wheel.boxData)}</span>
                    <span>Cierre: ${formatClosedDate(normalizeOperationalStatus(wheel.operationalStatus).closedAt)}</span>
                    <span>Tiempo: ${formatDurationMinutes(getWheelTotalProcessMinutes(wheel))}</span>

                </div>

            </div>

            <div class="processed-history-actions">

                <button
                    type="button"
                    class="processed-history-action-btn"
                    title="Ver detalle"
                    onclick="showWheelDetail(${index})">

                    👁

                </button>

                <button
                    type="button"
                    class="processed-history-action-btn"
                    title="Imprimir hoja"
                    onclick="printProcessedRouteSheet(${index})">

                    🖨

                </button>

                <button
                    type="button"
                    class="processed-history-action-btn"
                    title="Descargar PDF"
                    onclick="downloadProcessedRouteSheetPdf(${index})">

                    📥

                </button>

                <button
                    type="button"
                    class="processed-history-action-btn processed-history-action-archive"
                    title="Archivar rueda"
                    onclick="openArchiveWheelModal(${index})">

                    📦

                </button>

            </div>

        </div>
    `;
}

export function renderProcessedWheelCards(entries) {

    return entries.map((entry) => renderProcessedWheelCard(entry)).join("");
}

export function renderProcessedWheelHistory(wheels) {

    const container = document.getElementById("processedWheelList");

    if (!container) {
        return;
    }

    const processedEntries = getProcessedWheelEntries(wheels);
    const recentProcessed = processedEntries.slice(0, DASHBOARD_PROCESSED_LIMIT);

    if (recentProcessed.length === 0) {

        container.innerHTML = `
            <p class="processed-history-empty mb-0">
                No hay ruedas procesadas cerradas.
            </p>
        `;

        return;
    }

    container.innerHTML = renderProcessedWheelCards(recentProcessed);
}
