/* static/js/editor.js */

const fieldsList = document.getElementById("fieldsList");
const renderContainer = document.getElementById("render-container");
const finalCode = document.getElementById("finalCode");
const frameworkSelect = document.getElementById("frameworkSelect");
const codeModal = document.getElementById("codeModal");
const sidebar = document.getElementById("sidebar");
const openSidebarBtn = document.getElementById("openSidebarBtn");

// Estado
window.historyStack = [];
window.historyStep = -1;
window.brandColor = "#0F6CBD";

function initSidebar() {
  if (window.historyStep === -1) saveState(false);
  fieldsList.innerHTML = "";

  window.fieldsData.forEach((field, index) => {
    const card = document.createElement("div");
    card.className = "field-card";
    card.dataset.index = index;

    const w33 = field.width === "33" ? "active" : "";
    const w50 = field.width === "50" ? "active" : "";
    const w100 = field.width === "100" ? "active" : "";
    const isRequired = field.required ? "checked" : "";

    let optionsEditor = "";
    if (field.type === "select" || field.type === "radio") {
      const optsString = field.options.join(", ");
      optionsEditor = `
                <div style="margin-top:10px;">
                    <label style="font-size:10px; color:#94a3b8; margin-bottom:4px; display:block;">OPTIONS (comma separated):</label>
                    <input type="text" class="field-input" value="${optsString}" 
                           placeholder="Yes, No, N/A"
                           onchange="updateOptions(${index}, this.value)">
                </div>`;
    }

    card.innerHTML = `
            <div class="card-header-row">
                <div style="display:flex; align-items:center; gap:8px; overflow:hidden;">
                    <i class="fas fa-grip-lines drag-handle"></i>
                    <span class="field-id" title="${field.id}">
                        ${
                          field.id.length > 18
                            ? field.id.substring(0, 16) + ".."
                            : field.id
                        }
                    </span>
                </div>
                <div class="card-actions">
                    <label class="switch-label" title="Required">
                        Req <input type="checkbox" ${isRequired} onchange="toggleRequired(${index})"><div class="switch-slider"></div>
                    </label>
                    <i class="fas fa-trash icon-btn btn-delete" onclick="deleteField(${index})"></i>
                </div>
            </div>
            
            <input type="text" class="field-input" value="${field.label}" 
                   oninput="updateLabel(${index}, this.value)" placeholder="Label">
            
            <div class="config-row">
                <div class="width-controls">
                    <button class="width-btn ${w33}" onclick="updateWidth(${index}, '33')">⅓</button>
                    <button class="width-btn ${w50}" onclick="updateWidth(${index}, '50')">½</button>
                    <button class="width-btn ${w100}" onclick="updateWidth(${index}, '100')">Full</button>
                </div>
                <select class="type-select" onchange="updateType(${index}, this.value)">
                    <option value="text" ${
                      field.type === "text" ? "selected" : ""
                    }>Txt</option>
                    <option value="textarea" ${
                      field.type === "textarea" ? "selected" : ""
                    }>Area</option>
                    <option value="select" ${
                      field.type === "select" ? "selected" : ""
                    }>List</option>
                    <option value="radio" ${
                      field.type === "radio" ? "selected" : ""
                    }>Radio</option>
                    <option value="checkbox" ${
                      field.type === "checkbox" ? "selected" : ""
                    }>Chk</option>
                </select>
            </div>
            ${optionsEditor}
        `;
    fieldsList.appendChild(card);
  });

  new Sortable(fieldsList, {
    handle: ".drag-handle",
    animation: 150,
    ghostClass: "sortable-ghost",
    onEnd: function (evt) {
      const item = window.fieldsData.splice(evt.oldIndex, 1)[0];
      window.fieldsData.splice(evt.newIndex, 0, item);
      saveState();
      render();
    },
  });
  render();
}

function render() {
  const mode = frameworkSelect.value;
  let html = "";
  let css = "";
  const color = window.brandColor;

  // URL de destino
  const actionInput = document.getElementById("formAction");
  const actionURL = actionInput && actionInput.value ? actionInput.value : "#";

  const paperColor = "#ffffff";
  const inputColor = "#f8fafc";

  if (mode === "css") {
    css = `
<style>
    .pdf-form-container { font-family: 'Segoe UI', sans-serif; color: #334155; }
    .pdf-form { display: flex; flex-wrap: wrap; gap: 24px; }
    .form-item { box-sizing: border-box; }
    .w-100 { width: 100%; }
    .w-50 { width: calc(50% - 12px); }
    .w-33 { width: calc(33.33% - 16px); }
    
    label.field-label { display: block; margin-bottom: 8px; font-weight: 700; color: #1e293b; font-size: 13px; }
    
    input[type="text"], select, textarea { 
        width: 100%; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 4px; 
        background: ${inputColor}; color: #334155; font-size: 14px; transition: 0.2s;
    }
    input:focus, select:focus, textarea:focus { border-color: ${color}; outline: none; box-shadow: 0 0 0 3px ${color}15; }
    textarea { resize: vertical; min-height: 80px; font-family: inherit; }

    .radio-group { display: flex; flex-direction: column; gap: 8px; padding: 12px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0; }
    .radio-option { display: flex; align-items: center; gap: 8px; font-size: 13px; }
    .radio-option input { width: 16px; height: 16px; accent-color: ${color}; cursor: pointer; }

    .checkbox-wrap { display: flex; align-items: center; gap: 10px; padding-top: 25px; }
    .checkbox-wrap input { width: 18px; height: 18px; accent-color: ${color}; cursor: pointer; }
    .checkbox-wrap label { margin: 0; font-weight: 600; font-size: 13px; cursor: pointer; }

    button.submit-btn { 
        background: ${color}; color: white; border: none; padding: 14px; 
        border-radius: 4px; width: 100%; cursor: pointer; font-size: 15px; font-weight: 600; margin-top: 30px; 
    }
    button.submit-btn:hover { opacity: 0.9; }
    
    #success-message { display: none; text-align: center; padding: 40px; color: #10b981; animation: fadeIn 0.5s; }
    #success-message h3 { font-size: 24px; margin-bottom: 10px; }
    #success-message p { color: #64748b; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

    .required-star { color: #ef4444; }
    @media(max-width:600px){ .w-50, .w-33 { width: 100%; } }
    
    body.exported-body { background: #f1f5f9; padding: 40px; }
    .exported-form { background: ${paperColor}; padding: 40px; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); border-top: 6px solid ${color}; max-width: 800px; margin: 0 auto; }
</style>

<div class="pdf-form-container exported-form">
    <form id="my-pdf-form" action="${actionURL}" method="POST" class="pdf-form">\n`;
  } else {
    html += `<div class="exported-form"><form id="my-pdf-form" action="${actionURL}" method="POST">\n`;
  }

  // --- GENERACIÓN DE CAMPOS (CORRECCIÓN CRÍTICA DE 'NAME') ---
  window.fieldsData.forEach((f) => {
    let inputHtml = "";
    let wrapperStart = "";
    let wrapperEnd = "</div>\n";
    const reqAttr = f.required ? "required" : "";
    const reqLabel = f.required ? '<span class="required-star">*</span>' : "";

    // LIMPIEZA DE NOMBRE: Quitamos espacios y caracteres raros para el atributo 'name'
    // Esto asegura que Formspree lo lea bien.
    // Ej: "Employee Name" -> "Employee Name" (Formspree lo acepta) o "Employee_Name"
    const cleanName = f.label.replace(/"/g, "&quot;");

    if (mode === "css") {
      let cls = `form-item w-${f.width}`;
      wrapperStart = `  <div class="${cls}">\n`;

      if (f.type === "select") {
        inputHtml = `<label class="field-label">${
          f.label
        } ${reqLabel}</label>\n    <select name="${cleanName}" ${reqAttr}>${genOpts(
          f.options
        )}</select>`;
      } else if (f.type === "textarea") {
        inputHtml = `<label class="field-label">${f.label} ${reqLabel}</label>\n    <textarea name="${cleanName}" ${reqAttr}></textarea>`;
      } else if (f.type === "radio") {
        // Para radios, el 'name' DEBE ser igual en todas las opciones del grupo
        inputHtml = `<label class="field-label">${
          f.label
        } ${reqLabel}</label>\n    <div class="radio-group">\n${genRadios(
          cleanName,
          f.options
        )}\n    </div>`;
      } else if (f.type === "checkbox") {
        inputHtml = `<div class="checkbox-wrap">
                    <input type="checkbox" name="${cleanName}" ${reqAttr} value="Yes">
                    <label>${f.label} ${reqLabel}</label>
                </div>`;
      } else {
        inputHtml = `<label class="field-label">${f.label} ${reqLabel}</label>\n    <input type="text" name="${cleanName}" ${reqAttr}>`;
      }
      html += wrapperStart + inputHtml + wrapperEnd;
    }
  });

  if (mode === "css")
    html += `  <button type="submit" class="submit-btn" id="submitBtn">Submit Evaluation</button>\n</form>`;

  html += `
    <div id="success-message">
        <div style="font-size: 50px; margin-bottom: 20px;">✅</div>
        <h3>Success!</h3>
        <p>The form has been submitted successfully.</p>
    </div>
</div>`;

  html += `
<script>
    document.getElementById("my-pdf-form").addEventListener("submit", async function(event) {
        event.preventDefault(); 
        var form = event.target;
        var data = new FormData(form);
        var action = form.action;
        var submitBtn = document.getElementById("submitBtn");
        
        if (!action || action === '#' || action.includes(window.location.host)) {
            // EN MODO PREVIEW SOLO MOSTRAMOS AVISO
            alert("⚠️ Simulation Mode: Set your Formspree URL in the sidebar to test real email sending.");
            return;
        }

        submitBtn.innerHTML = "Sending...";
        submitBtn.disabled = true;

        try {
            let response = await fetch(action, {
                method: form.method,
                body: data,
                headers: { 'Accept': 'application/json' }
            });

            if (response.ok) {
                form.style.display = "none";
                document.getElementById("success-message").style.display = "block";
            } else {
                let errorData = await response.json();
                alert("Error: " + (errorData.error || "Unknown error"));
                submitBtn.innerHTML = "Try Again";
                submitBtn.disabled = false;
            }
        } catch (error) {
            console.error(error);
            alert("Network error. Please try again.");
            submitBtn.innerHTML = "Try Again";
            submitBtn.disabled = false;
        }
    });
</script>
`;

  if (mode === "css") html = css + html;

  renderContainer.innerHTML = html;
  renderContainer.style.borderTopColor = color;

  const scripts = renderContainer.getElementsByTagName("script");
  for (let i = 0; i < scripts.length; i++) {
    eval(scripts[i].innerText);
  }

  finalCode.value = html;
}

// Helpers
function genOpts(opts) {
  return opts.map((o) => `<option>${o}</option>`).join("");
}
function genRadios(name, opts) {
  if (!opts || opts.length === 0) return "      <!-- No options -->";
  // Aquí es CRUCIAL que el 'name' sea el nombre de la etiqueta (Employee Name)
  return opts
    .map(
      (o) =>
        `      <div class="radio-option"><input type="radio" name="${name}" value="${o}"> ${o}</div>`
    )
    .join("\n");
}

window.addField = (type) => {
  const newId = `field_${Date.now()}`;
  const defaultOpts =
    type === "radio"
      ? ["Level 1", "Level 2", "Level 3"]
      : type === "select"
      ? ["Opt 1", "Opt 2"]
      : [];
  window.fieldsData.push({
    id: newId,
    label: "New Field",
    type: type,
    width: "100",
    required: false,
    options: defaultOpts,
  });
  initSidebar();
  saveState();
  fieldsList.scrollTop = fieldsList.scrollHeight;
};

// ... Resto de funciones (undo, redo, etc.) igual que antes ...
window.toggleSidebar = () => {
  sidebar.classList.toggle("collapsed");
  if (sidebar.classList.contains("collapsed"))
    openSidebarBtn.classList.add("visible");
  else openSidebarBtn.classList.remove("visible");
};
function saveState(shouldRender = true) {
  window.historyStack = window.historyStack.slice(0, window.historyStep + 1);
  window.historyStack.push(JSON.stringify(window.fieldsData));
  window.historyStep++;
  updateHistoryButtons();
  if (shouldRender) render();
}
function undo() {
  if (window.historyStep > 0) {
    window.historyStep--;
    window.fieldsData = JSON.parse(window.historyStack[window.historyStep]);
    initSidebar();
    updateHistoryButtons();
  }
}
function redo() {
  if (window.historyStep < window.historyStack.length - 1) {
    window.historyStep++;
    window.fieldsData = JSON.parse(window.historyStack[window.historyStep]);
    initSidebar();
    updateHistoryButtons();
  }
}
function updateHistoryButtons() {
  document.getElementById("btnUndo").disabled = window.historyStep <= 0;
  document.getElementById("btnRedo").disabled =
    window.historyStep >= window.historyStack.length - 1;
}
window.updateLabel = (idx, val) => {
  window.fieldsData[idx].label = val;
  saveState();
};
window.updateWidth = (idx, val) => {
  window.fieldsData[idx].width = val;
  initSidebar();
  saveState();
};
window.updateType = (idx, val) => {
  window.fieldsData[idx].type = val;
  initSidebar();
  saveState();
};
window.toggleRequired = (idx) => {
  window.fieldsData[idx].required = !window.fieldsData[idx].required;
  saveState();
};
window.updateOptions = (idx, val) => {
  const newOptions = val
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s !== "");
  window.fieldsData[idx].options = newOptions;
  saveState();
};
window.updateBrandColor = (val) => {
  window.brandColor = val;
  render();
};
window.deleteField = (idx) => {
  window.fieldsData.splice(idx, 1);
  initSidebar();
  saveState();
  Toastify({
    text: "🗑️ Field deleted",
    duration: 2000,
    style: { background: "#ef4444" },
  }).showToast();
};
window.setDevice = (device, btn) => {
  document
    .querySelectorAll(".device-btn")
    .forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  if (device === "mobile") renderContainer.classList.add("mobile-view");
  else renderContainer.classList.remove("mobile-view");
};
window.showCode = () => (codeModal.style.display = "flex");
window.closeModal = () => (codeModal.style.display = "none");
window.copyToClipboard = () => {
  finalCode.select();
  document.execCommand("copy");
  Toastify({ text: "Copied!", style: { background: "#10b981" } }).showToast();
};
window.downloadFile = () => {
  const blob = new Blob([finalCode.value], { type: "text/html" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "form.html";
  link.click();
};
window.downloadPDF = () => {
  const element = document.getElementById("render-container");
  const opt = {
    margin: 0.5,
    filename: "form.pdf",
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
  };
  html2pdf().set(opt).from(element).save();
  Toastify({
    text: "Generating PDF...",
    style: { background: "#0F6CBD" },
  }).showToast();
};
window.printForm = () => {
  window.print();
};
async function runAIRename() {
  const btn = document.getElementById("btnAI");
  const originalContent = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Processing...';
  btn.disabled = true;
  try {
    const response = await fetch("/api/ai-rename", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: window.currentFilename,
        fields: window.fieldsData,
      }),
    });
    const data = await response.json();
    if (data.suggestions) {
      let changesCount = 0;
      window.fieldsData.forEach((field) => {
        if (data.suggestions[field.id]) {
          field.label = data.suggestions[field.id];
          changesCount++;
        }
      });
      initSidebar();
      saveState();
      Toastify({
        text: `✨ AI Finished! Renamed ${changesCount} fields.`,
        duration: 4000,
        style: { background: "linear-gradient(to right, #6366f1, #a855f7)" },
      }).showToast();
    } else {
      Toastify({
        text: "AI returned no suggestions.",
        style: { background: "#f59e0b" },
      }).showToast();
    }
  } catch (error) {
    console.error(error);
    Toastify({
      text: "Error connecting to AI.",
      style: { background: "#ef4444" },
    }).showToast();
  } finally {
    btn.innerHTML = originalContent;
    btn.disabled = false;
  }
}
window.runAIRename = runAIRename;

initSidebar();
