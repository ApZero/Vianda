// Respaldo automático diario + exportar/importar manual
const Backup = {
  todayStr() {
    const d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  },

  downloadJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  },

  manualExport() {
    const data = Storage.exportAll();
    this.downloadJSON(data, `vianda-backup-${this.todayStr()}.json`);
    Storage.setLastBackupDate(this.todayStr());
  },

  // Se llama al iniciar la app. Si no se hizo backup hoy, lo dispara automáticamente.
  runAutoBackupIfNeeded() {
    const today = this.todayStr();
    const last = Storage.getLastBackupDate();
    if (last === today) return false;
    const data = Storage.exportAll();
    // Evita descargar un backup vacío en el primerísimo uso (sin lotes ni cambios)
    if (data.batches.length === 0 && !last) {
      Storage.setLastBackupDate(today);
      return false;
    }
    this.downloadJSON(data, `vianda-backup-${today}.json`);
    Storage.setLastBackupDate(today);
    return true;
  },

  importFromFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          Storage.importAll(data);
          resolve(data);
        } catch (e) {
          reject(e);
        }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  },
};
