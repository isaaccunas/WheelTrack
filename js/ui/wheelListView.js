import { saveWheels } from "../data/storage.js";
import { refs } from "./domRefs.js";

// ==========================================
// RENDERIZAR LISTA DE RUEDAS
// ==========================================

export function renderWheelList(entries, options = {}) {

    const { persist = true } = options;

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

        refs.wheelList.innerHTML += `

            <div class="wheel-row">

                <div
                    style="cursor:pointer; flex:1"
                    onclick="showWheelDetail(${index})"
                >

                    <strong>
                        Nº: ${wheel.numeroRueda || "-"}
                        | S/N: ${wheel.serial}
                    </strong>

                    <div>${wheel.avion || "-"}</div>

                    <small>${wheel.estado}</small>

                </div>

                <div class="wheel-actions">

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

                    <span class="status ${wheel.color}"></span>

                </div>

            </div>

        `;
    });

    if (persist) {

        saveWheels(entries.map(({ wheel }) => wheel));
    }
}
