// ==========================================
// REFERENCIAS AL DOM
// ==========================================

const modalDetalleElement = document.getElementById("modalDetalleRueda");
const modalMaintenixElement = document.getElementById("modalMaintenixPanel");

export const refs = {

    wheelList: document.getElementById("wheelList"),

    modalElement: document.getElementById("modalRueda"),
    modalRueda: new bootstrap.Modal(
        document.getElementById("modalRueda")
    ),

    modalDetalleElement,
    modalDetalle: modalDetalleElement
        ? new bootstrap.Modal(modalDetalleElement)
        : null,

    modalMaintenixElement,
    modalMaintenix: modalMaintenixElement
        ? new bootstrap.Modal(modalMaintenixElement)
        : null,

    btnNuevaRueda: document.getElementById("btnNuevaRueda"),
    guardarRueda: document.getElementById("guardarRueda"),

    detalleRuedaBody: document.getElementById("detalleRuedaBody"),
    maintenixPanelBody: document.getElementById("maintenixPanelBody"),
    maintenixPanelTitle: document.getElementById("maintenixPanelTitle")
};
