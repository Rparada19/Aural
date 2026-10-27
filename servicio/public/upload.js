(() => {
  const input = document.getElementById('upimg');
  if (!input) return;
  const msg = document.getElementById('upmsg');
  const shrink = (file) => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const max = 1600, k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      resolve({ mime: type, data: c.toDataURL(type, 0.85).split(',')[1] });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = reject; img.src = URL.createObjectURL(file);
  });
  input.addEventListener('change', async () => {
    for (const f of input.files) {
      msg.textContent = `Subiendo ${f.name}…`;
      try {
        const { mime, data } = await shrink(f);
        const r = await fetch(`/admin/estudio/${input.dataset.module}/imagen`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre: f.name.replace(/\.[^.]+$/, ''), mime, data }) });
        if (!r.ok) throw new Error();
      } catch { msg.textContent = `No se pudo subir ${f.name}`; return; }
    }
    location.reload();
  });
})();
