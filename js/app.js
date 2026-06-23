import { getColorForState } from "./config/wheelStates.js";
import * as wheelRepository from "./data/wheelRepository.js";
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

function renderWheels() {

    renderWheelList(wheelRepository.getAll());
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

    const numeroRueda = document.getElementById("numeroRueda").value.trim();
    const fechaRecepcion = document.getElementById("fechaRecepcion").value;
    const avion = document.getElementById("avion").value.trim();
    const serial = document.getElementById("serial").value.trim();
    const fechaIngreso = document.getElementById("fechaIngreso").value;
    const detalle = document.getElementById("detalle").value.trim();
    const wp = document.getElementById("wp").value.trim();
    const tireChange = document.getElementById("tireChange").value;
    const shopVisit = document.getElementById("shopVisit").value.trim();
    const razon = document.getElementById("razon").value.trim();
    const estacion = document.getElementById("estacion").value.trim();
    const ciclos = document.getElementById("ciclos").value.trim();
    const estado = document.getElementById("estado").value;

    if (
        !numeroRueda ||
        !fechaRecepcion ||
        !avion ||
        !serial ||
        !fechaIngreso ||
        !detalle ||
        !wp ||
        !tireChange ||
        !shopVisit ||
        !razon ||
        !estacion ||
        !ciclos ||
        !estado
    ) {

        alert("Debes completar todos los campos obligatorios.");

        return;
    }

    const color = getColorForState(estado);

    const nuevaRueda = {

        numeroRueda,
        fechaRecepcion,
        avion,
        serial,
        fechaIngreso,
        detalle,
        wp,
        tireChange,
        shopVisit,
        razon,
        estacion,
        ciclos,
        estado,
        color
    };

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
