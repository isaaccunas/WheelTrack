import {
    archiveProcessedWheel,
    getWheelSerialSummary
} from "../domain/wheelModel.js";

let archiveWheelModal = null;
let pendingArchiveIndex = null;
let getWheels = null;
let onArchiveComplete = null;

function getWheelByIndex(index) {

    const wheels = typeof getWheels === "function" ? getWheels() : [];

    return wheels[index] ?? null;
}

function updateArchiveModalContent(wheel) {

    const numberElement = document.getElementById("archiveWheelNumber");
    const serialElement = document.getElementById("archiveWheelSerial");

    if (numberElement) {
        numberElement.textContent = `#${wheel.numeroRueda || "-"}`;
    }

    if (serialElement) {
        serialElement.textContent = getWheelSerialSummary(wheel);
    }
}

export function openArchiveWheelModal(wheelIndex) {

    const modalElement = document.getElementById("archiveWheelModal");
    const wheel = getWheelByIndex(wheelIndex);

    if (!modalElement || !wheel) {
        return;
    }

    pendingArchiveIndex = wheelIndex;
    updateArchiveModalContent(wheel);

    if (!archiveWheelModal) {
        archiveWheelModal = new bootstrap.Modal(modalElement);
    }

    archiveWheelModal.show();
}

function confirmArchiveWheel() {

    if (pendingArchiveIndex === null) {
        return;
    }

    const wheel = getWheelByIndex(pendingArchiveIndex);

    if (!wheel) {
        return;
    }

    if (typeof onArchiveComplete === "function") {
        onArchiveComplete(pendingArchiveIndex, archiveProcessedWheel(wheel));
    }

    pendingArchiveIndex = null;
    archiveWheelModal?.hide();
}

function downloadArchiveWheelPdf() {

    if (pendingArchiveIndex === null) {
        return;
    }

    if (typeof window.downloadProcessedRouteSheetPdf === "function") {
        window.downloadProcessedRouteSheetPdf(pendingArchiveIndex);
    }
}

export function initializeArchiveWheelModal(getWheelsFn, onComplete) {

    if (typeof getWheelsFn !== "function") {
        return;
    }

    getWheels = getWheelsFn;
    onArchiveComplete = onComplete;

    const modalElement = document.getElementById("archiveWheelModal");

    if (modalElement) {
        archiveWheelModal = new bootstrap.Modal(modalElement);
    }

    document.getElementById("btnConfirmArchiveWheel")
        ?.addEventListener("click", confirmArchiveWheel);

    document.getElementById("btnDownloadArchiveWheelPdf")
        ?.addEventListener("click", downloadArchiveWheelPdf);

    window.openArchiveWheelModal = openArchiveWheelModal;
}
