import { normalizeFormData, TOTAL_BOXES } from "../domain/wheelModel.js";

const REQUIRED_FIELD_CONFIG = [
    {
        id: "numeroRueda",
        validate: (data) => !!data.numeroRueda
    },
    {
        id: "fechaRecepcion",
        validate: (data) => !!data.fechaRecepcion
    },
    {
        id: "boxNumber",
        validate: (data) => !!(
            data.boxNumber &&
            Number(data.boxNumber) >= 1 &&
            Number(data.boxNumber) <= TOTAL_BOXES
        )
    },
    {
        id: "avion",
        validate: (data) => !!data.avion
    },
    {
        id: "serialInner",
        validate: (data) => !!data.serialInner
    },
    {
        id: "serialOuter",
        validate: (data) => !!data.serialOuter
    },
    {
        id: "fechaIngreso",
        validate: (data) => !!data.fechaIngreso
    },
    {
        id: "detalle",
        validate: (data) => !!data.detalle
    },
    {
        id: "wp",
        validate: (data) => !!data.wp
    },
    {
        id: "tireChange",
        validate: (data) => !!data.tireChange
    },
    {
        id: "shopVisit",
        validate: (data) => !!data.shopVisit
    },
    {
        id: "razon",
        validate: (data) => !!data.razon
    },
    {
        id: "estacion",
        validate: (data) => !!data.estacion
    },
    {
        id: "ciclos",
        validate: (data) => !!data.ciclos
    },
    {
        id: "wheelType",
        validate: (data) => data.wheelType === "NW" || data.wheelType === "MW"
    },
    {
        id: "estado",
        validate: (data) => !!data.estado
    }
];

const FIELD_ERROR_MESSAGE = "Campo obligatorio";

// ==========================================
// LECTURA Y ESTADO VISUAL
// ==========================================

function readFormDataFromDom() {

    return normalizeFormData({

        numeroRueda: document.getElementById("numeroRueda")?.value ?? "",
        fechaRecepcion: document.getElementById("fechaRecepcion")?.value ?? "",
        avion: document.getElementById("avion")?.value ?? "",
        serialInner: document.getElementById("serialInner")?.value ?? "",
        serialOuter: document.getElementById("serialOuter")?.value ?? "",
        tireOffSerial: document.getElementById("tireOffSerial")?.value ?? "",
        fechaIngreso: document.getElementById("fechaIngreso")?.value ?? "",
        detalle: document.getElementById("detalle")?.value ?? "",
        wp: document.getElementById("wp")?.value ?? "",
        tireChange: document.getElementById("tireChange")?.value ?? "",
        shopVisit: document.getElementById("shopVisit")?.value ?? "",
        razon: document.getElementById("razon")?.value ?? "",
        estacion: document.getElementById("estacion")?.value ?? "",
        ciclos: document.getElementById("ciclos")?.value ?? "",
        wheelType: document.getElementById("wheelType")?.value ?? "",
        boxNumber: document.getElementById("boxNumber")?.value ?? "",
        estado: document.getElementById("estado")?.value ?? ""
    });
}

function getFieldContainer(control) {

    return control?.closest(".col-md-4, .col-12") ?? null;
}

function setFieldError(control) {

    if (!control) {
        return;
    }

    const container = getFieldContainer(control);

    control.classList.add("field-required-error");

    const requiredStar = container?.querySelector(".required-star");

    if (requiredStar) {
        requiredStar.classList.add("required-star-error");
    }

    if (container?.querySelector(".field-error-message")) {
        return;
    }

    const message = document.createElement("div");

    message.className = "field-error-message";
    message.textContent = FIELD_ERROR_MESSAGE;

    control.insertAdjacentElement("afterend", message);
}

function clearFieldError(control) {

    if (!control) {
        return;
    }

    const container = getFieldContainer(control);

    control.classList.remove("field-required-error");

    container?.querySelector(".required-star")
        ?.classList.remove("required-star-error");

    container?.querySelector(".field-error-message")?.remove();
}

function handleFieldInput(control) {

    const formData = readFormDataFromDom();
    const fieldConfig = REQUIRED_FIELD_CONFIG.find(
        (config) => config.id === control.id
    );

    if (!fieldConfig) {
        return;
    }

    if (fieldConfig.validate(formData)) {
        clearFieldError(control);
    }
}

// ==========================================
// API PÚBLICA
// ==========================================

export function clearWheelFormValidationErrors() {

    REQUIRED_FIELD_CONFIG.forEach(({ id }) => {

        const control = document.getElementById(id);

        if (control) {
            clearFieldError(control);
        }
    });
}

export function showWheelFormValidationErrors(formData) {

    REQUIRED_FIELD_CONFIG.forEach(({ id, validate }) => {

        const control = document.getElementById(id);

        if (!control) {
            return;
        }

        if (validate(formData)) {
            clearFieldError(control);
            return;
        }

        setFieldError(control);
    });
}

export function initializeWheelFormValidation() {

    const form = document.getElementById("formNuevaRueda");

    if (!form) {
        return;
    }

    REQUIRED_FIELD_CONFIG.forEach(({ id }) => {

        const control = document.getElementById(id);

        if (!control) {
            return;
        }

        const eventName = control.tagName === "SELECT" ? "change" : "input";

        control.addEventListener(eventName, () => {
            handleFieldInput(control);
        });
    });
}
