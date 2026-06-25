import { getCurrentStage, PROCESS_STAGES } from "../domain/processModel.js";
import {
    formatBoxLabel,
    normalizeWheelSerialData,
    normalizeWheelType
} from "../domain/wheelModel.js";

// ==========================================
// AGRUPACIÓN POR ETAPA ACTUAL
// ==========================================

export function groupWheelsByCurrentStage(wheels) {

    const grouped = PROCESS_STAGES.reduce((groups, stageName) => {

        groups[stageName] = [];

        return groups;
    }, {});

    wheels.forEach((wheel, index) => {

        const currentStage = getCurrentStage(wheel.process);

        if (currentStage && grouped[currentStage]) {

            grouped[currentStage].push({ wheel, index });
        }
    });

    return grouped;
}

function getMonitorCardSerialLabel(wheel) {

    const wheelSerialData = normalizeWheelSerialData(
        wheel.wheelSerialData,
        wheel.serial
    );

    if (wheelSerialData.inner && wheelSerialData.outer) {

        return `S/N: ${wheelSerialData.inner} / ${wheelSerialData.outer}`;
    }

    const singleSerial = wheelSerialData.inner || wheelSerialData.outer;

    if (singleSerial) {

        return `S/N: ${singleSerial}`;
    }

    return "S/N: NO ASIGNADO";
}

function renderMonitorCard({ wheel, index }) {

    const wheelType = normalizeWheelType(wheel.wheelType);

    return `
        <button
            type="button"
            class="monitor-card"
            onclick="showWheelDetail(${index})">

            <span class="monitor-card-number">
                Nº ${wheel.numeroRueda || "-"}
            </span>

            <span class="monitor-card-serial">
                ${getMonitorCardSerialLabel(wheel)}
            </span>

            <span class="monitor-card-type monitor-card-type-${wheelType.toLowerCase()}">
                ${wheelType}
            </span>

            <span class="monitor-card-box">
                ${formatBoxLabel(wheel.boxData)}
            </span>

        </button>
    `;
}

function renderMonitorColumn(stageName, entries) {

    const cardsMarkup = entries.length > 0
        ? entries.map(renderMonitorCard).join("")
        : `
            <p class="monitor-column-empty mb-0">
                Sin ruedas
            </p>
        `;

    return `
        <div class="monitor-column">

            <div class="monitor-column-header">

                <h4 class="monitor-column-title">
                    ${stageName} (${entries.length})
                </h4>

            </div>

            <div class="monitor-column-body">
                ${cardsMarkup}
            </div>

        </div>
    `;
}

// ==========================================
// RENDER DEL MONITOR
// ==========================================

export function renderWorkshopMonitor(wheels) {

    const board = document.getElementById("workshopMonitorBoard");

    if (!board) {
        return;
    }

    const groupedWheels = groupWheelsByCurrentStage(wheels);

    board.innerHTML = PROCESS_STAGES
        .map((stageName) =>
            renderMonitorColumn(stageName, groupedWheels[stageName])
        )
        .join("");
}
