// ==========================================
// FILTROS DE ESTADO
// ==========================================

export const STATUS_FILTER_OPTIONS = [
    { value: "todos", label: "Todos" },
    { value: "recepcion", label: "Recepción" },
    { value: "enTaller", label: "En taller" },
    { value: "pendienteMaterial", label: "Pendiente material" },
    { value: "pendienteNdt", label: "Pendiente NDT" },
    { value: "bloqueada", label: "Bloqueada" },
    { value: "entregadaAlmacen", label: "Entregada a almacén" }
];

const STATUS_FILTER_MAP = {

    recepcion: ["En proceso"],

    enTaller: [
        "Ensamblaje",
        "Inflado",
        "Lista para liberar"
    ],

    pendienteMaterial: [
        "Esperando material",
        "Esperando Washer"
    ],

    pendienteNdt: ["Esperando NDT"],

    bloqueada: ["Bloqueada"],

    entregadaAlmacen: ["Entregada a almacén"]
};

// ==========================================
// ESTADO DE FILTROS
// ==========================================

let currentFilters = getDefaultFilters();

// ==========================================
// FILTRADO
// ==========================================

export function getDefaultFilters() {

    return {
        searchText: "",
        statusFilter: "todos"
    };
}

export function getCurrentFilters() {

    return { ...currentFilters };
}

function normalizeSearchText(text) {

    return (text ?? "").trim().toLowerCase();
}

function matchesSearch(wheel, searchText) {

    if (!searchText) {
        return true;
    }

    const fields = [
        wheel.numeroRueda,
        wheel.serial,
        wheel.avion
    ];

    return fields.some(
        (field) => (field ?? "").toLowerCase().includes(searchText)
    );
}

function matchesStatusFilter(wheel, statusFilter) {

    if (statusFilter === "todos") {
        return true;
    }

    const allowedStates = STATUS_FILTER_MAP[statusFilter];

    if (!allowedStates) {
        return true;
    }

    return allowedStates.includes(wheel.estado);
}

export function filterWheels(wheels, filters = currentFilters) {

    const searchText = normalizeSearchText(filters.searchText);

    return wheels
        .map((wheel, index) => ({ wheel, index }))
        .filter(({ wheel }) =>
            matchesSearch(wheel, searchText) &&
            matchesStatusFilter(wheel, filters.statusFilter)
        );
}

export function isFullListVisible(filters = currentFilters) {

    return filters.statusFilter === "todos" &&
        normalizeSearchText(filters.searchText) === "";
}

// ==========================================
// INICIALIZACIÓN DE UI
// ==========================================

export function initializeSearchFilters(onFiltersChange) {

    const searchInput = document.getElementById("wheelSearchInput");
    const statusFilter = document.getElementById("wheelStatusFilter");

    if (!searchInput || !statusFilter) {
        return;
    }

    const notifyChange = () => {

        currentFilters = {
            searchText: searchInput.value,
            statusFilter: statusFilter.value
        };

        onFiltersChange(getCurrentFilters());
    };

    searchInput.addEventListener("input", notifyChange);
    statusFilter.addEventListener("change", notifyChange);
}
