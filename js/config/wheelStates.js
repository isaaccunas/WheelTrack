// ==========================================
// MAPEO ESTADO → COLOR
// ==========================================

export function getColorForState(estado) {

    switch (estado) {

        case "Esperando material":
            return "bg-yellow";

        case "Esperando NDT":
            return "bg-blue";

        case "Bloqueada":
            return "bg-red";

        case "Lista para liberar":
            return "bg-purple";

        case "Entregada a almacén":
            return "bg-gray";

        default:
            return "bg-green";
    }
}
