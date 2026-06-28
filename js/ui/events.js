import * as wheelRepository from "../data/wheelRepository.js";
import {
    closeWheelOrder,
    completeWheelSubstage,
    createWheel,
    getWheelSerialSummary,
    isAlmacenStageCompleted,
    isWheelActive,
    normalizeFormData,
    updateWheel,
    updateWheelInspectorData,
    updateWheelPressureData,
    updateWheelServiceableData,
    updateWheelTireAssignment,
    validateBoxAssignment,
    validateWheel,
    validateWheelClosure
} from "../domain/wheelModel.js";
import { showMaintenixPanel } from "./maintenixPanelView.js";
import {
    downloadRouteSheetPdf,
    printRouteSheet
} from "./routeSheetView.js";
import {
    openOperationalSection,
    refreshWheelDetail,
    showWheelDetail as showWheelDetailView
} from "./wheelDetailView.js";
import {
    closeWheelModal,
    openWheelModal,
    populateBoxOptions,
    populateWheelForm,
    resetWheelForm
} from "./wheelFormView.js";
import { showWheelFormValidationErrors } from "./wheelFormValidationView.js";

import { refs } from "./domRefs.js";

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

        populateBoxOptions(wheelRepository.getAll(), null);

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
            serialInner: document.getElementById("serialInner").value,
            serialOuter: document.getElementById("serialOuter").value,
            tireOffSerial: document.getElementById("tireOffSerial").value,
            fechaIngreso: document.getElementById("fechaIngreso").value,
            detalle: document.getElementById("detalle").value,
            wp: document.getElementById("wp").value,
            tireChange: document.getElementById("tireChange").value,
            shopVisit: document.getElementById("shopVisit").value,
            razon: document.getElementById("razon").value,
            estacion: document.getElementById("estacion").value,
            ciclos: document.getElementById("ciclos").value,
            wheelType: document.getElementById("wheelType").value,
            boxNumber: document.getElementById("boxNumber").value
        });

        if (!validateWheel(formData)) {

            showWheelFormValidationErrors(formData);

            alert("Debes completar todos los campos obligatorios.");

            return;
        }

        if (!validateBoxAssignment(
            wheelRepository.getAll(),
            formData.boxNumber,
            editIndex
        )) {

            alert("La caja seleccionada no está disponible.");

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

        populateBoxOptions(wheelRepository.getAll(), index);

        populateWheelForm(wheel);

        openWheelModal();
    }

    // ==========================================
    // ELIMINAR RUEDA
    // ==========================================

    function deleteWheel(index) {

        const wheel = wheelRepository.getById(index);

        const confirmar = confirm(
            `¿Deseas eliminar la rueda S/N: ${getWheelSerialSummary(wheel)}?`
        );

        if (!confirmar) return;

        wheelRepository.remove(index);

        renderWheels();
    }

    // ==========================================
    // MOSTRAR DETALLE
    // ==========================================

    function createWheelDetailCallbacks(index) {

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

            const almacenJustCompleted = (
                isWheelActive(updatedWheel) &&
                !isAlmacenStageCompleted(currentWheel.process) &&
                isAlmacenStageCompleted(updatedWheel.process)
            );

            if (almacenJustCompleted) {

                const shouldClose = confirm(
                    "¿Desea cerrar esta orden y moverla al historial de ruedas procesadas?"
                );

                if (shouldClose) {

                    const wheelToClose = wheelRepository.getById(index);
                    const closureValidation = validateWheelClosure(wheelToClose);

                    if (!closureValidation.valid) {

                        alert(
                            "No se puede cerrar la orden.\n\n" +
                            "Faltan los siguientes datos:\n\n" +
                            closureValidation.missingFields
                                .map((field) => `• ${field}`)
                                .join("\n") +
                            "\n\nComplete la información antes de cerrar la rueda."
                        );

                    } else {

                        wheelRepository.update(
                            index,
                            closeWheelOrder(wheelToClose)
                        );
                    }
                }
            }

            renderWheels();

            refreshWheelDetail(createWheelDetailCallbacks(index));
        };

        const handleSaveTireAssignment = (data) => {

            const currentWheel = wheelRepository.getById(index);
            const updatedWheel = updateWheelTireAssignment(currentWheel, data);

            if (!updatedWheel) {
                alert("Completa S/N, Part Number y fecha de emisión del caucho.");
                return;
            }

            wheelRepository.update(index, updatedWheel);

            refreshWheelDetail(createWheelDetailCallbacks(index));
        };

        const handleSavePressureData = (data) => {

            const currentWheel = wheelRepository.getById(index);
            const updatedWheel = updateWheelPressureData(currentWheel, data);

            if (!updatedWheel) {
                alert("Registra al menos un dato de presión inicial o final.");
                return;
            }

            wheelRepository.update(index, updatedWheel);

            refreshWheelDetail(createWheelDetailCallbacks(index));
        };

        const handleSaveInspectorData = (data) => {

            const currentWheel = wheelRepository.getById(index);
            const updatedWheel = updateWheelInspectorData(currentWheel, data);

            if (!updatedWheel) {
                alert("Ingresa el nombre del inspector.");
                return;
            }

            wheelRepository.update(index, updatedWheel);

            refreshWheelDetail(createWheelDetailCallbacks(index));
        };

        const handleSaveServiceableData = (data) => {

            const currentWheel = wheelRepository.getById(index);
            const updatedWheel = updateWheelServiceableData(currentWheel, data);

            if (!updatedWheel) {
                alert("Ingresa el número de documento del serviciable.");
                return;
            }

            wheelRepository.update(index, updatedWheel);

            refreshWheelDetail(createWheelDetailCallbacks(index));
        };

        return {
            wheel: wheelRepository.getById(index),
            onCompleteSubstage: handleCompleteSubstage,
            onSaveTireAssignment: handleSaveTireAssignment,
            onSavePressureData: handleSavePressureData,
            onSaveInspectorData: handleSaveInspectorData,
            onSaveServiceableData: handleSaveServiceableData,
            onOpenOperationalSection: openOperationalSection
        };
    }

    function showWheelDetail(index) {

        showWheelDetailView(createWheelDetailCallbacks(index));
    }

    function openMaintenixPanelForWheel(index) {

        showMaintenixPanel(wheelRepository.getById(index));
    }

    function printProcessedRouteSheet(index) {

        printRouteSheet(wheelRepository.getById(index));
    }

    async function downloadProcessedRouteSheetPdf(index) {

        await downloadRouteSheetPdf(wheelRepository.getById(index));
    }

    window.editWheel = editWheel;
    window.deleteWheel = deleteWheel;
    window.showWheelDetail = showWheelDetail;
    window.showMaintenixPanel = openMaintenixPanelForWheel;
    window.printProcessedRouteSheet = printProcessedRouteSheet;
    window.downloadProcessedRouteSheetPdf = downloadProcessedRouteSheetPdf;
}
