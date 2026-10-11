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
      if (!supMap[s.encuestador]) {
        supMap[s.encuestador] = { suma: 0, count: 0 };
      }
      supMap[s.encuestador].suma += parseNum(s.super);
      supMap[s.encuestador].count += 1;
    });
  });

  // Cálculo estricto del promedio de supervisión (Suma total dividida entre el número de ciclos con registro)
  const listaSup = Object.keys(supMap).map(nombre => {
    let item = supMap[nombre];
    let promedioReal = item.suma / item.count;
    return {
      encuestador: nombre,
      super: Math.round(promedioReal) // Redondeo estándar matemático
    };
  }).sort((a, b) => b.super - a.super);

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
