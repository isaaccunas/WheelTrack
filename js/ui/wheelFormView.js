import { getAvailableBoxIds } from "../domain/boxResourceModel.js";
import {
    normalizeBoxAssignments,
    normalizeBoxData,
    normalizeTireOffData,
    normalizeWheelSerialData
} from "../domain/wheelModel.js";
import { refs } from "./domRefs.js";
import { clearWheelFormValidationErrors } from "./wheelFormValidationView.js";
import { refreshWheelFormPreview } from "./boxResourceView.js";

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
    clearWheelFormValidationErrors();
    refreshWheelFormPreview();
}

function buildBoxSelectOptions(availableBoxes, currentValue = null) {

    let boxes = [...availableBoxes];

    if (currentValue !== null && !boxes.includes(currentValue)) {
        boxes = [...boxes, currentValue].sort((a, b) => a - b);
    }

    return `
        <option value="">Seleccione caja</option>
        ${boxes.map((boxNumber) => `
            <option value="${boxNumber}">
                CAJA ${boxNumber}
            </option>
        `).join("")}
    `;
}

export function populateBoxOptions(wheels, editIndex = null) {

    const primarySelect = document.getElementById("primaryBoxNumber");
    const secondarySelect = document.getElementById("secondaryBoxNumber");

    if (!primarySelect || !secondarySelect) {
        return;
    }

    const currentWheel = editIndex !== null ? wheels[editIndex] : null;
    const assignments = currentWheel
        ? normalizeBoxAssignments(currentWheel.boxAssignments)
        : normalizeBoxAssignments(null);
    const legacyBox = currentWheel
        ? normalizeBoxData(currentWheel.boxData).boxNumber
        : null;

    const currentPrimary = assignments.primaryBox?.id ?? legacyBox;
    const currentSecondary = assignments.secondaryBox?.id ?? null;
    const availableBoxes = getAvailableBoxIds(wheels, editIndex);

    primarySelect.innerHTML = buildBoxSelectOptions(availableBoxes, currentPrimary);
    secondarySelect.innerHTML = buildBoxSelectOptions(availableBoxes, currentSecondary);

    if (currentPrimary !== null) {
        primarySelect.value = String(currentPrimary);
    }

    if (currentSecondary !== null) {
        secondarySelect.value = String(currentSecondary);
    }
}

export function populateWheelForm(wheel) {

    clearWheelFormValidationErrors();

    document.getElementById("numeroRueda").value = wheel.numeroRueda || "";
    document.getElementById("fechaRecepcion").value = wheel.fechaRecepcion || "";
    document.getElementById("avion").value = wheel.avion || "";

    const wheelSerialData = normalizeWheelSerialData(
        wheel.wheelSerialData,
        wheel.serial
    );
    const tireOffData = normalizeTireOffData(wheel.tireOffData);

    document.getElementById("serialInner").value = wheelSerialData.inner || "";
    document.getElementById("serialOuter").value = wheelSerialData.outer || "";
    document.getElementById("tireOffSerial").value = tireOffData.serialNumber || "";
    document.getElementById("fechaIngreso").value = wheel.fechaIngreso || "";
    document.getElementById("detalle").value = wheel.detalle || "";
    document.getElementById("wp").value = wheel.wp || "";
    document.getElementById("tireChange").value = wheel.tireChange || "";
    document.getElementById("shopVisit").value = wheel.shopVisit || "";
    document.getElementById("razon").value = wheel.razon || "";
    document.getElementById("estacion").value = wheel.estacion || "";
    document.getElementById("ciclos").value = wheel.ciclos || "";
    document.getElementById("wheelType").value = wheel.wheelType || "";

    const assignments = normalizeBoxAssignments(wheel.boxAssignments);
    const legacyBox = normalizeBoxData(wheel.boxData).boxNumber;

    document.getElementById("primaryBoxNumber").value =
        assignments.primaryBox?.id ?? legacyBox ?? "";
    document.getElementById("secondaryBoxNumber").value =
        assignments.secondaryBox?.id ?? "";

    refreshWheelFormPreview();
}
