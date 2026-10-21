let appData = { meses: [] };
let datosMensuales = {};

document.addEventListener("DOMContentLoaded", async () => {
  try {
    // 1. Leer el archivo de índice (data/ciclos.json)
    const res = await fetch('data/ciclos.json');
    if (!res.ok) throw new Error("No se pudo cargar data/ciclos.json");
    appData = await res.json();
    
    // 2. Cargar cada archivo de mes (ej. data/2026-10.json)
    for (let mInfo of appData.meses) {
      const mRes = await fetch(mInfo.archivo);
      if (mRes.ok) {
        let mData = await mRes.json();
        mData.ciclos.forEach(c => {
          c.rendimiento = calcularMetricas(c.rendimiento, c.supervision);
          c.totales = calcularTotales(c.rendimiento);
        });
        datosMensuales[mInfo.id] = mData;
      }
    }
    
    construirSidebar();
    mostrarConsolidadoGeneral();
    
  } catch (err) {
    console.error("Error iniciando la aplicación:", err);
    document.getElementById('ciclo-titulo').innerText = "ERROR AL CARGAR DATOS";
  }
});

function construirSidebar() {
  const menu = document.getElementById('sidebar-menu');
  if (!menu) return;
  menu.innerHTML = '';

  // Icono 1: Inicio
  agregarItemMenu(menu, '<i class="bi bi-grid-1x2-fill"></i>', 'Consolidado General', () => mostrarConsolidadoGeneral(), 'menu-consolidado');

  // Icono 2: Meses
  if (appData.meses) {
    appData.meses.forEach(mes => {
      agregarItemMenu(menu, '<i class="bi bi-stack"></i>', mes.nombre, () => seleccionarMes(mes.id), `menu-mes-${mes.id}`);
    });
  }

  // Icono 3: Información
  agregarItemMenu(menu, '<i class="bi bi-info-square"></i>', 'Información & Guía', () => mostrarInformacion(), 'menu-info');
}

function agregarItemMenu(container, iconoHtml, texto, accion, id) {
  const btn = document.createElement('button');
  btn.className = 'menu-item';
  btn.id = id;
  btn.innerHTML = `<span class="icon">${iconoHtml}</span><span class="text">${texto}</span>`;
  btn.onclick = accion;
  container.appendChild(btn);
}

function activarMenu(id) {
  document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
  const target = document.getElementById(id);
  if (target) target.classList.add('active');
}

function mostrarConsolidadoGeneral() {
  activarMenu('menu-consolidado');
  document.getElementById('view-title').innerText = "CONSOLIDADO GENERAL (HISTÓRICO)";
  document.getElementById('sub-tabs-bar').style.display = 'none';
  document.getElementById('view-dashboard').style.display = 'grid';
  document.getElementById('view-info').style.display = 'none';
  document.getElementById('cards-grid').style.display = 'grid';

  let todosLosRendimientos = [];
  let supervisionMap = {};
  let totalCiclosCount = 0;

  Object.values(datosMensuales).forEach(mesData => {
    mesData.ciclos.forEach(ciclo => {
      totalCiclosCount++;
      ciclo.rendimiento.forEach(r => todosLosRendimientos.push(r));
      ciclo.supervision.forEach(s => {
        if (!supervisionMap[s.encuestador]) supervisionMap[s.encuestador] = { suma: 0, count: 0 };
        supervisionMap[s.encuestador].suma += parseNum(s.super);
        supervisionMap[s.encuestador].count += 1;
      });
    });
  });

  let rendMap = {};
  todosLosRendimientos.forEach(r => {
    if (!rendMap[r.encuestador]) {
      rendMap[r.encuestador] = { encuestador: r.encuestador, can: 0, pen: 0, rea: 0, rec: 0, ver: 0, asig: 0 };
    }
    rendMap[r.encuestador].can += r.can;
    rendMap[r.encuestador].pen += r.pen;
    rendMap[r.encuestador].rea += r.rea;
    rendMap[r.encuestador].rec += r.rec;
    rendMap[r.encuestador].ver += r.ver;
    rendMap[r.encuestador].asig += r.asig;
  });

  const listaSup = Object.keys(supervisionMap).map(nombre => ({
    encuestador: nombre,
    super: Math.round(supervisionMap[nombre].suma / supervisionMap[nombre].count)
  })).sort((a, b) => b.super - a.super);

  const rendimientoCalc = calcularMetricas(Object.values(rendMap), listaSup);
  const totalesCalc = calcularTotales(rendimientoCalc);
  totalesCalc.asignadasVar = `Acumulado global (${totalCiclosCount} ciclos)`;

  renderizarDashboard({
    titulo: "HISTÓRICO GLOBAL",
    fechas: `ACUMULADO GLOBAL (${Object.keys(datosMensuales).length} MESES / ${totalCiclosCount} CICLOS)`,
    totales: totalesCalc,
    rendimiento: rendimientoCalc,
    supervision: listaSup
  });
}

function seleccionarMes(mesId) {
  activarMenu(`menu-mes-${mesId}`);
  const mData = datosMensuales[mesId];
  if (!mData) return;

  document.getElementById('view-title').innerText = `MES: ${mData.nombreMes.toUpperCase()}`;
  document.getElementById('view-dashboard').style.display = 'grid';
  document.getElementById('view-info').style.display = 'none';
  document.getElementById('cards-grid').style.display = 'grid';

  const subBar = document.getElementById('sub-tabs-bar');
  subBar.style.display = 'flex';
  subBar.innerHTML = '';

  const btnCons = document.createElement('button');
  btnCons.className = 'sub-tab-btn';
  btnCons.id = `sub-btn-consolidado-${mesId}`;
  btnCons.innerText = 'CONSOLIDADO MES';
  btnCons.onclick = () => mostrarConsolidadoMes(mesId);
  subBar.appendChild(btnCons);

  mData.ciclos.forEach(cInfo => {
    const btn = document.createElement('button');
    btn.className = 'sub-tab-btn';
    btn.id = `sub-btn-${cInfo.id}`;
    btn.innerText = cInfo.titulo;
    btn.onclick = () => mostrarCiclo(mesId, cInfo.id);
    subBar.appendChild(btn);
  });

  mostrarConsolidadoMes(mesId);
}

function mostrarConsolidadoMes(mesId) {
  document.querySelectorAll('.sub-tab-btn').forEach(b => b.classList.remove('active'));
  const btnC = document.getElementById(`sub-btn-consolidado-${mesId}`);
  if (btnC) btnC.classList.add('active');

  const mData = datosMensuales[mesId];
  let rendMap = {}, supMap = {}, numCiclos = mData.ciclos.length;

  mData.ciclos.forEach(ciclo => {
    ciclo.rendimiento.forEach(r => {
      if (!rendMap[r.encuestador]) rendMap[r.encuestador] = { encuestador: r.encuestador, can: 0, pen: 0, rea: 0, rec: 0, ver: 0, asig: 0 };
      rendMap[r.encuestador].can += r.can;
      rendMap[r.encuestador].pen += r.pen;
      rendMap[r.encuestador].rea += r.rea;
      rendMap[r.encuestador].rec += r.rec;
      rendMap[r.encuestador].ver += r.ver;
      rendMap[r.encuestador].asig += r.asig;
    });
    ciclo.supervision.forEach(s => {
      if (!supMap[s.encuestador]) supMap[s.encuestador] = { suma: 0, count: 0 };
      supMap[s.encuestador].suma += parseNum(s.super);
      supMap[s.encuestador].count += 1;
    });
  });

  const listaSup = Object.keys(supMap).map(nombre => ({
    encuestador: nombre,
    super: Math.round(supMap[nombre].suma / supMap[nombre].count)
  })).sort((a, b) => b.super - a.super);

  const rendimientoCalc = calcularMetricas(Object.values(rendMap), listaSup);
  const totalesCalc = calcularTotales(rendimientoCalc);
  totalesCalc.asignadasVar = `Acumulado ${mData.nombreMes} (${numCiclos} ciclos)`;

  renderizarDashboard({
    titulo: `CONSOLIDADO - ${mData.nombreMes.toUpperCase()}`,
    fechas: `ACUMULADO MENSUAL (${numCiclos} CICLOS)`,
    totales: totalesCalc,
    rendimiento: rendimientoCalc,
    supervision: listaSup
  });
}

function mostrarCiclo(mesId, cicloId) {
  document.querySelectorAll('.sub-tab-btn').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById(`sub-btn-${cicloId}`);
  if (btn) btn.classList.add('active');

  const cData = datosMensuales[mesId].ciclos.find(c => c.id === cicloId);
  renderizarDashboard(cData);
}

function mostrarInformacion() {
  activarMenu('menu-info');
  document.getElementById('view-title').innerText = "GUÍA Y CLASIFICACIÓN INSTITUCIONAL";
  document.getElementById('sub-tabs-bar').style.display = 'none';
  document.getElementById('view-dashboard').style.display = 'none';
  document.getElementById('view-info').style.display = 'block';
  document.getElementById('cards-grid').style.display = 'none';
  document.getElementById('ciclo-titulo').innerText = "DOCUMENTACIÓN";
  document.getElementById('ciclo-fechas').innerText = "METODOLOGÍA DE EVALUACIÓN";
  document.getElementById('footer-liderazgo').innerText = "Sistema de Gestión de Indicadores Sisbén";
}

const parseNum = val => (typeof val === 'number' ? val : (!val || val === '-' ? 0 : parseFloat(String(val).replace(',', '.')) || 0));
const fmt = val => val.toFixed(2).replace('.', ',');

function calcularTotales(rendimiento) {
  let r = 0, p = 0, c = 0, rc = 0, v = 0, a = 0;
  rendimiento.forEach(row => {
    r += parseNum(row.rea); p += parseNum(row.pen); c += parseNum(row.can);
    rc += parseNum(row.rec); v += parseNum(row.ver); a += parseNum(row.asig);
  });
  
  const divAsig = a === 0 ? 1 : a;
  const baseProcesada = r + rc + v; // Base precisa: Realizadas + Rechazadas + Verificaciones
  const divProcesada = baseProcesada === 0 ? 1 : baseProcesada;

  return {
    realizadas: r, realizadasPct: ((r / divAsig) * 100).toFixed(1).replace('.', ',') + '%',
    pendientes: p, pendientesPct: ((p / divAsig) * 100).toFixed(1).replace('.', ',') + '%',
    canceladas: c, canceladasPct: ((c / divAsig) * 100).toFixed(1).replace('.', ',') + '%',
    rechazadas: rc, rechazadasPct: ((rc / divProcesada) * 100).toFixed(2).replace('.', ',') + '%',
    verificaciones: v, verificacionesPct: ((v / divProcesada) * 100).toFixed(1).replace('.', ',') + '%',
    asignadas: a, asignadasVar: "Total asignadas"
  };
}

function calcularMetricas(rendimiento, supervision) {
  const supMap = {};
  if (supervision) supervision.forEach(s => { supMap[s.encuestador] = parseNum(s.super); });

  const maxAsig = Math.max(...rendimiento.map(r => parseNum(r.asig)), 1);

  const calculados = rendimiento.map(row => {
    const can = parseNum(row.can), pen = parseNum(row.pen), rea = parseNum(row.rea);
    const rec = parseNum(row.rec), ver = parseNum(row.ver), asig = parseNum(row.asig);

    const asigDiv = asig === 0 ? 1 : asig;
    const tg = ((can + rea + rec + ver) / asigDiv) * 20;

    const efDenom = (rea + rec + ver) === 0 ? 1 : (rea + rec + ver);
    const ef = (rea / efDenom) * 30;

    const pd = (rea / maxAsig) * 20;
    const eg = (rea / asigDiv) * 30;
    const suma = tg + ef + pd + eg;
    const sub_t = (suma * 0.8) + ((asig / maxAsig) * 20);

    const superVal = supMap[row.encuestador] || 0;
    const total = (sub_t * 0.6) + (superVal * 0.4);

    let final = "MALO";
    if (total >= 90) final = "EXCELENTE";
    else if (total >= 80) final = "ALTO";
    else if (total >= 70) final = "BUENO";
    else if (total >= 60) final = "REGULAR";
    else if (total >= 50) final = "BAJO";

    return { encuestador: row.encuestador, can, pen, rea, rec, ver, asig, tg, ef, pd, eg, sum: suma, sub_t, total, final, pNum: total };
  });

  calculados.sort((a, b) => b.pNum - a.pNum);
  calculados.forEach((item, index) => { item.pos = index + 1; });
  return calculados;
}

function renderizarDashboard(data) {
  document.getElementById('ciclo-titulo').innerText = data.titulo;
  document.getElementById('ciclo-fechas').innerText = data.fechas;

  Object.entries(data.totales).forEach(([key, val]) => {
    const elVal = document.getElementById(`tot-${key}`);
    const elSub = document.getElementById(`sub-${key}`);
    if (elVal) elVal.innerText = val;
    if (elSub) {
      if (key === 'asignadas') elSub.innerText = data.totales.asignadasVar;
      else if (key === 'rechazadas' || key === 'verificaciones') elSub.innerText = data.totales[key + 'Pct'] + " del procesado";
      else elSub.innerText = data.totales[key + 'Pct'] + " de las asignadas";
    }
  });

  const tbodyRend = document.getElementById('tbody-rendimiento');
  tbodyRend.innerHTML = '';
  let destacados = 0, lider = data.rendimiento[0];

  data.rendimiento.forEach(row => {
    if (["BUENO", "ALTO", "EXCELENTE"].includes(row.final)) destacados++;

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

  if (lider) {
    document.getElementById('footer-liderazgo').innerText = 
      `${lider.encuestador} lidera con ${fmt(lider.total)} puntos. ${destacados} encuestadores en nivel BUENO, ALTO o EXCELENTE.`;
  }

  const tbodySup = document.getElementById('tbody-supervision');
  tbodySup.innerHTML = '';
  data.supervision.forEach(row => {
    let color = 'sup-gris', val = row.super;
    if (val >= 90) color = 'sup-azul';
    else if (val >= 70) color = 'sup-verde';
    else if (val >= 60) color = 'sup-amarillo';
    else if (val >= 50) color = 'sup-rosado';

    const tr = document.createElement('tr');
    tr.innerHTML = `<td style="text-align: left;">${row.encuestador}</td><td><span class="sup-badge ${color}">${val}</span></td>`;
    tbodySup.appendChild(tr);
  });
}
