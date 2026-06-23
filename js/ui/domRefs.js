// ==========================================
// REFERENCIAS AL DOM
// ==========================================

const modalDetalleElement = document.getElementById("modalDetalleRueda");

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

    btnNuevaRueda: document.getElementById("btnNuevaRueda"),
    guardarRueda: document.getElementById("guardarRueda"),

    detalleRuedaBody: document.getElementById("detalleRuedaBody")
};
