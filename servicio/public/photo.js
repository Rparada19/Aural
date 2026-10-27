(() => {
  const SIZE = 480;
  const square = (src, w, h, mirror = false) => {
    const side = Math.min(w, h);
    const c = document.createElement('canvas'); c.width = c.height = SIZE;
    const x = c.getContext('2d');
    if (mirror) { x.translate(SIZE, 0); x.scale(-1, 1); }
    x.drawImage(src, (w - side) / 2, (h - side) / 2, side, side, 0, 0, SIZE, SIZE);
    return c.toDataURL('image/jpeg', 0.82);
  };
  const fromFile = (file) => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => { try { resolve(square(img, img.naturalWidth, img.naturalHeight)); } catch (e) { reject(e); } URL.revokeObjectURL(img.src); };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });

  document.querySelectorAll('.photo-widget').forEach((w) => {
    const $ = (s) => w.querySelector(s);
    const data = $('.photo-data'), preview = $('.photo-preview'), consent = $('.photo-consent');
    const save = $('.photo-save'), msg = $('.photo-msg'), err = $('.photo-err');
    const live = $('.photo-live'), video = $('video');
    let stream = null;
    const say = (t) => { err.textContent = t || ''; };
    const sync = () => { if (save) save.disabled = !(data.value && consent.checked); };
    const set = (url) => {
      data.value = url;
      preview.innerHTML = `<img src="${url}" alt="Foto">`;
      $('.photo-cam').textContent = 'Tomar otra foto';
      say(''); if (msg) msg.textContent = '';
      sync();
    };
    const stop = () => { if (stream) stream.getTracks().forEach((t) => t.stop()); stream = null; live.hidden = true; };

    $('.photo-input').addEventListener('change', async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      try { set(await fromFile(f)); } catch { say('No pudimos leer esa imagen. Prueba con una foto en formato JPG o PNG.'); }
      e.target.value = '';
    });

    $('.photo-cam').addEventListener('click', async () => {
      if (!navigator.mediaDevices?.getUserMedia) { say('Este navegador no permite usar la cámara. Usa "Subir una foto".'); return; }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false });
        video.srcObject = stream; live.hidden = false; say('');
        live.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch (e) {
        say(e && e.name === 'NotAllowedError' ? 'Bloqueaste el permiso de la cámara. Actívalo en el candado de la barra de direcciones o usa "Subir una foto".' : 'No encontramos una cámara disponible. Usa "Subir una foto".');
      }
    });
    $('.photo-shot').addEventListener('click', () => {
      if (!video.videoWidth) return;
      set(square(video, video.videoWidth, video.videoHeight, true));
      stop();
    });
    $('.photo-cancel').addEventListener('click', stop);
    window.addEventListener('pagehide', stop);

    consent.addEventListener('change', () => { consent.closest('label').classList.remove('need'); say(''); sync(); });
    const form = w.closest('form');
    if (form) form.addEventListener('submit', (e) => {
      if (data.value && !consent.checked) { e.preventDefault(); consent.focus(); consent.closest('label').classList.add('need'); say('Marca la autorización para guardar tu foto.'); }
    });
    if (save) save.addEventListener('click', async () => {
      save.disabled = true; if (msg) msg.textContent = 'Guardando…';
      const r = await fetch(w.dataset.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ photo: data.value, consent: consent.checked }) }).catch(() => null);
      if (r && r.ok) location.reload(); else { if (msg) msg.textContent = ''; say('No se pudo guardar la foto. Intenta de nuevo.'); save.disabled = false; }
    });
  });
})();
