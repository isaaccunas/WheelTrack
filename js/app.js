// ==========================================
// DATOS INICIALES
// ==========================================

let wheels = JSON.parse(localStorage.getItem("wheels")) || [

    {
        numeroRueda: "",
        fechaRecepcion: "",
        avion: "",
        serial: "E1417",
        fechaIngreso: "",
        detalle: "",
        wp: "",
        tireChange: "",
        shopVisit: "",
        razon: "",
        estacion: "",
        ciclos: "",
        estado: "Ensamblaje",
        color: "bg-success"
    },

    {
        numeroRueda: "",
        fechaRecepcion: "",
        avion: "",
        serial: "70784",
        fechaIngreso: "",
        detalle: "",
        wp: "",
        tireChange: "",
        shopVisit: "",
        razon: "",
        estacion: "",
        ciclos: "",
        estado: "Esperando Washer",
        color: "bg-yellow"
    },

    {
        numeroRueda: "",
        fechaRecepcion: "",
        avion: "",
        serial: "50767",
        fechaIngreso: "",
        detalle: "",
        wp: "",
        tireChange: "",
        shopVisit: "",
        razon: "",
        estacion: "",
        ciclos: "",
        estado: "Esperando NDT",
        color: "bg-blue"
    },

    {
        numeroRueda: "",
        fechaRecepcion: "",
        avion: "",
        serial: "C1445",
        fechaIngreso: "",
        detalle: "",
        wp: "",
        tireChange: "",
        shopVisit: "",
        razon: "",
        estacion: "",
        ciclos: "",
        estado: "Inflado",
        color: "bg-success"
    }
];

// ==========================================
// REFERENCIAS
// ==========================================

const wheelList = document.getElementById("wheelList");

const modalElement = document.getElementById("modalRueda");
const modalRueda = new bootstrap.Modal(modalElement);

const modalDetalleElement = document.getElementById("modalDetalleRueda");
const modalDetalle = modalDetalleElement
    ? new bootstrap.Modal(modalDetalleElement)
    : null;

const btnNuevaRueda = document.getElementById("btnNuevaRueda");

const guardarRueda = document.getElementById("guardarRueda");

let editIndex = null;

// ==========================================
// RENDERIZAR RUEDAS
// ==========================================

function renderWheels() {

    wheelList.innerHTML = "";

    wheels.forEach((wheel, index) => {

        wheelList.innerHTML += `

            <div class="wheel-row">

                <div
                    style="cursor:pointer; flex:1"
                    onclick="showWheelDetail(${index})"
                >

                    <strong>
                        Nº: ${wheel.numeroRueda || "-"}
                        | S/N: ${wheel.serial}
                    </strong>

                    <div>${wheel.avion || "-"}</div>

                    <small>${wheel.estado}</small>

                </div>

                <div class="wheel-actions">

                    <button
                        type="button"
                        class="action-btn edit-btn"
                        title="Editar"
                        onclick="event.stopPropagation(); editWheel(${index})"
                    >
                        <i class="fa-solid fa-pen"></i>
                    </button>

                    <button
                        type="button"
                        class="action-btn delete-btn"
                        title="Eliminar"
                        onclick="event.stopPropagation(); deleteWheel(${index})"
                    >
                        <i class="fa-solid fa-trash"></i>
                    </button>

                    <span class="status ${wheel.color}"></span>

                </div>

            </div>

        `;
    });

    localStorage.setItem(
        "wheels",
        JSON.stringify(wheels)
    );
}

renderWheels();

// ==========================================
// ABRIR MODAL NUEVA RUEDA
// ==========================================

btnNuevaRueda.addEventListener("click", () => {

    editIndex = null;

    document.getElementById("formNuevaRueda").reset();

    modalRueda.show();
});

// ==========================================
// GUARDAR RUEDA
// ==========================================

guardarRueda.addEventListener("click", () => {

    const numeroRueda = document.getElementById("numeroRueda").value.trim();
    const fechaRecepcion = document.getElementById("fechaRecepcion").value;
    const avion = document.getElementById("avion").value.trim();
    const serial = document.getElementById("serial").value.trim();
    const fechaIngreso = document.getElementById("fechaIngreso").value;
    const detalle = document.getElementById("detalle").value.trim();
    const wp = document.getElementById("wp").value.trim();
    const tireChange = document.getElementById("tireChange").value;
    const shopVisit = document.getElementById("shopVisit").value.trim();
    const razon = document.getElementById("razon").value.trim();
    const estacion = document.getElementById("estacion").value.trim();
    const ciclos = document.getElementById("ciclos").value.trim();
    const estado = document.getElementById("estado").value;

    if (
        !numeroRueda ||
        !fechaRecepcion ||
        !avion ||
        !serial ||
        !fechaIngreso ||
        !detalle ||
        !wp ||
        !tireChange ||
        !shopVisit ||
        !razon ||
        !estacion ||
        !ciclos ||
        !estado
    ) {

        alert("Debes completar todos los campos obligatorios.");

        return;
    }

    let color = "bg-success";

    switch (estado) {

        case "Esperando material":
            color = "bg-yellow";
            break;

        case "Esperando NDT":
            color = "bg-blue";
            break;

        case "Bloqueada":
            color = "bg-red";
            break;

        case "Lista para liberar":
            color = "bg-purple";
            break;

        case "Entregada a almacén":
            color = "bg-gray";
            break;

        default:
            color = "bg-green";
    }

    const nuevaRueda = {

        numeroRueda,
        fechaRecepcion,
        avion,
        serial,
        fechaIngreso,
        detalle,
        wp,
        tireChange,
        shopVisit,
        razon,
        estacion,
        ciclos,
        estado,
        color
    };

    if (editIndex !== null) {

        wheels[editIndex] = nuevaRueda;

        editIndex = null;

    } else {

        wheels.push(nuevaRueda);
    }

    localStorage.setItem(
        "wheels",
        JSON.stringify(wheels)
    );

    renderWheels();

    document.getElementById("formNuevaRueda").reset();

    modalRueda.hide();

    alert("Datos guardados correctamente.");
});

// ==========================================
// EDITAR RUEDA
// ==========================================

function editWheel(index) {

    const wheel = wheels[index];

    editIndex = index;

    document.getElementById("numeroRueda").value = wheel.numeroRueda || "";
    document.getElementById("fechaRecepcion").value = wheel.fechaRecepcion || "";
    document.getElementById("avion").value = wheel.avion || "";
    document.getElementById("serial").value = wheel.serial || "";
    document.getElementById("fechaIngreso").value = wheel.fechaIngreso || "";
    document.getElementById("detalle").value = wheel.detalle || "";
    document.getElementById("wp").value = wheel.wp || "";
    document.getElementById("tireChange").value = wheel.tireChange || "";
    document.getElementById("shopVisit").value = wheel.shopVisit || "";
    document.getElementById("razon").value = wheel.razon || "";
    document.getElementById("estacion").value = wheel.estacion || "";
    document.getElementById("ciclos").value = wheel.ciclos || "";
    document.getElementById("estado").value = wheel.estado || "";

    modalRueda.show();
}

// ==========================================
// ELIMINAR RUEDA
// ==========================================

function deleteWheel(index) {

    const wheel = wheels[index];

    const confirmar = confirm(
        `¿Deseas eliminar la rueda S/N: ${wheel.serial}?`
    );

    if (!confirmar) return;

    wheels.splice(index, 1);

    localStorage.setItem(
        "wheels",
        JSON.stringify(wheels)
    );

    renderWheels();
}

// ==========================================
// MOSTRAR DETALLE
// ==========================================

function showWheelDetail(index) {

    if (!modalDetalle) return;

    const wheel = wheels[index];

    document.getElementById("detalleRuedaBody").innerHTML = `

        <div class="row g-3">

            <div class="col-md-6">
                <strong>Nº:</strong> ${wheel.numeroRueda || "-"}
            </div>

            <div class="col-md-6">
                <strong>Fecha recepción:</strong> ${wheel.fechaRecepcion || "-"}
            </div>

            <div class="col-md-6">
                <strong>Avión:</strong> ${wheel.avion || "-"}
            </div>

            <div class="col-md-6">
                <strong>S/N:</strong> ${wheel.serial || "-"}
            </div>

            <div class="col-md-6">
                <strong>Ingreso al taller:</strong> ${wheel.fechaIngreso || "-"}
            </div>

            <div class="col-md-6">
                <strong>WP:</strong> ${wheel.wp || "-"}
            </div>

            <div class="col-md-6">
                <strong>Tire Change:</strong> ${wheel.tireChange || "-"}
            </div>

            <div class="col-md-6">
                <strong>Shop Visit:</strong> ${wheel.shopVisit || "-"}
            </div>

            <div class="col-md-6">
                <strong>Razón:</strong> ${wheel.razon || "-"}
            </div>

            <div class="col-md-6">
                <strong>Estación:</strong> ${wheel.estacion || "-"}
            </div>

            <div class="col-md-6">
                <strong>Ciclos:</strong> ${wheel.ciclos || "-"}
            </div>

            <div class="col-md-12">
                <strong>Detalle:</strong><br>
                ${wheel.detalle || "-"}
            </div>

            <div class="col-md-12">
                <strong>Estado:</strong> ${wheel.estado || "-"}
            </div>

        </div>

    `;

    modalDetalle.show();
}