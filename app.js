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
      let dataCiclo = await res.json();
      
      // Calcular métricas dinámicamente usando la lógica exacta de la fórmula
      dataCiclo.rendimiento = calcularMetricasCiclo(dataCiclo.rendimiento, dataCiclo.supervision);
      ciclosData[cicloInfo.id] = dataCiclo;
      
      const btn = document.createElement('button');
      btn.className = 'tab-btn';
      btn.id = `btn-${cicloInfo.id}`;
      btn.innerText = cicloInfo.titulo;
      btn.onclick = () => cambiarCiclo(cicloInfo.id);
      tabsBar.appendChild(btn);
      
      const opt = document.createElement('option');
      opt.value = cicloInfo.id;
      opt.innerText = `${cicloInfo.titulo} (${dataCiclo.fechas})`;
      mobileSelect.appendChild(opt);
    }
    
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

function parseNum(val) {
  if (typeof val === 'number') return val;
  if (!val || val === '-') return 0;
  return parseFloat(String(val).replace(',', '.')) || 0;
}

function fmt(val) {
  return val.toFixed(2).replace('.', ',');
}

// Lógica exacta de cálculo basada en la fórmula LET de Google Sheets / Excel
function calcularMetricasCiclo(rendimientoList, supervisionList) {
  let supMap = {};
  if (supervisionList) {
    supervisionList.forEach(s => { supMap[s.encuestador] = parseNum(s.super); });
  }

  let maxAsig = Math.max(...rendimientoList.map(r => parseNum(r.asig)), 1);

  let calculados = rendimientoList.map(row => {
    let can = parseNum(row.can);
    let pen = parseNum(row.pen);
    let rea = parseNum(row.rea);
    let rec = parseNum(row.rec);
    let ver = parseNum(row.ver);
    let asig = parseNum(row.asig);

    let asigDiv = asig === 0 ? 1 : asig;
    let tg = ((can + rea + rec + ver) / asigDiv) * 20;

    let efDenom = (rea + rec + ver) === 0 ? 1 : (rea + rec + ver);
    let ef = (rea / efDenom) * 30;

    let maxAsigDiv = maxAsig === 0 ? 1 : maxAsig;
    let pd = (rea / maxAsigDiv) * 20;

    let eg = (rea / asigDiv) * 30;

    let suma = tg + ef + pd + eg;

    // sub_t (equivalente a 'total' en la fórmula)
    let sub_t = (suma * 0.8) + ((asig / maxAsigDiv) * 20);

    let superVal = supMap[row.encuestador] !== undefined ? supMap[row.encuestador] : 0;

    // total (equivalente a 'total2' en la fórmula)
    let totalScore = (sub_t * 0.6) + (superVal * 0.4);

    let finalCat = "MALO";
    if (totalScore >= 90) finalCat = "EXCELENTE";
    else if (totalScore >= 80) finalCat = "ALTO";
    else if (totalScore >= 70) finalCat = "BUENO";
    else if (totalScore >= 60) finalCat = "REGULAR";
    else if (totalScore >= 50) finalCat = "BAJO";

    return {
      encuestador: row.encuestador,
      can: can,
      pen: pen,
      rea: rea,
      rec: rec,
      ver: ver,
      asig: asig,
      tg: tg,
      ef: ef,
      pd: pd,
      eg: eg,
      sum: suma,
      sub_t: sub_t,
      total: totalScore,
      final: finalCat,
      pNum: totalScore
    };
  });

  // Ordenar de mayor a menor según el puntaje total (SORT descendente)
  calculados.sort((a, b) => b.pNum - a.pNum);

  // Asignar posiciones (SEQUENCE)
  calculados.forEach((item, index) => {
    item.pos = index + 1;
  });

  return calculados;
}

function renderizarDashboard(data) {
  document.getElementById('ciclo-titulo').innerText = data.titulo;
  document.getElementById('ciclo-fechas').innerText = data.fechas;
  
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
  document.getElementById('sub-asignadas').innerText = data.totales.asignadasVar;

  const tbodyRend = document.getElementById('tbody-rendimiento');
  tbodyRend.innerHTML = '';
  
  let destacadosCount = 0;
  let liderNombre = '';
  let liderPuntos = '';

  data.rendimiento.forEach(row => {
    if (row.pos === 1) {
      liderNombre = row.encuestador;
      liderPuntos = fmt(row.total);
    }
    if (row.final === "BUENO" || row.final === "ALTO" || row.final === "EXCELENTE") {
      destacadosCount++;
    }

    const tr = document.createElement('tr');
    tr.className = `row-${row.final.toLowerCase()}`;
    tr.innerHTML = `
      <td>${row.pos}</td>
      <td style="text-align: left; font-weight: 600;">${row.encuestador}</td>
      <td>${row.can}</td><td>${row.pen}</td><td>${row.rea}</td><td>${row.rec}</td><td>${row.ver}</td><td>${row.asig}</td>
      <td>${fmt(row.tg)}</td><td>${fmt(row.ef)}</td><td>${fmt(row.pd)}</td><td>${fmt(row.eg)}</td><td>${fmt(row.sum)}</td><td>${fmt(row.sub_t)}</td><td><b>${fmt(row.total)}</b></td>
      <td><span class="badge badge-${row.final.toLowerCase()}">${row.final}</span></td>
    `;
    tbodyRend.appendChild(tr);
  });

  document.getElementById('footer-liderazgo').innerText = 
    `${liderNombre} lidera con ${liderPuntos} puntos. ${destacadosCount} encuestadores en nivel BUENO, ALTO o EXCELENTE.`;

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

    // Consolidar conteos base por encuestador sumando todos los ciclos
    ciclo.rendimiento.forEach(r => {
      let nom = r.encuestador;
      if (!rendimientoMap[nom]) {
        rendimientoMap[nom] = { encuestador: nom, can: 0, pen: 0, rea: 0, rec: 0, ver: 0, asig: 0 };
      }
      rendimientoMap[nom].can += parseNum(r.can);
      rendimientoMap[nom].pen += parseNum(r.pen);
      rendimientoMap[nom].rea += parseNum(r.rea);
      rendimientoMap[nom].rec += parseNum(r.rec);
      rendimientoMap[nom].ver += parseNum(r.ver);
      rendimientoMap[nom].asig += parseNum(r.asig);
    });

    // Consolidar supervisión acumulada
    ciclo.supervision.forEach(s => {
      let nom = s.encuestador;
      if (!supervisionMap[nom]) {
        supervisionMap[nom] = { suma: 0, count: 0 };
      }
      supervisionMap[nom].suma += parseNum(s.super);
      supervisionMap[nom].count += 1;
    });
  });

  let listaRendimientoAcumulada = Object.values(rendimientoMap);

  let listaSupervisionConsolidada = Object.keys(supervisionMap).map(nombre => {
    let dataSup = supervisionMap[nombre];
    let promedioSup = dataSup.suma / dataSup.count;
    return { encuestador: nombre, super: Math.round(promedioSup) };
  });

  // Recalcular métricas consolidadas pasando los totales acumulados y promedios de supervisión
  let rendimientoConsolidadoCalculado = calcularMetricasCiclo(listaRendimientoAcumulada, listaSupervisionConsolidada);

  const consolidadoObj = {
    titulo: "CONSOLIDADO GENERAL",
    fechas: `ACUMULADO HISTÓRICO (${cantidadCiclos} CICLOS)`,
    totales: {
      realizadas: totalRealizadas, 
      realizadasPct: totalAsignadas ? ((totalRealizadas/totalAsignadas)*100).toFixed(1) + '%' : '0%',
      pendientes: totalPendientes, 
      pendientesPct: totalAsignadas ? ((totalPendientes/totalAsignadas)*100).toFixed(1) + '%' : '0%',
      canceladas: totalCanceladas, 
      canceladasPct: totalAsignadas ? ((totalCanceladas/totalAsignadas)*100).toFixed(1) + '%' : '0%',
      rechazadas: totalRechazadas, 
      rechazadasPct: totalAsignadas ? ((totalRechazadas/totalAsignadas)*100).toFixed(2) + '%' : '0%',
      verificaciones: totalVerificaciones, 
      verificacionesPct: totalAsignadas ? ((totalVerificaciones/totalAsignadas)*100).toFixed(1) + '%' : '0%',
      asignadas: totalAsignadas, 
      asignadasVar: "Acumulado total"
    },
    rendimiento: rendimientoConsolidadoCalculado,
    supervision: listaSupervisionConsolidada.sort((a, b) => b.super - a.super)
  };

  renderizarDashboard(consolidadoObj);
}
