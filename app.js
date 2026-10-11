let ciclosData = {};
let cicloActualId = '';

// Mapeo para normalizar nombres si difieren en los JSON
const NORMALIZAR_NOMBRE = {
  "ALEX JIMENEZ": "ALEX J",
  "DIEGO PADILLA": "DIEGO",
  "ISAC ALVAREZ": "ISAC",
  "JOSE ROMERO": "JOSE ROMERO",
  "JOSÉ ROMERO": "JOSE ROMERO",
  "KATHERINE PERDOMO": "KATHERINE P",
  "LILIANA PIÑA": "LILIANA PIÑA",
  "LISBETH PATERNINA": "LISBETH P",
  "MARTIN BELTRAN": "MARTIN",
  "SAYDIS ROJANO": "SAYDIS R",
  "VERONICA CASTRO": "VERONICA"
};

function normalizar(nombre) {
  if (!nombre) return "";
  let clean = nombre.trim().toUpperCase();
  return NORMALIZAR_NOMBRE[clean] || clean;
}

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
      
      const btn = document.createElement('button');
      btn.className = 'tab-btn';
      btn.id = `btn-${cicloInfo.id}`;
      btn.innerText = cicloInfo.titulo;
      btn.onclick = () => cambiarCiclo(cicloInfo.id);
      tabsBar.appendChild(btn);
      
      const opt = document.createElement('option');
      opt.value = cicloInfo.id;
      opt.innerText = `${cicloInfo.titulo} (${ciclosData[cicloInfo.id].fechas})`;
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

  document.getElementById('footer-liderazgo').innerText = 
    `${liderNombre} lidera con ${liderPuntos} puntos. ${destacadosCount} encuestadores en nivel BUENO o ALTO.`;

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

function parseNum(val) {
  if (typeof val === 'number') return val;
  if (!val || val === '-') return 0;
  return parseFloat(String(val).replace(',', '.')) || 0;
}

function fmt(val) {
  return val.toFixed(2).replace('.', ',');
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
      let nom = normalizar(r.encuestador);
      if (!rendimientoMap[nom]) {
        rendimientoMap[nom] = { 
          encuestador: nom, 
          can: 0, pen: 0, rea: 0, rec: 0, ver: 0, asig: 0, 
          tgSum: 0, efSum: 0, pdSum: 0, egSum: 0, sumSum: 0, subTSum: 0, totalSum: 0 
        };
      }
      rendimientoMap[nom].can += parseNum(r.can);
      rendimientoMap[nom].pen += parseNum(r.pen);
      rendimientoMap[nom].rea += parseNum(r.rea);
      rendimientoMap[nom].rec += parseNum(r.rec);
      rendimientoMap[nom].ver += parseNum(r.ver);
      rendimientoMap[nom].asig += parseNum(r.asig);
      
      rendimientoMap[nom].tgSum += parseNum(r.tg);
      rendimientoMap[nom].efSum += parseNum(r.ef);
      rendimientoMap[nom].pdSum += parseNum(r.pd);
      rendimientoMap[nom].egSum += parseNum(r.eg);
      rendimientoMap[nom].sumSum += parseNum(r.sum);
      rendimientoMap[nom].subTSum += parseNum(r.sub_t);
      rendimientoMap[nom].totalSum += parseNum(r.total);
    });

    ciclo.supervision.forEach(s => {
      let nom = normalizar(s.encuestador);
      if (!supervisionMap[nom]) {
        supervisionMap[nom] = { suma: 0, count: 0 };
      }
      supervisionMap[nom].suma += parseNum(s.super);
      supervisionMap[nom].count += 1;
    });
  });

  let listaConsolidada = Object.values(rendimientoMap).map(item => {
    let promTotal = item.totalSum / cantidadCiclos;
    
    let finalCat = "ALTO";
    if (promTotal < 45) finalCat = "MALO";
    else if (promTotal < 60) finalCat = "BAJO";
    else if (promTotal < 70) finalCat = "REGULAR";
    else if (promTotal < 80) finalCat = "BUENO";

    return {
      encuestador: item.encuestador,
      can: item.can,
      pen: item.pen,
      rea: item.rea,
      rec: item.rec,
      ver: item.ver,
      asig: item.asig,
      tg: fmt(item.tgSum / cantidadCiclos),
      ef: fmt(item.efSum / cantidadCiclos),
      pd: fmt(item.pdSum / cantidadCiclos),
      eg: fmt(item.egSum / cantidadCiclos),
      sum: fmt(item.sumSum / cantidadCiclos),
      sub_t: fmt(item.subTSum / cantidadCiclos),
      total: fmt(promTotal),
      final: finalCat,
      pNum: promTotal
    };
  }).sort((a, b) => b.pNum - a.pNum);

  listaConsolidada.forEach((item, index) => { item.pos = index + 1; });

  let listaSupervisionConsolidada = Object.keys(supervisionMap).map(nombre => {
    let promedioSup = Math.round(supervisionMap[nombre].suma / supervisionMap[nombre].count);
    return { encuestador: nombre, super: promedioSup };
  });

  const consolidadoObj = {
    titulo: "CONSOLIDADO GENERAL",
    fechas: "ACUMULADO HISTÓRICO",
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
      asignadasVar: "Acumulado vs. ciclo anterior"
    },
    rendimiento: listaConsolidada,
    supervision: listaSupervisionConsolidada
  };

  renderizarDashboard(consolidadoObj);
}
