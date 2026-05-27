// variables globales para el estado de la aplicación
let dbCodigos = {};
let dbNombres = {};
let dbEvaluaciones = {};

let sesionHash = ""; 
let alumnoCaliHash = ""; 
let codigoPlanoProfesor = ""; 

// cargar archivos de datos al iniciar la página
window.onload = async function() {
    try {
        dbCodigos = await fetch('codigos.json').then(res => res.json());
        dbEvaluaciones = await fetch('evaluaciones.json').then(res => res.json()).catch(() => ({}));
        dbNombres = await fetch('alumnos_maestro.json').then(res => res.json()).catch(() => ({}));
    } catch (e) {
        console.error("Error al cargar las configuraciones locales .json", e);
    }
};

// validar el acceso en la pantalla de inicio
function verificarAcceso() {
    const codigoInput = document.getElementById('access-code').value.trim();
    const errorDiv = document.getElementById('login-error');
    errorDiv.style.display = "none";

    if (!codigoInput) return;

    // Calcular SHA-256 del código ingresado
    const hash = CryptoJS.SHA256(codigoInput).toString();

    if (dbCodigos.evaluadores.includes(hash)) {
        sesionHash = hash;

        codigoPlanoProfesor = codigoInput.substring(codigoInput.length - 4); 
        
        document.getElementById('login-section').style.display = "none";
        document.getElementById('evaluador-section').style.display = "block";
        document.getElementById('header-app').querySelector('p').innerText = "Evaluador.";
        
        // Pintar la tabla de alumnos que este profesor ya evaluó
        actualizarTablaEvaluados();
    } else if (dbCodigos.alumnos.includes(hash)) {
        sesionHash = hash;
        document.getElementById('login-section').style.display = "none";
        mostrarVistaAlumno(hash);
    } else {
        errorDiv.innerText = "Código de acceso incorrecto o no registrado.";
        errorDiv.style.display = "block";
    }
}


function actualizarTablaEvaluados() {
    const listaDiv = document.getElementById('lista-evaluados-container');
    

    if (dbEvaluaciones[sesionHash] && Object.keys(dbEvaluaciones[sesionHash]).length > 0) {
        let tabla = `<table><tr><th>Códigos de Alumnos ya Evaluados por ti</th></tr>`;
        
        for (let hashEstudiante in dbEvaluaciones[sesionHash]) {
            // Buscamos cuál código plano coincide con ese hash
            let codigoPlano = "Código Registrado";
            if(dbNombres) {
                // Buscamos la llave original (A-0001, B-0002...) en el archivo descifrado
                for (let key in dbNombres) {
                    if (CryptoJS.SHA256(key).toString() === hashEstudiante) {
                        codigoPlano = key;
                        break;
                    }
                }
            }
            tabla += `<tr><td>✅ <strong>${codigoPlano}</strong></td></tr>`;
        }
        tabla += `</table>`;
        listaDiv.innerHTML = tabla;
    } else {
        listaDiv.innerHTML = `<p style="color: #777; italic: true;">Aún no has evaluado a ningún alumno en esta sesión.</p>`;
    }
}

// mostrar promedios y comentarios al estudiante
function mostrarVistaAlumno(hashAlumno) {
    document.getElementById('alumno-section').style.display = "block";
    document.getElementById('header-app').querySelector('p').innerText = "Consulta de Resultados.";
    
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
            <p><strong>Evaluaciones completadas:</strong> ${conteo}</p>
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
// buscar codigo de alumno de cualquier area
function buscarAlumnoParaEvaluar() {
    const studentCode = document.getElementById('student-code-input').value.trim().toUpperCase();
    const errDiv = document.getElementById('evaluador-error');
    const rubricaDiv = document.getElementById('rubrica-section');
    
    errDiv.style.display = "none";
    rubricaDiv.style.display = "none";
    document.getElementById('success-container').style.display = "none";
    document.getElementById('rubrica-form').style.display = "block";

    if (!studentCode) return;

    const hashEstudiante = CryptoJS.SHA256(studentCode).toString();

    // validar si el alumno existe
    if (!dbCodigos.alumnos.includes(hashEstudiante)) {
        errDiv.innerText = "El código de alumno ingresado no existe.";
        errDiv.style.display = "block";
        return;
    }

    if (dbEvaluaciones[sesionHash] && dbEvaluaciones[sesionHash][hashEstudiante]) {
        errDiv.innerText = "Ya has registrado una evaluación previa para este alumno.";
        errDiv.style.display = "block";
        return;
    }

    alumnoCaliHash = hashEstudiante;

    const LLAVE_SECRETA = codigoPlanoProfesor; 
    let nombreReal = `Código: ${studentCode}`;
    
    if (dbNombres[studentCode]) {
        try {
            const key = CryptoJS.enc.Utf8.parse(LLAVE_SECRETA.substring(0, 16).padEnd(16, '\0'));
            const decrypted = CryptoJS.AES.decrypt(dbNombres[studentCode], key, {
                mode: CryptoJS.mode.ECB,
                padding: CryptoJS.pad.Pkcs7
            });
            const nombreTexto = decrypted.toString(CryptoJS.enc.Utf8);
            if (nombreTexto) nombreReal = nombreTexto;
        } catch (error) {
            console.error("Error al desencriptar", error);
        }
    }
    
    document.getElementById('evaluando-nombre-lbl').innerText = `Evaluando a: ${nombreReal} (${studentCode})`;
    rubricaDiv.style.display = "block";
}

// guardar evaluación en la memoria local del navegador
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

    // actualizar la tablita de control del profesor inmediatamente
    actualizarTablaEvaluados();

    document.getElementById('rubrica-form').style.display = "none";
    document.getElementById('success-container').style.display = "block";
}

// xescargar archivo JSON actualizado
function descargarJSON() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dbEvaluaciones, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "evaluaciones.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}
