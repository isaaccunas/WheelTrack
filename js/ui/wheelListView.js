import { getWheelListStageDisplay } from "../domain/processModel.js";
import { getWheelSerialSummary } from "../domain/wheelModel.js";
import { refs } from "./domRefs.js";

// ==========================================
// RENDERIZAR LISTA DE RUEDAS
// ==========================================

export function renderWheelList(entries) {

    refs.wheelList.innerHTML = "";

    if (entries.length === 0) {

        refs.wheelList.innerHTML = `
            <p class="text-muted text-center py-3 mb-0">
                No se encontraron ruedas.
            </p>
        `;

        return;
    }

    entries.forEach(({ wheel, index }) => {

        const stageDisplay = getWheelListStageDisplay(wheel);

        refs.wheelList.innerHTML += `

            <div class="wheel-row">

                <div
                    style="cursor:pointer; flex:1"
                    onclick="showWheelDetail(${index})"
                >

                    <strong>
                        Nº: ${wheel.numeroRueda || "-"}
                        | S/N: ${getWheelSerialSummary(wheel)}
                    </strong>

                    <div>${wheel.avion || "-"}</div>

                    <small>${stageDisplay.label}</small>

                </div>

                <div class="wheel-actions">

                    <button
                        type="button"
                        class="action-btn maintenix-btn"
                        title="Maintenix"
                        onclick="event.stopPropagation(); showMaintenixPanel(${index})"
                    >
                        📋
                    </button>

                    <button
                        type="button"
                        class="action-btn edit-btn"
                        title="Editar"
                        onclick="event.stopPropagation(); editWheel(${index})"
                    >
                        <i class="fa-solid fa-pen"></i>
                    </button>

                    <button
                        type="button"
                        class="action-btn delete-btn"
                        title="Eliminar"
                        onclick="event.stopPropagation(); deleteWheel(${index})"
                    >
                        <i class="fa-solid fa-trash"></i>
                    </button>

                    <span class="status ${stageDisplay.colorClass}"></span>

                </div>

            </div>

        `;
    });
}
