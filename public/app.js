let extractedRawText = '';
let selectedOptionTitle = '';

const cvFileInput = document.getElementById('cvFile');
const uploadBtn = document.getElementById('uploadBtn');
const uploadStatus = document.getElementById('uploadStatus');
const optionsContainer = document.getElementById('optionsContainer');
const optionsList = document.getElementById('optionsList');
const previewArea = document.getElementById('previewArea');
const actionButtons = document.getElementById('actionButtons');
const downloadBtn = document.getElementById('downloadBtn');
const copyBtn = document.getElementById('copyBtn');
const activeFocusBadge = document.getElementById('activeFocusBadge');
const currentFocusName = document.getElementById('currentFocusName');

uploadBtn.addEventListener('click', async () => {
  const file = cvFileInput.files[0];
  if (!file) {
    alert('Por favor selecciona un archivo primero.');
    return;
  }

  const formData = new FormData();
  formData.append('cv', file);

  uploadStatus.textContent = 'Procesando archivo...';
  uploadStatus.className = 'mt-3 text-sm text-center font-medium text-indigo-600';
  uploadBtn.disabled = true;

  try {
    const res = await fetch('/api/cv/upload', { 
      method: 'POST', 
      body: formData 
    });
    
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Error desconocido del servidor');
    }

    extractedRawText = data.extractedData.rawText;
    uploadStatus.textContent = '¡Archivo analizado con éxito!';
    uploadStatus.className = 'mt-3 text-sm text-center font-medium text-emerald-600';
    uploadBtn.disabled = false;

    loadOptions();
  } catch (err) {
    console.error('Error detallado en upload:', err);
    uploadStatus.textContent = 'Error: ' + err.message;
    uploadStatus.className = 'mt-3 text-sm text-center font-medium text-rose-600';
    uploadBtn.disabled = false;
  }
});

async function loadOptions() {
  try {
    const res = await fetch('/api/cv/options');
    const data = await res.json();

    optionsList.innerHTML = '';
    data.options.forEach(opt => {
      const card = document.createElement('div');
      card.className = 'p-3 border border-slate-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50/30 cursor-pointer transition-all';
      card.innerHTML = `
        <h3 class="font-semibold text-slate-800 text-sm">${opt.title}</h3>
        <p class="text-xs text-slate-500 mt-1">${opt.description}</p>
      `;
      card.addEventListener('click', () => {
        selectedOptionTitle = opt.title;
        rewriteCV(opt.id, opt.title, card);
      });
      optionsList.appendChild(card);
    });

    optionsContainer.classList.remove('hidden');
  } catch (err) {
    console.error('Error cargando opciones:', err);
  }
}

async function rewriteCV(optionId, optionTitle, selectedCard) {
  previewArea.textContent = `Optimizando CV bajo el enfoque "${optionTitle}" usando IA local... Por favor espere.`;
  actionButtons.classList.add('hidden');

  document.querySelectorAll('#optionsList > div').forEach(el => {
    el.classList.remove('border-indigo-600', 'bg-indigo-50');
  });
  selectedCard.classList.add('border-indigo-600', 'bg-indigo-50');

  try {
    const res = await fetch('/api/cv/rewrite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rawText: extractedRawText, optionId })
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Error en reescritura');

    previewArea.textContent = data.variant.content;
    actionButtons.classList.remove('hidden');

    currentFocusName.textContent = optionTitle;
    activeFocusBadge.classList.remove('hidden');

  } catch (err) {
    previewArea.textContent = 'Error al generar la variante: ' + err.message;
  }
}

copyBtn.addEventListener('click', () => {
  const text = previewArea.textContent;
  navigator.clipboard.writeText(text).then(() => {
    const originalText = copyBtn.textContent;
    copyBtn.textContent = '¡Texto Copiado!';
    setTimeout(() => copyBtn.textContent = originalText, 2000);
  }).catch(err => {
    alert('Error al copiar al portapapeles: ' + err);
  });
});

downloadBtn.addEventListener('click', async () => {
  let markdown = previewArea.textContent;
  if (!markdown) return;
  if (markdown.toLowerCase().startsWith('md\n')) markdown = markdown.substring(3);

  try {
    const res = await fetch('/api/cv/download-docx', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markdown })
    });

    if (!res.ok) throw new Error('Error al generar el documento Word');

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CV_Optimizado_${selectedOptionTitle.replace(/[^a-zA-Z0-9]/g, '_')}.docx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch (err) {
    alert('Error descargando archivo: ' + err.message);
  }
});
