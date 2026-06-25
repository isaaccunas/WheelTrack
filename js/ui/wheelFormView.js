import {
    getAvailableBoxNumbers,
    normalizeBoxData
} from "../domain/wheelModel.js";
import { refs } from "./domRefs.js";

// ==========================================
// MODAL DE FORMULARIO
// ==========================================

export function openWheelModal() {

    refs.modalRueda.show();
}

export function closeWheelModal() {

    refs.modalRueda.hide();
}

// ==========================================
// FORMULARIO
// ==========================================

export function resetWheelForm() {

    document.getElementById("formNuevaRueda").reset();
}

export function populateBoxOptions(wheels, editIndex = null) {

    const boxSelect = document.getElementById("boxNumber");

    if (!boxSelect) {
        return;
    }

    const currentWheel = editIndex !== null ? wheels[editIndex] : null;
    const currentBox = currentWheel
        ? normalizeBoxData(currentWheel.boxData).boxNumber
        : null;

    let availableBoxes = getAvailableBoxNumbers(wheels, editIndex);

    if (currentBox !== null && !availableBoxes.includes(currentBox)) {

        availableBoxes = [...availableBoxes, currentBox].sort((a, b) => a - b);
    }

    boxSelect.innerHTML = `
        <option value="">Seleccione caja</option>
        ${availableBoxes.map((boxNumber) => `
            <option value="${boxNumber}">
                CAJA ${boxNumber}
            </option>
        `).join("")}
    `;

    if (currentBox !== null) {
        boxSelect.value = String(currentBox);
    }
}

export function populateWheelForm(wheel) {

    document.getElementById("numeroRueda").value = wheel.numeroRueda || "";
    document.getElementById("fechaRecepcion").value = wheel.fechaRecepcion || "";
    document.getElementById("avion").value = wheel.avion || "";
    document.getElementById("serial").value = wheel.serial || "";
    document.getElementById("fechaIngreso").value = wheel.fechaIngreso || "";
    document.getElementById("detalle").value = wheel.detalle || "";
    document.getElementById("wp").value = wheel.wp || "";
    document.getElementById("tireChange").value = wheel.tireChange || "";
    document.getElementById("shopVisit").value = wheel.shopVisit || "";
    document.getElementById("razon").value = wheel.razon || "";
    document.getElementById("estacion").value = wheel.estacion || "";
    document.getElementById("ciclos").value = wheel.ciclos || "";
    document.getElementById("wheelType").value = wheel.wheelType || "";
    document.getElementById("boxNumber").value = normalizeBoxData(wheel.boxData).boxNumber ?? "";
    document.getElementById("estado").value = wheel.estado || "";
}
