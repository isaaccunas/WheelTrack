import * as wheelRepository from "./data/wheelRepository.js";
import {
    createWheel,
    normalizeFormData,
    validateWheel
} from "./domain/wheelModel.js";
import { getDashboardKpis } from "./domain/kpiCalculator.js";
import { refs } from "./ui/domRefs.js";
import { renderWheelList } from "./ui/wheelListView.js";
import { showWheelDetail as showWheelDetailView } from "./ui/wheelDetailView.js";

// ==========================================
// DATOS INICIALES
// ==========================================

wheelRepository.load();

let editIndex = null;

// ==========================================
// RENDERIZAR RUEDAS
// ==========================================

function renderKpis() {

    const kpis = getDashboardKpis(wheelRepository.getAll());

    document.getElementById("totalProcesadas").textContent = kpis.totalProcessed;

    document.getElementById("ruedasSemana").textContent = kpis.weeklyCount;

    const distributionValues = document.querySelectorAll(".distribution strong");

    if (distributionValues.length >= 2) {

        distributionValues[0].textContent = kpis.nwCount;
        distributionValues[1].textContent = kpis.mwCount;
    }
}

function renderWheels() {

    renderWheelList(wheelRepository.getAll());

    renderKpis();
}

renderWheels();

// ==========================================
// ABRIR MODAL NUEVA RUEDA
// ==========================================

refs.btnNuevaRueda.addEventListener("click", () => {

    editIndex = null;

    document.getElementById("formNuevaRueda").reset();

    refs.modalRueda.show();
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

    document.getElementById("formNuevaRueda").reset();

    refs.modalRueda.hide();

    alert("Datos guardados correctamente.");
});

// ==========================================
// EDITAR RUEDA
// ==========================================

function editWheel(index) {

    const wheel = wheelRepository.getById(index);

    editIndex = index;

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
    document.getElementById("estado").value = wheel.estado || "";

    refs.modalRueda.show();
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
