import { getWheelsCountByStage } from "../domain/kpiCalculator.js";
import { PROCESS_STAGES, STAGE_INDICATOR_COLORS } from "../domain/processModel.js";
import { isWheelActive } from "../domain/wheelModel.js";

// ==========================================
// LEYENDA DEL FLUJO (TIEMPO REAL)
// ==========================================

export function renderWorkshopFlowLegend(wheels) {

    const container = document.getElementById("workshopFlowLegend");

    if (!container) {
        return;
    }

    const activeWheels = wheels.filter((wheel) => isWheelActive(wheel));
    const wheelsByStage = getWheelsCountByStage(activeWheels);

    container.innerHTML = PROCESS_STAGES.map((stageName) => `

        <div class="workshop-flow-legend-item">

            <span
                class="dot ${STAGE_INDICATOR_COLORS[stageName] ?? "bg-gray"}"
                aria-hidden="true">
            </span>

            <strong class="workshop-flow-legend-label">
                ${stageName} (${wheelsByStage[stageName] ?? 0})
            </strong>

        </div>

    `).join("");
}
