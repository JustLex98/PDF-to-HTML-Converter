/* static/js/editor.js - Ultimate Version */

const fieldsList = document.getElementById("fieldsList");
const renderContainer = document.getElementById("render-container");
const finalCode = document.getElementById("finalCode");
const frameworkSelect = document.getElementById("frameworkSelect");
const codeModal = document.getElementById("codeModal");

// --- HISTORY SYSTEM (Undo/Redo) ---
let historyStack = [];
let historyIndex = -1;
let isUndoRedo = false;

function initHistory() {
  // Save initial state
  saveHistory();
  // Keyboard Shortcuts
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "z") {
      e.preventDefault();
      undo();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "y") {
      e.preventDefault();
      redo();
    }
  });
}

function saveHistory() {
  if (isUndoRedo) return;
  // Remove future history if we are in the middle
  if (historyIndex < historyStack.length - 1) {
    historyStack = historyStack.slice(0, historyIndex + 1);
  }
  // Push deep copy
  historyStack.push(JSON.stringify(window.fieldsData));
  historyIndex++;
  updateHistoryButtons();
}

function undo() {
  if (historyIndex > 0) {
    isUndoRedo = true;
    historyIndex--;
    window.fieldsData = JSON.parse(historyStack[historyIndex]);
    initSidebar();
    render();
    isUndoRedo = false;
    updateHistoryButtons();
  }
}

function redo() {
  if (historyIndex < historyStack.length - 1) {
    isUndoRedo = true;
    historyIndex++;
    window.fieldsData = JSON.parse(historyStack[historyIndex]);
    initSidebar();
    render();
    isUndoRedo = false;
    updateHistoryButtons();
  }
}

function updateHistoryButtons() {
  document.getElementById("btnUndo").disabled = historyIndex === 0;
  document.getElementById("btnRedo").disabled =
    historyIndex === historyStack.length - 1;
}

// --- INIT SIDEBAR ---
function initSidebar() {
  fieldsList.innerHTML = "";

  window.fieldsData.forEach((field, index) => {
    const card = document.createElement("div");
    card.className = "field-card";
    card.dataset.index = index;

    // Class helpers
    const active = (val) => (field.width === val ? "active" : "");
    const isRequired = field.required ? "checked" : "";
    const inputType = field.inputType || "text";

    // Additional Controls (Options or Type Select)
    let extras = "";

    // Validation Row (Type & Required) - Solo para inputs de texto
    if (field.type === "text") {
      extras += `
                <div class="config-row">
                    <div class="validation-controls">
                        <select class="type-select" onchange="updateField(${index}, 'inputType', this.value)">
                            <option value="text" ${
                              inputType == "text" ? "selected" : ""
                            }>Text</option>
                            <option value="email" ${
                              inputType == "email" ? "selected" : ""
                            }>Email</option>
                            <option value="number" ${
                              inputType == "number" ? "selected" : ""
                            }>Num</option>
                            <option value="date" ${
                              inputType == "date" ? "selected" : ""
                            }>Date</option>
                        </select>
                        <label class="check-label">
                            <input type="checkbox" ${isRequired} onchange="updateField(${index}, 'required', this.checked)"> Req.
                        </label>
                    </div>
                </div>
            `;
    } else if (field.type !== "header") {
      extras += `
                <div class="config-row">
                    <div class="validation-controls">
                        <label class="check-label">
                            <input type="checkbox" ${isRequired} onchange="updateField(${index}, 'required', this.checked)"> Required
                        </label>
                    </div>
                </div>
            `;
    }

    // Options Editor
    if (field.type === "select") {
      const opts = field.options ? field.options.join(", ") : "";
      extras += `<div style="margin-top:8px;"><textarea class="field-input" style="height:50px; font-family:sans-serif;" onchange="updateOptions(${index}, this.value)">${opts}</textarea></div>`;
    }

    // Render Card
    card.innerHTML = `
            <div class="card-header-row">
                <i class="fas fa-grip-vertical drag-handle"></i>
                <div class="card-actions">
                    <i class="fas fa-clone icon-btn" onclick="duplicateField(${index})" title="Duplicate"></i>
                    <i class="fas fa-trash-alt icon-btn btn-delete" onclick="deleteField(${index})" title="Delete"></i>
                </div>
            </div>
            
            <input type="text" class="field-input" value="${field.label}" 
                   oninput="updateLabel(${index}, this.value)">
            
            <div class="width-controls">
                <button class="width-btn ${active(
                  "33"
                )}" onclick="updateWidth(${index}, '33')">⅓</button>
                <button class="width-btn ${active(
                  "50"
                )}" onclick="updateWidth(${index}, '50')">½</button>
                <button class="width-btn ${active(
                  "100"
                )}" onclick="updateWidth(${index}, '100')">Full</button>
            </div>
            
            ${extras}
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
      saveHistory(); // Save on reorder
      initSidebar();
      render();
    },
  });
}

// --- RENDER ENGINE ---
function render() {
  const mode = frameworkSelect.value;
  const urlInput = document.getElementById("formAction");
  let actionUrl = urlInput && urlInput.value.trim() ? urlInput.value : "#";
  let html = "";
  let css = "";

  // GOOGLE SHEETS MODE SPECIAL
  if (mode === "sheets") {
    html += `
<!-- GOOGLE SHEETS FORM (No Backend Required) -->
<form id="google-sheet-form" class="pdf-form">
`;
  } else if (mode === "css") {
    css = `
<style>
    body { font-family: 'Inter', sans-serif; background: #fff; color: #1e293b; }
    .pdf-form { display: flex; flex-wrap: wrap; gap: 24px; width: 100%; max-width: 800px; margin: 0 auto; }
    .form-group { display: flex; flex-direction: column; box-sizing: border-box; }
    .w-100 { width: 100%; } .w-50 { width: calc(50% - 12px); } .w-33 { width: calc(33.33% - 16px); }
    label { font-size: 13px; font-weight: 600; color: #475569; margin-bottom: 8px; display: block; }
    input, select, textarea { width: 100%; padding: 12px 16px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; box-sizing: border-box; transition:0.2s; }
    input:focus, select:focus, textarea:focus { border-color: #3b82f6; outline: none; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
    .section-header { width: 100%; margin: 30px 0 10px 0; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
    .section-header h3 { margin: 0; font-size: 18px; color: #1e293b; }
    .checkbox-wrap { flex-direction: row; align-items: center; gap: 12px; padding: 10px 0; }
    .checkbox-wrap input { width: 20px; height: 20px; }
    .rating-group { display: flex; gap: 5px; }
    .rating-item { flex: 1; padding: 8px; border: 1px solid #cbd5e0; text-align: center; cursor: pointer; border-radius: 4px; }
    input[type="radio"] { display: none; }
    input[type="radio"]:checked + .rating-item { background: #3b82f6; color: white; border-color: #3b82f6; }
    button[type="submit"] { background: #0f172a; color: white; border: none; padding: 16px; width: 100%; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; margin-top: 40px; }
    @media(max-width:600px){ .w-50, .w-33 { width: 100%; } }
</style>
<form action="${actionUrl}" method="POST" class="pdf-form">\n`;
  }
  // ... (Bootstrap y Tailwind códigos similares a lo que ya tenías) ...
  else if (mode === "bootstrap")
    html += `<form action="${actionUrl}" method="POST" class="row g-3">\n`;
  else if (mode === "tailwind")
    html += `<form action="${actionUrl}" method="POST" class="flex flex-wrap -mx-3">\n`;

  // FIELD LOOP
  window.fieldsData.forEach((f) => {
    const required = f.required ? "required" : "";
    const type = f.inputType || "text";
    let content = "";

    // Render Inputs
    if (f.type === "header") {
      content =
        mode === "css"
          ? `<div class="section-header"><h3>${f.label}</h3></div>`
          : `<h3>${f.label}</h3>`;
    } else if (f.type === "select") {
      const opts = f.options
        ? f.options.map((o) => `<option>${o}</option>`).join("")
        : "";
      const el =
        mode === "bootstrap"
          ? "form-select"
          : mode === "tailwind"
          ? "block appearance-none w-full bg-gray-200 border border-gray-200 text-gray-700 py-3 px-4 pr-8 rounded"
          : "";
      content = `<label>${f.label}</label><select name="${f.id}" class="${el}" ${required}>${opts}</select>`;
    } else if (f.type === "textarea") {
      const el =
        mode === "bootstrap"
          ? "form-control"
          : mode === "tailwind"
          ? "appearance-none block w-full bg-gray-200 text-gray-700 border border-gray-200 rounded py-3 px-4"
          : "";
      content = `<label>${f.label}</label><textarea name="${f.id}" rows="4" class="${el}" ${required}></textarea>`;
    } else if (f.type === "checkbox") {
      content = `<div class="${
        mode === "css" ? "checkbox-wrap" : ""
      }"><input type="checkbox" name="${
        f.id
      }"> <label style="display:inline;">${f.label}</label></div>`;
    } else if (f.type === "rating") {
      const scale = ["1", "2", "3", "4", "5", "N/A"];
      let btns = `<div class="rating-group" style="display:flex;gap:5px;">`;
      scale.forEach(
        (v) =>
          (btns += `<label style="flex:1;"><input type="radio" name="${f.id}" value="${v}"><div class="rating-item" style="border:1px solid #ccc;text-align:center;padding:5px;cursor:pointer;">${v}</div></label>`)
      );
      btns += `</div>`;
      content = `<label>${f.label}</label>${btns}`;
    } else {
      // Text Inputs
      const el =
        mode === "bootstrap"
          ? "form-control"
          : mode === "tailwind"
          ? "appearance-none block w-full bg-gray-200 text-gray-700 border border-gray-200 rounded py-3 px-4"
          : "";
      content = `<label>${f.label}</label><input type="${type}" name="${f.id}" class="${el}" ${required}>`;
    }

    // Wrapper
    let wrapClass = "";
    if (mode === "css") wrapClass = `form-group w-${f.width}`;
    else if (mode === "bootstrap")
      wrapClass = `col-md-${
        f.width === "100" ? "12" : f.width === "50" ? "6" : "4"
      }`;
    else if (mode === "tailwind")
      wrapClass =
        f.width === "100"
          ? "w-full px-3 mb-6"
          : f.width === "50"
          ? "w-1/2 px-3 mb-6"
          : "w-1/3 px-3 mb-6";

    html += `<div class="${wrapClass}">${content}</div>\n`;
  });

  html +=
    '<button type="submit" class="btn-submit">Submit Form</button>\n</form>';

  // GOOGLE SHEETS SCRIPT APPEND
  if (mode === "sheets") {
    html += `
<script>
    const form = document.forms['google-sheet-form'];
    form.addEventListener('submit', e => {
        e.preventDefault();
        fetch('${actionUrl}', { method: 'POST', body: new FormData(form)})
        .then(response => alert("Thank you! Form sent."))
        .catch(error => console.error('Error!', error.message));
    });
</script>
<!-- NOTE: Replace 'FORM ACTION' with your Google Apps Script Web App URL -->
        `;
  }

  if (mode === "css") html = css + html;
  renderContainer.innerHTML = html;
  finalCode.value = html;
}

// --- GLOBAL ACTIONS ---
window.updateLabel = (idx, val) => {
  window.fieldsData[idx].label = val;
  saveHistory();
  render();
};
window.updateWidth = (idx, val) => {
  window.fieldsData[idx].width = val;
  saveHistory();
  initSidebar();
  render();
};
// Nueva: Update genérico
window.updateField = (idx, key, val) => {
  window.fieldsData[idx][key] = val;
  saveHistory();
  render();
};

window.updateOptions = (idx, val) => {
  window.fieldsData[idx].options = val.split(",").map((s) => s.trim());
  saveHistory();
  render();
};

window.duplicateField = (idx) => {
  // Clonar objeto para romper referencia
  const clone = JSON.parse(JSON.stringify(window.fieldsData[idx]));
  clone.id = clone.id + "_copy";
  clone.label += " (Copy)";
  window.fieldsData.splice(idx + 1, 0, clone);
  saveHistory();
  initSidebar();
  render();
};

window.deleteField = (idx) => {
  window.fieldsData.splice(idx, 1);
  saveHistory();
  initSidebar();
  render();
};

window.addField = (type) => {
  const newField = {
    id: `new_${Date.now()}`,
    label: "New Field",
    type: type,
    width: "100",
    options: [],
  };
  if (type === "header") {
    newField.label = "SECTION TITLE";
  }
  if (type === "select") {
    newField.label = "Dropdown";
    newField.options = ["Opt 1", "Opt 2"];
  }
  window.fieldsData.unshift(newField);
  saveHistory();
  initSidebar();
  render();
  document.getElementById("fieldsList").scrollTop = 0;
};

// Device View Toggle
window.setDevice = (device) => {
  const container = document.getElementById("render-container");
  const btns = document.querySelectorAll(".device-btn");
  btns.forEach((b) => b.classList.remove("active"));

  if (device === "mobile") {
    container.classList.add("mobile-view");
    btns[1].classList.add("active");
  } else {
    container.classList.remove("mobile-view");
    btns[0].classList.add("active");
  }
};

window.saveConfig = function () {
  const blob = new Blob([JSON.stringify(window.fieldsData, null, 2)], {
    type: "application/json",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "form_config.json";
  a.click();
};

window.triggerLoad = () => document.getElementById("configLoader").click();
window.loadConfig = (input) => {
  const file = input.files[0];
  const reader = new FileReader();
  reader.onload = (e) => {
    window.fieldsData = JSON.parse(e.target.result);
    saveHistory();
    initSidebar();
    render();
  };
  reader.readAsText(file);
};

window.showCode = () => (codeModal.style.display = "flex");
window.closeModal = () => (codeModal.style.display = "none");
