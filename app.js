// variables globales
let dbCodigos = {};
let dbNombres = {};
let dbEvaluaciones = {};

let sesionHash = ""; 
let alumnoCaliHash = ""; 

// cargar archivos de datos al iniciar la página
window.onload = async function()
{
    try {
        dbCodigos = await fetch('codigos.json').then(res => res.json());
        dbEvaluaciones = await fetch('evaluaciones.json').then(res => res.json()).catch(() => ({}));
        dbNombres = await fetch('alumnos_maestro.json').then(res => res.json()).catch(() => ({}));
    } catch (e) {
        console.error("error al cargar las configuraciones locales .json", e);
    }
};

// validar el acceso en la pantalla de inicio
function verificarAcceso()
{
    const codigoInput = document.getElementById('access-code').value.trim();
    const errorDiv = document.getElementById('login-error');
    errorDiv.style.display = "none";

    if (!codigoInput) return;

    // calcular SHA-256 del código ingresado
    const hash = CryptoJS.SHA256(codigoInput).toString();

    if (dbCodigos.evaluadores.includes(hash))
    {
        sesionHash = hash;
        document.getElementById('login-section').style.display = "none";
        document.getElementById('evaluador-section').style.display = "block";
        document.getElementById('header-app').querySelector('p').innerText = "Evaluador.";
    } else if (dbCodigos.alumnos.includes(hash))
    {
        sesionHash = hash;
        document.getElementById('login-section').style.display = "none";
        mostrarVistaAlumno(hash);
    } else {
        errorDiv.innerText = "Código de acceso incorrecto o no registrado.";
        errorDiv.style.display = "block";
    }
}

// mostrar promedios y comentarios al estudiante
function mostrarVistaAlumno(hashAlumno)
{
    document.getElementById('alumno-section').style.display = "block";
    document.getElementById('header-app').querySelector('p').innerText = "Consulta de Resultados Estudiantiles (Anónimo).";
    
    let conteo = 0;
    let sumas = [0,0,0,0,0,0,0];
    let totalPuntos = 0;
    let comentariosHtml = "";

    for (let evalHash in dbEvaluaciones) {
        if (dbEvaluaciones[evalHash][hashAlumno]) {
            conteo++;
            let eva = dbEvaluaciones[evalHash][hashAlumno];
            sumas[0] += parseFloat(eva.puntos_criterio_1);
            sumas[1] += parseFloat(eva.puntos_criterio_2);
            sumas[2] += parseFloat(eva.puntos_criterio_3);
            sumas[3] += parseFloat(eva.puntos_criterio_4);
            sumas[4] += parseFloat(eva.puntos_criterio_5);
            sumas[5] += parseFloat(eva.puntos_criterio_6);
            sumas[6] += parseFloat(eva.puntos_criterio_7);
            totalPuntos += parseFloat(eva.puntaje_total);
            comentariosHtml += `<p>• <em>"...${eva.comentarios}..."</em></p>`;
        }
    }

    const resumenDiv = document.getElementById('alumno-resumen');

    if (conteo === 0) {
        resumenDiv.innerHTML = `<div class='alert' style='background-color:#fff3cd; color:#856404;'>TODAVÍA NO TIENES EVALUACIONES REGISTRADAS. Vuelve a consultar cuando tus sinodales terminen.</div>`;
    } else {
        let promTotal = (totalPuntos / conteo).toFixed(2);
        resumenDiv.innerHTML = `
            <p><strong>Evaluaciones completadas:</strong> ${conteo} de 3</p>
            <p style="font-size: 20px;"><strong>Calificación Promedio General:</strong> <span style="color:#27ae60; font-weight:bold;">${promTotal} / 30 pts</span></p>
            <button class="btn" onclick="document.getElementById('alumno-detalles').style.display='block'; this.style.display='none';">Ver rúbrica completa, resultados y comentarios</button>
        `;

        const criteriosNombres = [
            "Título y planteamiento del tema (Máx 3)",
            "Objetivo e hipótesis (Máx 4)",
            "Metodología (Máx 5)",
            "Resultados e impacto (Máx 6)",
            "Conclusiones (Máx 4)",
            "Referencias y sustento científico (Máx 3)",
            "Exposición oral y dominio del tema (Máx 5)"
        ];

        let tabla = `<table><tr><th>Criterio Evaluado</th><th>Calificación Promedio</th></tr>`;
        for (let i = 0; i < 7; i++) {
            tabla += `<tr><td>${criteriosNombres[i]}</td><td><strong>${(sumas[i]/conteo).toFixed(2)}</strong></td></tr>`;
        }
        tabla += `</table><h3>Observaciones de los Evaluadores:</h3>${comentariosHtml}`;
        document.getElementById('tabla-resultados-alumno').innerHTML = tabla;
    }
}

// Buscar código de alumno y revelar nombre al evaluador
function buscarAlumnoParaEvaluar() {
    const studentCode = document.getElementById('student-code-input').value.trim();
    const errDiv = document.getElementById('evaluador-error');
    const rubricaDiv = document.getElementById('rubrica-section');
    
    errDiv.style.display = "none";
    rubricaDiv.style.display = "none";
    document.getElementById('success-container').style.display = "none";
    document.getElementById('rubrica-form').style.display = "block";

    if (!studentCode) return;

    const hashEstudiante = CryptoJS.SHA256(studentCode).toString();

    if (!dbCodigos.alumnos.includes(hashEstudiante)) {
        errDiv.innerText = "Error: El código de alumno ingresado no existe en los registros.";
        errDiv.style.display = "block";
        return;
    }

    if (dbEvaluaciones[sesionHash] && dbEvaluaciones[sesionHash][hashEstudiante]) {
        errDiv.innerText = "¡Validación denegada! Ya has registrado una evaluación previa para este alumno.";
        errDiv.style.display = "block";
        return;
    }

    alumnoCaliHash = hashEstudiante;
    const nombreReal = dbNombres[studentCode] || `Código: ${studentCode} (Nombre no disponible)`;
    
    document.getElementById('evaluando-nombre-lbl').innerText = `Evaluando a: ${nombreReal}`;
    rubricaDiv.style.display = "block";
}

// Guardar evaluación en la memoria local del navegador
function guardarEvaluacion(event) {
    event.preventDefault();

    const c1 = parseFloat(document.querySelector('input[name="c1"]:checked').value);
    const c2 = parseFloat(document.querySelector('input[name="c2"]:checked').value);
    const c3 = parseFloat(document.querySelector('input[name="c3"]:checked').value);
    const c4 = parseFloat(document.querySelector('input[name="c4"]:checked').value);
    const c5 = parseFloat(document.querySelector('input[name="c5"]:checked').value);
    const c6 = parseFloat(document.querySelector('input[name="c6"]:checked').value);
    const c7 = parseFloat(document.querySelector('input[name="c7"]:checked').value);
    const obs = document.getElementById('observaciones-input').value.trim();

    const total = c1 + c2 + c3 + c4 + c5 + c6 + c7;

    if (!dbEvaluaciones[sesionHash]) {
        dbEvaluaciones[sesionHash] = {};
    }

    dbEvaluaciones[sesionHash][alumnoCaliHash] = {
        "puntos_criterio_1": c1,
        "puntos_criterio_2": c2,
        "puntos_criterio_3": c3,
        "puntos_criterio_4": c4,
        "puntos_criterio_5": c5,
        "puntos_criterio_6": c6,
        "puntos_criterio_7": c7,
        "puntaje_total": total,
        "comentarios": obs
    };

    document.getElementById('rubrica-form').style.display = "none";
    document.getElementById('success-container').style.display = "block";
}

// Descargar archivo JSON actualizado
function descargarJSON() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dbEvaluaciones, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "evaluaciones.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}
