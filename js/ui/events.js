import * as wheelRepository from "../data/wheelRepository.js";
import {
    completeWheelSubstage,
    createWheel,
    normalizeFormData,
    updateWheel,
    validateWheel
} from "../domain/wheelModel.js";
import { refs } from "./domRefs.js";
import {
    refreshWheelDetail,
    showWheelDetail as showWheelDetailView
} from "./wheelDetailView.js";
import {
    closeWheelModal,
    openWheelModal,
    populateWheelForm,
    resetWheelForm
} from "./wheelFormView.js";

// ==========================================
// INICIALIZAR EVENTOS
// ==========================================

export function initializeEvents(renderWheels) {

    let editIndex = null;

    // ==========================================
    // NUEVA RUEDA
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

        if (editIndex !== null) {

            const existingWheel = wheelRepository.getById(editIndex);

            wheelRepository.update(
                editIndex,
                updateWheel(existingWheel, formData)
            );

            editIndex = null;

        } else {

            wheelRepository.add(createWheel(formData));
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

        const handleCompleteSubstage = (stageName, substageName) => {

            const currentWheel = wheelRepository.getById(index);
            const updatedWheel = completeWheelSubstage(
                currentWheel,
                stageName,
                substageName
            );

            if (!updatedWheel) {
                return;
            }

            wheelRepository.update(index, updatedWheel);

            renderWheels();

            refreshWheelDetail({
                wheel: wheelRepository.getById(index),
                onCompleteSubstage: handleCompleteSubstage
            });
        };

        showWheelDetailView({
            wheel: wheelRepository.getById(index),
            onCompleteSubstage: handleCompleteSubstage
        });
    }

    window.editWheel = editWheel;
    window.deleteWheel = deleteWheel;
    window.showWheelDetail = showWheelDetail;
}
