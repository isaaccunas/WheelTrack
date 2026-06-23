import { DEFAULT_WHEELS } from "./defaultWheels.js";
import { loadWheels, saveWheels } from "./storage.js";

// ==========================================
// ESTADO EN MEMORIA
// ==========================================

let wheels = [];

// ==========================================
// CARGA INICIAL
// ==========================================

export function load() {

    wheels = loadWheels() || DEFAULT_WHEELS;
}

// ==========================================
// CONSULTAS
// ==========================================

export function getAll() {

    return wheels;
}

export function getById(id) {

    return wheels[id];
}

// ==========================================
// MUTACIONES
// ==========================================

export function add(wheel) {

    wheels.push(wheel);

    saveWheels(wheels);
}

export function update(id, wheel) {

    wheels[id] = wheel;

    saveWheels(wheels);
}

export function remove(id) {

    wheels.splice(id, 1);

    saveWheels(wheels);
}
