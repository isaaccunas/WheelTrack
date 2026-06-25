import { normalizeWheelType, getWheelSerialSummary } from "../domain/wheelModel.js";

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

export const WHEEL_TYPE_FILTER_OPTIONS = [
    { value: "todas", label: "Todas" },
    { value: "NW", label: "NW (Nariz)" },
    { value: "MW", label: "MW (Principal)" }
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
        statusFilter: "todos",
        wheelTypeFilter: "todas"
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
        getWheelSerialSummary(wheel),
        wheel.wheelSerialData?.inner,
        wheel.wheelSerialData?.outer,
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

function matchesWheelTypeFilter(wheel, wheelTypeFilter) {

    if (wheelTypeFilter === "todas") {
        return true;
    }

    return normalizeWheelType(wheel.wheelType) === wheelTypeFilter;
}

export function filterWheels(wheels, filters = currentFilters) {

    const searchText = normalizeSearchText(filters.searchText);

    return wheels
        .map((wheel, index) => ({ wheel, index }))
        .filter(({ wheel }) =>
            matchesSearch(wheel, searchText) &&
            matchesStatusFilter(wheel, filters.statusFilter) &&
            matchesWheelTypeFilter(wheel, filters.wheelTypeFilter)
        );
}

export function isFullListVisible(filters = currentFilters) {

    return filters.statusFilter === "todos" &&
        filters.wheelTypeFilter === "todas" &&
        normalizeSearchText(filters.searchText) === "";
}

// ==========================================
// INICIALIZACIÓN DE UI
// ==========================================

export function initializeSearchFilters(onFiltersChange) {

    const searchInput = document.getElementById("wheelSearchInput");
    const statusFilter = document.getElementById("wheelStatusFilter");
    const wheelTypeFilter = document.getElementById("wheelTypeFilter");

    if (!searchInput || !statusFilter || !wheelTypeFilter) {
        return;
    }

    const notifyChange = () => {

        currentFilters = {
            searchText: searchInput.value,
            statusFilter: statusFilter.value,
            wheelTypeFilter: wheelTypeFilter.value
        };

        onFiltersChange(getCurrentFilters());
    };

    searchInput.addEventListener("input", notifyChange);
    statusFilter.addEventListener("change", notifyChange);
    wheelTypeFilter.addEventListener("change", notifyChange);
}
