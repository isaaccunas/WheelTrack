import * as wheelRepository from "./data/wheelRepository.js";
import {
    createWheel,
    normalizeFormData,
    validateWheel
} from "./domain/wheelModel.js";
import { getDashboardKpis } from "./domain/kpiCalculator.js";
import { refs } from "./ui/domRefs.js";
import { renderKpis } from "./ui/kpiView.js";
import { renderWheelList } from "./ui/wheelListView.js";
import { showWheelDetail as showWheelDetailView } from "./ui/wheelDetailView.js";
import {
    closeWheelModal,
    openWheelModal,
    populateWheelForm,
    resetWheelForm
} from "./ui/wheelFormView.js";

// ==========================================
// DATOS INICIALES
// ==========================================

wheelRepository.load();

let editIndex = null;

// ==========================================
// RENDERIZAR RUEDAS
// ==========================================

function renderWheels() {

    renderWheelList(wheelRepository.getAll());

    renderKpis(getDashboardKpis(wheelRepository.getAll()));
}

renderWheels();

// ==========================================
// ABRIR MODAL NUEVA RUEDA
// ==========================================

refs.btnNuevaRueda.addEventListener("click", () => {

    editIndex = null;

    resetWheelForm();

    openWheelModal();
});

// ==========================================
// GUARDAR RUEDA
// ==========================================

refs.guardarRueda.addEventListener("click", () => {

    const formData = normalizeFormData({

        numeroRueda: document.getElementById("numeroRueda").value,
        fechaRecepcion: document.getElementById("fechaRecepcion").value,
        avion: document.getElementById("avion").value,
        serial: document.getElementById("serial").value,
        fechaIngreso: document.getElementById("fechaIngreso").value,
        detalle: document.getElementById("detalle").value,
        wp: document.getElementById("wp").value,
        tireChange: document.getElementById("tireChange").value,
        shopVisit: document.getElementById("shopVisit").value,
        razon: document.getElementById("razon").value,
        estacion: document.getElementById("estacion").value,
        ciclos: document.getElementById("ciclos").value,
        estado: document.getElementById("estado").value
    });

    if (!validateWheel(formData)) {

        alert("Debes completar todos los campos obligatorios.");

        return;
    }

    const nuevaRueda = createWheel(formData);

    if (editIndex !== null) {

        wheelRepository.update(editIndex, nuevaRueda);

        editIndex = null;

    } else {

        wheelRepository.add(nuevaRueda);
    }

    renderWheels();

    resetWheelForm();

    closeWheelModal();

    alert("Datos guardados correctamente.");
});

// ==========================================
// EDITAR RUEDA
// ==========================================

function editWheel(index) {

    const wheel = wheelRepository.getById(index);

    editIndex = index;

    populateWheelForm(wheel);

    openWheelModal();
}

// ==========================================
// ELIMINAR RUEDA
// ==========================================

function deleteWheel(index) {

    const wheel = wheelRepository.getById(index);

    const confirmar = confirm(
        `¿Deseas eliminar la rueda S/N: ${wheel.serial}?`
    );

    if (!confirmar) return;

    wheelRepository.remove(index);

    renderWheels();
}

// ==========================================
// MOSTRAR DETALLE
// ==========================================

function showWheelDetail(index) {

    showWheelDetailView(wheelRepository.getById(index));
}

window.editWheel = editWheel;
window.deleteWheel = deleteWheel;
window.showWheelDetail = showWheelDetail;
