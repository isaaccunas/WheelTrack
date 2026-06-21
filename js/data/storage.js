// ==========================================
// PERSISTENCIA EN LOCALSTORAGE
// ==========================================

export const STORAGE_KEY = "wheels";

export function loadWheels() {

    const raw = localStorage.getItem(STORAGE_KEY);

    if (raw === null) {
        return null;
    }

    return JSON.parse(raw);
}

export function saveWheels(wheels) {

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(wheels)
    );
}
