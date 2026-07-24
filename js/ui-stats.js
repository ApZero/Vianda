const UIStats = {
  render() {
    const view = document.getElementById("view");
    const batches = Storage.getBatches();
    const settings = Storage.getSettings();

    const allLogs = [];
    batches.forEach((b) => (b.consumptionLog || []).forEach((l) => allLogs.push({ ...l, batchName: b.name })));
    allLogs.sort((a, b) => a.date.localeCompare(b.date));

    const totalLeft = batches.filter((b) => b.status !== "archived").reduce((s, b) => s + b.servingsRemaining, 0);

    // consumo por día, últimos 14 días
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const count = allLogs.filter((l) => l.date.slice(0, 10) === key).reduce((s, l) => s + l.count, 0);
      days.push({ key, count, label: d.toLocaleDateString("es-PY", { weekday: "short" }) });
    }
    const maxCount = Math.max(1, ...days.map((d) => d.count));

    // tasa de consumo promedio (últimos 14 días, considerando desde el primer registro si es más reciente)
    const totalRecent = days.reduce((s, d) => s + d.count, 0);
    const avgRate = totalRecent > 0 ? totalRecent / 14 : settings.peoplePerDay;
    const daysLeft = avgRate > 0 ? Math.round(totalLeft / avgRate) : null;

    // frecuencia entre creación de lotes
    const createdDates = batches.map((b) => b.createdAt).filter(Boolean).sort();
    let avgGap = null;
    if (createdDates.length >= 2) {
      const diffs = [];
      for (let i = 1; i < createdDates.length; i++) {
        const diff = (new Date(createdDates[i]) - new Date(createdDates[i - 1])) / 86400000;
        diffs.push(diff);
      }
      avgGap = Math.round(diffs.reduce((a, b) => a + b, 0) / diffs.length);
    }

    const totalServingsEver = allLogs.reduce((s, l) => s + l.count, 0);
    const avgScoreActive = (() => {
      const act = batches.filter((b) => b.score);
      if (!act.length) return null;
      return Math.round(act.reduce((s, b) => s + b.score.total, 0) / act.length);
    })();

    view.innerHTML = `
      <div class="eyebrow">Panorama</div>
      <h2 style="font-size:22px; margin-top:2px;">Estadísticas</h2>

      <div class="stat-grid">
        <div class="stat-box"><div class="num">${avgRate.toFixed(1)}</div><div class="lbl">porciones / día (promedio 14 días)</div></div>
        <div class="stat-box"><div class="num">${daysLeft !== null ? daysLeft : "—"}</div><div class="lbl">días de reserva estimados</div></div>
        <div class="stat-box"><div class="num">${avgGap !== null ? avgGap : "—"}</div><div class="lbl">días entre lote y lote (promedio)</div></div>
        <div class="stat-box"><div class="num">${totalServingsEver}</div><div class="lbl">porciones consumidas en total</div></div>
      </div>

      ${avgScoreActive !== null ? `
      <div class="section-title"><h2>Puntaje promedio de balance</h2></div>
      <div class="card">
        <div class="flex-between">
          <span class="muted">Lotes registrados</span>
          <span class="score-badge ${Score.label(avgScoreActive).cls}">${avgScoreActive}</span>
        </div>
      </div>` : ""}

      <div class="section-title"><h2>Consumo — últimos 14 días</h2></div>
      <div class="card">
        <div style="display:flex; align-items:flex-end; gap:6px; height:90px;">
          ${days.map((d) => `
            <div style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; height:100%;">
              <div style="width:100%; max-width:22px; background:var(--terracotta); border-radius:4px 4px 0 0; height:${(d.count / maxCount) * 70}px; min-height:${d.count > 0 ? 4 : 0}px;"></div>
              <div class="mono" style="font-size:9px; color:var(--ink-soft); margin-top:4px;">${d.label.slice(0,2)}</div>
            </div>
          `).join("")}
        </div>
      </div>

      <div class="section-title"><h2>Recomendación</h2></div>
      <div class="card">
        <p class="muted" style="margin:0;">
          ${this.recommendation(totalLeft, avgRate, daysLeft, settings)}
        </p>
      </div>
    `;
  },

  recommendation(totalLeft, avgRate, daysLeft, settings) {
    if (avgRate <= 0) return "Todavía no hay suficientes datos de consumo. Marcá las porciones que van comiendo desde la pestaña Freezer para empezar a ver proyecciones.";
    if (totalLeft <= settings.lowStockThreshold) {
      return `Con ${totalLeft} porciones y un ritmo de ${avgRate.toFixed(1)}/día, conviene preparar un lote nuevo pronto — quedan aproximadamente ${daysLeft} día(s) de reserva.`;
    }
    return `A este ritmo (${avgRate.toFixed(1)} porciones/día), las ${totalLeft} porciones actuales alcanzan para unos ${daysLeft} día(s) más. Buen margen por ahora.`;
  },
};
