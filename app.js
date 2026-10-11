let ciclosData = {};
let cicloActualId = '';

document.addEventListener("DOMContentLoaded", async () => {
  await cargarIndiceCiclos();
});

async function cargarIndiceCiclos() {
  try {
    const response = await fetch('data/ciclos.json');
    const index = await response.json();
    
    const tabsBar = document.getElementById('tabs-bar');
    const mobileSelect = document.getElementById('mobile-tabs-select');
    
    tabsBar.innerHTML = '';
    mobileSelect.innerHTML = '';
    
    for (let cicloInfo of index.ciclos_disponibles) {
      const res = await fetch(cicloInfo.archivo);
      ciclosData[cicloInfo.id] = await res.json();
      
      // Botón PC
      const btn = document.createElement('button');
      btn.className = 'tab-btn';
      btn.id = `btn-${cicloInfo.id}`;
      btn.innerText = cicloInfo.titulo;
      btn.onclick = () => cambiarCiclo(cicloInfo.id);
      tabsBar.appendChild(btn);
      
      // Opción Móvil
      const opt = document.createElement('option');
      opt.value = cicloInfo.id;
      opt.innerText = `${cicloInfo.titulo} (${ciclosData[cicloInfo.id].fechas})`;
      mobileSelect.appendChild(opt);
    }
    
    // Pestaña Consolidado
    const btnCons = document.createElement('button');
    btnCons.className = 'tab-btn';
    btnCons.id = 'btn-consolidado';
    btnCons.innerText = 'CONSOLIDADO';
    btnCons.onclick = () => mostrarConsolidado();
    tabsBar.appendChild(btnCons);
    
    const optCons = document.createElement('option');
    optCons.value = 'consolidado';
    optCons.innerText = 'CONSOLIDADO GENERAL';
    mobileSelect.appendChild(optCons);
    
    // Cargar por defecto el ciclo más reciente
    const ultimoCicloId = index.ciclos_disponibles[index.ciclos_disponibles.length - 1].id;
    cambiarCiclo(ultimoCicloId);
    
  } catch (error) {
    console.error("Error al cargar los ciclos:", error);
  }
}

function cambiarCiclo(id) {
  if (id === 'consolidado') {
    mostrarConsolidado();
    return;
  }
  cicloActualId = id;
  actualizarActivosUI(id);
  renderizarDashboard(ciclosData[id]);
}

function actualizarActivosUI(id) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  const activeBtn = document.getElementById(`btn-${id}`);
  if (activeBtn) activeBtn.classList.add('active');
  document.getElementById('mobile-tabs-select').value = id;
}

function renderizarDashboard(data) {
  document.getElementById('ciclo-titulo').innerText = data.titulo;
  document.getElementById('ciclo-fechas').innerText = data.fechas;
  
  // Totales de Tarjetas
  document.getElementById('tot-realizadas').innerText = data.totales.realizadas;
  document.getElementById('sub-realizadas').innerText = data.totales.realizadasPct + " de las asignadas";
  
  document.getElementById('tot-pendientes').innerText = data.totales.pendientes;
  document.getElementById('sub-pendientes').innerText = data.totales.pendientesPct + " de las asignadas";
  
  document.getElementById('tot-canceladas').innerText = data.totales.canceladas;
  document.getElementById('sub-canceladas').innerText = data.totales.canceladasPct + " de las asignadas";
  
  document.getElementById('tot-rechazadas').innerText = data.totales.rechazadas;
  document.getElementById('sub-rechazadas').innerText = data.totales.rechazadasPct + " de las asignadas";
  
  document.getElementById('tot-verificaciones').innerText = data.totales.verificaciones;
  document.getElementById('sub-verificaciones').innerText = data.totales.verificacionesPct + " de las asignadas";
  
  document.getElementById('tot-asignadas').innerText = data.totales.asignadas;
  document.getElementById('sub-asignadas').innerText = data.totales.asignadasVar + " vs. ciclo anterior";

  // Tabla Rendimiento
  const tbodyRend = document.getElementById('tbody-rendimiento');
  tbodyRend.innerHTML = '';
  
  let destacadosCount = 0;
  let liderNombre = '';
  let liderPuntos = '';

  data.rendimiento.forEach(row => {
    // Cálculo dinámico para el mensaje de liderazgo
    if (row.pos === 1) {
      liderNombre = row.encuestador;
      liderPuntos = row.total;
    }
    if (row.final === "BUENO" || row.final === "ALTO") {
      destacadosCount++;
    }

    const tr = document.createElement('tr');
    tr.className = `row-${row.final.toLowerCase()}`;
    tr.innerHTML = `
      <td>${row.pos}</td>
      <td style="text-align: left; font-weight: 600;">${row.encuestador}</td>
      <td>${row.can}</td><td>${row.pen}</td><td>${row.rea}</td><td>${row.rec}</td><td>${row.ver}</td><td>${row.asig}</td>
      <td>${row.tg}</td><td>${row.ef}</td><td>${row.pd}</td><td>${row.eg}</td><td>${row.sum}</td><td>${row.sub_t}</td><td><b>${row.total}</b></td>
      <td><span class="badge badge-${row.final.toLowerCase()}">${row.final}</span></td>
    `;
    tbodyRend.appendChild(tr);
  });

  // Mensaje de Liderazgo Automático y Dinámico
  document.getElementById('footer-liderazgo').innerText = 
    `${liderNombre} lidera con ${liderPuntos} puntos. ${destacadosCount} encuestadores en nivel BUENO o ALTO.`;

  // Tabla Supervisión
  const tbodySup = document.getElementById('tbody-supervision');
  tbodySup.innerHTML = '';
  data.supervision.forEach(row => {
    let colorClass = 'sup-gris';
    let val = row.super;
    if (val >= 90) colorClass = 'sup-azul';
    else if (val >= 70) colorClass = 'sup-verde';
    else if (val >= 60) colorClass = 'sup-amarillo';
    else if (val >= 50) colorClass = 'sup-rosado';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="text-align: left;">${row.encuestador}</td>
      <td><span class="sup-badge ${colorClass}">${row.super}</span></td>
    `;
    tbodySup.appendChild(tr);
  });
}

function mostrarConsolidado() {
  actualizarActivosUI('consolidado');
  
  let totalAsignadas = 0, totalRealizadas = 0, totalPendientes = 0, totalCanceladas = 0, totalRechazadas = 0, totalVerificaciones = 0;
  let rendimientoMap = {};
  let supervisionMap = {};
  let cantidadCiclos = Object.keys(ciclosData).length;

  Object.values(ciclosData).forEach(ciclo => {
    totalAsignadas += ciclo.totales.asignadas;
    totalRealizadas += ciclo.totales.realizadas;
    totalPendientes += ciclo.totales.pendientes;
    totalCanceladas += ciclo.totales.canceladas;
    totalRechazadas += ciclo.totales.rechazadas;
    totalVerificaciones += ciclo.totales.verificaciones;

    ciclo.rendimiento.forEach(r => {
      if (!rendimientoMap[r.encuestador]) {
        rendimientoMap[r.encuestador] = { encuestador: r.encuestador, can:0, pen:0, rea:0, rec:0, ver:0, asig:0, totalSum: 0 };
      }
      rendimientoMap[r.encuestador].can += r.can;
      rendimientoMap[r.encuestador].pen += r.pen;
      rendimientoMap[r.encuestador].rea += r.rea;
      rendimientoMap[r.encuestador].rec += r.rec;
      rendimientoMap[r.encuestador].ver += r.ver;
      rendimientoMap[r.encuestador].asig += r.asig;
      rendimientoMap[r.encuestador].totalSum += parseFloat(r.total.replace(',', '.'));
    });

    ciclo.supervision.forEach(s => {
      if (!supervisionMap[s.encuestador]) supervisionMap[s.encuestador] = { suma: 0, count: 0 };
      supervisionMap[s.encuestador].suma += s.super;
      supervisionMap[s.encuestador].count += 1;
    });
  });

  // Ordenar lista del consolidado por promedio de puntaje descendente
  let listaConsolidada = Object.values(rendimientoMap).map(item => {
    let promTotal = (item.totalSum / cantidadCiclos).toFixed(2).replace('.', ',');
    let pNum = parseFloat(promTotal.replace(',', '.'));
    
    let finalCat = "ALTO";
    if (pNum < 45) finalCat = "MALO";
    else if (pNum < 60) finalCat = "BAJO";
    else if (pNum < 70) finalCat = "REGULAR";
    else if (pNum < 80) finalCat = "BUENO";

    return {
      encuestador: item.encuestador,
      can: item.can, pen: item.pen, rea: item.rea, rec: item.rec, ver: item.ver, asig: item.asig,
      tg: "-", ef: "-", pd: "-", eg: "-", sum: "-", sub_t: "-", total: promTotal, final: finalCat, pNum: pNum
    };
  }).sort((a, b) => b.pNum - a.pNum);

  // Asignar nuevas posiciones basadas en el acumulado
  listaConsolidada.forEach((item, index) => { item.pos = index + 1; });

  const consolidadoObj = {
    titulo: "CONSOLIDADO GENERAL",
    fechas: "ACUMULADO HISTÓRICO",
    totales: {
      realizadas: totalRealizadas, realizadasPct: ((totalRealizadas/totalAsignadas)*100).toFixed(1) + '%',
      pendientes: totalPendientes, pendientesPct: ((totalPendientes/totalAsignadas)*100).toFixed(1) + '%',
      canceladas: totalCanceladas, canceladasPct: ((totalCanceladas/totalAsignadas)*100).toFixed(1) + '%',
      rechazadas: totalRechazadas, rechazadasPct: ((totalRechazadas/totalAsignadas)*100).toFixed(2) + '%',
      verificaciones: totalVerificaciones, verificacionesPct: ((totalVerificaciones/totalAsignadas)*100).toFixed(1) + '%',
      asignadas: totalAsignadas, asignadasVar: "Acumulado"
    },
    rendimiento: listaConsolidada,
    supervision: Object.keys(supervisionMap).map(nombre => {
      let promedioSup = Math.round(supervisionMap[nombre].suma / supervisionMap[nombre].count);
      return { encuestador: nombre, super: promedioSup };
    })
  };

  renderizarDashboard(consolidadoObj);
}