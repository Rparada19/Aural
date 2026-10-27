(() => {
  const crop = (file) => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const side = Math.min(img.width, img.height), size = 480;
      const c = document.createElement('canvas'); c.width = c.height = size;
      c.getContext('2d').drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
      URL.revokeObjectURL(img.src);
      resolve(c.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });

  document.querySelectorAll('.photo-widget').forEach((w) => {
    const input = w.querySelector('.photo-input');
    const data = w.querySelector('.photo-data');
    const preview = w.querySelector('.photo-preview');
    const consent = w.querySelector('.photo-consent');
    const save = w.querySelector('.photo-save');
    const msg = w.querySelector('.photo-msg');
    const sync = () => { if (save) save.disabled = !(data.value && consent.checked); };
    input.addEventListener('change', async () => {
      const f = input.files[0];
      if (!f) return;
      try {
        data.value = await crop(f);
        preview.innerHTML = `<img src="${data.value}" alt="Tu foto">`;
        w.classList.add('has-photo');
        w.querySelector('.photo-text strong').textContent = 'Cambiar foto';
      } catch { data.value = ''; }
      sync();
    });
    consent.addEventListener('change', sync);
    const form = w.closest('form');
    if (form) form.addEventListener('submit', (e) => {
      if (data.value && !consent.checked) { e.preventDefault(); consent.focus(); consent.closest('label').classList.add('need'); }
    });
    if (save) save.addEventListener('click', async () => {
      save.disabled = true; msg.textContent = 'Guardando…';
      const r = await fetch(w.dataset.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ photo: data.value, consent: consent.checked }) });
      if (r.ok) location.reload(); else { msg.textContent = 'No se pudo guardar la foto. Intenta con otra imagen.'; save.disabled = false; }
    });
  });
})();
