let ciclosData = {};

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const res = await fetch('data/ciclos.json');
    const index = await res.json();
    
    const tabsBar = document.getElementById('tabs-bar');
    const mobileSelect = document.getElementById('mobile-tabs-select');
    
    tabsBar.innerHTML = '';
    mobileSelect.innerHTML = '';
    
    for (let cicloInfo of index.ciclos_disponibles) {
      const cicloRes = await fetch(cicloInfo.archivo);
      let data = await cicloRes.json();
      
      data.rendimiento = calcularMetricas(data.rendimiento, data.supervision);
      data.totales = calcularTotales(data.rendimiento);
      ciclosData[cicloInfo.id] = data;
      
      crearPestana(cicloInfo.id, cicloInfo.titulo, `${data.fechas}`, tabsBar, mobileSelect);
    }
    
    crearPestana('consolidado', 'CONSOLIDADO', 'ACUMULADO HISTÓRICO', tabsBar, mobileSelect);
    cambiarCiclo(index.ciclos_disponibles[index.ciclos_disponibles.length - 1].id);
    
  } catch (err) {
    console.error("Error inicializando el dashboard:", err);
  }
});

function crearPestana(id, titulo, subtitulo, pcContainer, mobileContainer) {
  const btn = document.createElement('button');
  btn.className = 'tab-btn';
  btn.id = `btn-${id}`;
  btn.innerText = titulo;
  btn.onclick = () => cambiarCiclo(id);
  pcContainer.appendChild(btn);
  
  const opt = document.createElement('option');
  opt.value = id;
  opt.innerText = `${titulo} (${subtitulo})`;
  mobileContainer.appendChild(opt);
}

function cambiarCiclo(id) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById(`btn-${id}`);
  if (btn) btn.classList.add('active');
  document.getElementById('mobile-tabs-select').value = id;

  if (id === 'consolidado') {
    renderizarDashboard(generarConsolidado());
  } else {
    renderizarDashboard(ciclosData[id]);
  }
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
  const divReal = r === 0 ? 1 : r; // Divisor específico basado en las realizadas

  return {
    realizadas: r, 
    realizadasPct: ((r / divAsig) * 100).toFixed(1).replace('.', ',') + '%',
    
    pendientes: p, 
    pendientesPct: ((p / divAsig) * 100).toFixed(1).replace('.', ',') + '%',
    
    canceladas: c, 
    canceladasPct: ((c / divAsig) * 100).toFixed(1).replace('.', ',') + '%',
    
    // Calculadas en base a las REALIZADAS
    rechazadas: rc, 
    rechazadasPct: ((rc / divReal) * 100).toFixed(2).replace('.', ',') + '%',
    
    verificaciones: v, 
    verificacionesPct: ((v / divReal) * 100).toFixed(1).replace('.', ',') + '%',
    
    asignadas: a, 
    asignadasVar: "Total asignadas"
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

function generarConsolidado() {
  const rendMap = {}, supMap = {};
  const numCiclos = Object.keys(ciclosData).length;

  Object.values(ciclosData).forEach(ciclo => {
    ciclo.rendimiento.forEach(r => {
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
  totalesCalc.asignadasVar = `Acumulado (${numCiclos} ciclos)`;

  return {
    titulo: "CONSOLIDADO GENERAL",
    fechas: `ACUMULADO HISTÓRICO (${numCiclos} CICLOS)`,
    totales: totalesCalc,
    rendimiento: rendimientoCalc,
    supervision: listaSup
  };
}

function renderizarDashboard(data) {
  document.getElementById('ciclo-titulo').innerText = data.titulo;
  document.getElementById('ciclo-fechas').innerText = data.fechas;

  Object.entries(data.totales).forEach(([key, val]) => {
    const elVal = document.getElementById(`tot-${key}`);
    const elSub = document.getElementById(`sub-${key}`);
    if (elVal) elVal.innerText = val;
    
    if (elSub) {
      if (key === 'asignadas') {
        elSub.innerText = data.totales.asignadasVar;
      } else if (key === 'rechazadas' || key === 'verificaciones') {
        // Subtítulo específico para rechazadas y verificaciones basado en realizadas
        elSub.innerText = data.totales[key + 'Pct'] + " de las realizadas";
      } else {
        // Resto de tarjetas basadas en las asignadas
        elSub.innerText = data.totales[key + 'Pct'] + " de las asignadas";
      }
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
