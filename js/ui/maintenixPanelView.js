import {
    formatBoxLabel,
    formatClosedDate,
    getWheelSerialSummary,
    getWheelTypeLabel,
    hasValidTireAssignment,
    normalizeOperationalStatus,
    normalizePressureData,
    normalizeTireAssignment,
    normalizeTireOffData,
    normalizeWheelSerialData
} from "../domain/wheelModel.js";
import { refs } from "./domRefs.js";

const MAINTENIX_EMPTY_VALUE = "NO ASIGNADO";

function formatMaintenixValue(value) {

    if (value === null || value === undefined || value === "") {
        return MAINTENIX_EMPTY_VALUE;
    }

    return String(value);
}

function formatPressureMaintenixValue(pressure) {

    if (pressure === null || pressure === undefined || pressure === "") {
        return MAINTENIX_EMPTY_VALUE;
    }

    return `${pressure} psi`;
}

export function buildMaintenixData(wheel) {

    const wheelSerialData = normalizeWheelSerialData(
        wheel.wheelSerialData,
        wheel.serial
    );
    const tireAssignment = normalizeTireAssignment(wheel.tireAssignment);
    const tireOffData = normalizeTireOffData(wheel.tireOffData);
    const pressureData = normalizePressureData(wheel.pressureData);
    const operationalStatus = normalizeOperationalStatus(wheel.operationalStatus);

    const exitDate = operationalStatus.closedAt
        ? formatClosedDate(operationalStatus.closedAt).split(",")[0]?.trim() ||
            formatClosedDate(operationalStatus.closedAt)
        : null;

    return {
        "FECHA DE INGRESO": formatMaintenixValue(wheel.fechaIngreso),
        "FECHA DE SALIDA": formatMaintenixValue(exitDate),
        "WP": formatMaintenixValue(wheel.wp),
        "AERONAVE": formatMaintenixValue(wheel.avion),
        "S/N INNER": formatMaintenixValue(wheelSerialData.inner),
        "S/N OUTER": formatMaintenixValue(wheelSerialData.outer),
        "P/N": formatMaintenixValue(
            hasValidTireAssignment(tireAssignment)
                ? tireAssignment.partNumber
                : null
        ),
        "SHOP VISIT": formatMaintenixValue(wheel.shopVisit),
        "TIRE CHANGE": formatMaintenixValue(wheel.tireChange),
        "TIRE OFF": formatMaintenixValue(tireOffData.serialNumber),
        "TIRE ON P/N": formatMaintenixValue(tireAssignment.partNumber),
        "TIRE ON S/N": formatMaintenixValue(tireAssignment.serial),
        "PRESIÓN INICIAL": formatPressureMaintenixValue(pressureData.initialPressure),
        "PRESIÓN FINAL": formatPressureMaintenixValue(pressureData.finalPressure),
        "SERIAL NUMBER": formatMaintenixValue(getWheelSerialSummary(wheel)),
        "NÚMERO DE RUEDA": formatMaintenixValue(wheel.numeroRueda),
        "TIPO (NW/MW)": formatMaintenixValue(getWheelTypeLabel(wheel.wheelType)),
        "CAJA": formatMaintenixValue(formatBoxLabel(wheel.boxData)),
        "RAZÓN": formatMaintenixValue(wheel.razon),
        "ESTACIÓN": formatMaintenixValue(wheel.estacion),
        "CICLOS": formatMaintenixValue(wheel.ciclos)
    };
}

export function buildMaintenixCopyText(wheel) {

    const data = buildMaintenixData(wheel);

    const operationalFields = [
        "FECHA DE INGRESO",
        "FECHA DE SALIDA",
        "WP",
        "AERONAVE",
        "S/N INNER",
        "S/N OUTER",
        "P/N",
        "SHOP VISIT",
        "TIRE CHANGE",
        "TIRE OFF",
        "TIRE ON P/N",
        "TIRE ON S/N",
        "PRESIÓN INICIAL",
        "PRESIÓN FINAL"
    ];

    const receptionFields = [
        "SERIAL NUMBER",
        "WP",
        "NÚMERO DE RUEDA",
        "TIPO (NW/MW)",
        "CAJA",
        "RAZÓN",
        "ESTACIÓN",
        "CICLOS"
    ];

    const operationalLines = operationalFields
        .map((field) => `${field}: ${data[field]}`)
        .join("\n");

    const receptionLines = receptionFields
        .map((field) => `${field}: ${data[field]}`)
        .join("\n");

    return [
        "INFORMACIÓN OPERATIVA",
        operationalLines,
        "",
        "DATOS DE RECEPCIÓN",
        receptionLines
    ].join("\n");
}

function renderMaintenixField(label, value) {

    return `
        <div class="maintenix-field">

            <span class="maintenix-label">${label}</span>

            <strong class="maintenix-value ${value === MAINTENIX_EMPTY_VALUE ? "maintenix-value-empty" : ""}">
                ${value}
            </strong>

        </div>
    `;
}

function renderMaintenixSection(title, fields, data) {

    const fieldMarkup = fields
        .map((field) => renderMaintenixField(field, data[field]))
        .join("");

    return `
        <section class="maintenix-section">

            <h6 class="maintenix-section-title">${title}</h6>

            <div class="maintenix-grid">
                ${fieldMarkup}
            </div>

        </section>
    `;
}

function renderMaintenixContent(wheel) {

    const data = buildMaintenixData(wheel);

    return `
        ${renderMaintenixSection("Información operativa", [
            "FECHA DE INGRESO",
            "FECHA DE SALIDA",
            "WP",
            "AERONAVE",
            "S/N INNER",
            "S/N OUTER",
            "P/N",
            "SHOP VISIT",
            "TIRE CHANGE",
            "TIRE OFF",
            "TIRE ON P/N",
            "TIRE ON S/N",
            "PRESIÓN INICIAL",
            "PRESIÓN FINAL"
        ], data)}

        ${renderMaintenixSection("Datos de recepción", [
            "SERIAL NUMBER",
            "WP",
            "NÚMERO DE RUEDA",
            "TIPO (NW/MW)",
            "CAJA",
            "RAZÓN",
            "ESTACIÓN",
            "CICLOS"
        ], data)}
    `;
}

export async function copyMaintenixData(wheel) {

    const text = buildMaintenixCopyText(wheel);

    if (navigator.clipboard?.writeText) {

        await navigator.clipboard.writeText(text);

        return;
    }

    const textarea = document.createElement("textarea");

    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
}

export function showMaintenixPanel(wheel) {

    if (!refs.modalMaintenix || !refs.maintenixPanelBody) {
        return;
    }

    refs.maintenixPanelTitle.textContent =
        `Maintenix · Rueda ${wheel.numeroRueda || "-"}`;

    refs.maintenixPanelBody.innerHTML = renderMaintenixContent(wheel);

    const copyButton = document.getElementById("copyMaintenixBtn");

    if (copyButton) {

        copyButton.onclick = async () => {

            try {

                await copyMaintenixData(wheel);

                alert("Datos copiados para Maintenix.");

            } catch (error) {

                console.error(error);

                alert("No se pudo copiar al portapapeles.");
            }
        };
    }

    refs.modalMaintenix.show();
}
