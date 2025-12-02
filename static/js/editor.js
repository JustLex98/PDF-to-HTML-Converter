/* static/js/editor.js */

const fieldsList = document.getElementById('fieldsList');
const renderContainer = document.getElementById('render-container');
const finalCode = document.getElementById('finalCode');
const frameworkSelect = document.getElementById('frameworkSelect');
const codeModal = document.getElementById('codeModal');

function initSidebar() {
    fieldsList.innerHTML = '';
    
    window.fieldsData.forEach((field, index) => {
        const card = document.createElement('div');
        card.className = 'field-card';
        card.dataset.index = index;

        const w33 = field.width === '33' ? 'active' : '';
        const w50 = field.width === '50' ? 'active' : '';
        const w100 = field.width === '100' ? 'active' : '';

        let optionsEditor = '';
        if (field.type === 'select') {
            const optsString = field.options ? field.options.join(', ') : '';
            
            optionsEditor = `
                <div style="margin-top:8px;">
                    <label style="font-size:10px; font-weight:bold; color:#adb5bd; display:block; margin-bottom:3px;">
                        OPTIONS (Comma separated):
                    </label>
                    <textarea class="field-input" style="height:60px; font-family:sans-serif; font-size:12px;"
                              placeholder="Option 1, Option 2, Option 3"
                              onchange="updateOptions(${index}, this.value)">${optsString}</textarea>
                </div>
            `;
        }

        card.innerHTML = `
            <div class="card-header-row">
                <i class="fas fa-grip-vertical drag-handle"></i>
                <span class="field-id" title="${field.id}">
                    ${field.id.length > 20 ? field.id.substring(0, 20) + '...' : field.id}
                </span>
                <i class="fas fa-trash-alt btn-delete" onclick="deleteField(${index})" title="Delete Field"></i>
            </div>
            
            <input type="text" class="field-input" value="${field.label}" 
                   oninput="updateLabel(${index}, this.value)" placeholder="Field Label">
            
            <div class="width-controls">
                <button class="width-btn ${w33}" onclick="updateWidth(${index}, '33')">⅓</button>
                <button class="width-btn ${w50}" onclick="updateWidth(${index}, '50')">½</button>
                <button class="width-btn ${w100}" onclick="updateWidth(${index}, '100')">Full</button>
            </div>

            ${optionsEditor}
        `;
        fieldsList.appendChild(card);
    });

    new Sortable(fieldsList, {
        handle: '.drag-handle',
        animation: 150,
        ghostClass: 'sortable-ghost',
        onEnd: function (evt) {
            const item = window.fieldsData.splice(evt.oldIndex, 1)[0];
            window.fieldsData.splice(evt.newIndex, 0, item);
            
            initSidebar();
            render();
        }
    });
}

function render() {
    const mode = frameworkSelect.value;
    let html = '';
    let css = '';

    if (mode === 'css') {
        css = `
<style>
    .pdf-form { display: flex; flex-wrap: wrap; gap: 20px; max-width: 800px; margin: 0 auto; font-family: sans-serif; }
    .form-item { box-sizing: border-box; }
    .w-100 { width: 100%; }
    .w-50 { width: calc(50% - 10px); }
    .w-33 { width: calc(33.33% - 14px); }
    label { display: block; margin-bottom: 5px; font-weight: 600; color: #333; }
    input, select, textarea { width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; background: #fff; }
    button { background: #228be6; color: white; border: none; padding: 12px; border-radius: 4px; width: 100%; cursor: pointer; font-size: 16px; margin-top: 20px; }
    .checkbox-wrap { display: flex; align-items: center; gap: 10px; padding-top: 25px; }
    .checkbox-wrap input { width: auto; }
    @media(max-width:600px){ .w-50, .w-33 { width: 100%; } }
</style>
<form action="#" method="POST" class="pdf-form">\n`;
    } else if (mode === 'bootstrap') {
        html += `<!-- Requires Bootstrap 5 CSS -->\n<form action="#" method="POST" class="row g-3">\n`;
    } else if (mode === 'tailwind') {
         html += `<!-- Requires Tailwind CSS -->\n<form action="#" method="POST" class="flex flex-wrap -mx-3">\n`;
    }

    window.fieldsData.forEach(f => {
        let input = '';
        let wrapperStart = '';
        let wrapperEnd = '</div>\n';

        if (mode === 'css') {
            let cls = `form-item w-${f.width}`;
            if(f.type === 'checkbox') cls += ' checkbox-wrap';
            wrapperStart = `  <div class="${cls}">\n`;
            
            if(f.type === 'select') input = `<select name="${f.id}">${genOpts(f.options)}</select>`;
            else if(f.type === 'textarea') input = `<textarea name="${f.id}" rows="3"></textarea>`;
            else if(f.type === 'checkbox') input = `<input type="checkbox" name="${f.id}">`;
            else input = `<input type="text" name="${f.id}">`;

            if(f.type === 'checkbox') html += wrapperStart + `    ${input}\n    <label>${f.label}</label>\n` + wrapperEnd;
            else html += wrapperStart + `    <label>${f.label}</label>\n    ${input}\n` + wrapperEnd;
        }
        else if (mode === 'bootstrap') {
            let col = f.width === '100' ? '12' : (f.width === '50' ? '6' : '4');
            if(f.type === 'checkbox') {
                wrapperStart = `  <div class="col-md-${col} d-flex align-items-end">\n    <div class="form-check">\n`;
                input = `<input class="form-check-input" type="checkbox" name="${f.id}">\n      <label class="form-check-label">${f.label}</label>\n    </div>`;
                wrapperEnd = `  </div>\n`;
            } else {
                wrapperStart = `  <div class="col-md-${col}">\n`;
                if(f.type === 'select') input = `<select class="form-select" name="${f.id}">${genOpts(f.options)}</select>`;
                else if(f.type === 'textarea') input = `<textarea class="form-control" name="${f.id}" rows="3"></textarea>`;
                else input = `<input type="text" class="form-control" name="${f.id}">`;
            }
            if(f.type !== 'checkbox') html += wrapperStart + `    <label class="form-label">${f.label}</label>\n    ${input}\n` + wrapperEnd;
            else html += wrapperStart + input + wrapperEnd;
        }
        // --- Lógica Tailwind CSS ---
        else if (mode === 'tailwind') {
            let wClass = f.width === '100' ? 'w-full' : (f.width === '50' ? 'w-1/2' : 'w-1/3');
            let inputClass = "appearance-none block w-full bg-gray-200 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500";
            if(f.type === 'checkbox') {
                wrapperStart = `  <div class="${wClass} px-3 mb-6 flex items-center pt-6">\n`;
                input = `<label class="flex items-center space-x-3"><input type="checkbox" class="form-checkbox h-5 w-5 text-blue-600" name="${f.id}"><span class="text-gray-900 font-bold">${f.label}</span></label>`;
                html += wrapperStart + input + wrapperEnd;
            } else {
                wrapperStart = `  <div class="${wClass} px-3 mb-6">\n`;
                let label = `<label class="block uppercase tracking-wide text-gray-700 text-xs font-bold mb-2">${f.label}</label>`;
                if(f.type === 'select') input = `<div class="relative"><select class="${inputClass}" name="${f.id}">${genOpts(f.options)}</select></div>`;
                else if(f.type === 'textarea') input = `<textarea class="${inputClass}" name="${f.id}" rows="3"></textarea>`;
                else input = `<input type="text" class="${inputClass}" name="${f.id}">`;
                html += wrapperStart + `    ${label}\n    ${input}\n` + wrapperEnd;
            }
        }
    });

    if(mode === 'css') html += '  <button type="submit">Submit</button>\n</form>';
    else if(mode === 'bootstrap') html += '  <div class="col-12"><button type="submit" class="btn btn-primary w-100">Submit</button></div>\n</form>';
    else if(mode === 'tailwind') html += '  <div class="w-full px-3"><button type="submit" class="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">Submit</button></div>\n</form>';

    if(mode === 'css') html = css + html;
    
    renderContainer.innerHTML = html;
    finalCode.value = html;
}

function genOpts(opts) { 
    if(!opts) return '';
    return opts.map(o => `<option>${o}</option>`).join(''); 
}

window.updateLabel = (idx, val) => { window.fieldsData[idx].label = val; render(); };
window.updateWidth = (idx, val) => { window.fieldsData[idx].width = val; initSidebar(); render(); };

window.deleteField = (idx) => {
    if(confirm('Delete this field?')) {
        window.fieldsData.splice(idx, 1);
        initSidebar();
        render();
    }
};

window.updateOptions = (idx, val) => {
    const newOptions = val.split(',').map(s => s.trim()).filter(s => s !== '');
    window.fieldsData[idx].options = newOptions;
    render();
};

window.showCode = () => codeModal.style.display = 'flex';
window.closeModal = () => codeModal.style.display = 'none';


// ==========================================
// SISTEMA SAVE & LOAD (PERSISTENCIA)
// ==========================================

function saveConfig() {
    const dataStr = JSON.stringify(window.fieldsData, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "form_config.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function triggerLoad() {
    document.getElementById('configLoader').click();
}

function loadConfig(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const loadedData = JSON.parse(e.target.result);
            if (Array.isArray(loadedData)) {
                window.fieldsData = loadedData;
                initSidebar();
                render();
                alert('Configuration loaded successfully! ✅');
            } else {
                alert('Error: Invalid configuration file.');
            }
        } catch (error) {
            alert('Error parsing JSON: ' + error.message);
        }
        input.value = '';
    };
    reader.readAsText(file);
}

// ==========================================
// SISTEMA DE AGREGAR CAMPOS (BUILDER)
// ==========================================

function addField(type) {
    const newField = {
        id: `new_field_${Date.now()}`,
        label: "New Field",
        type: type,
        width: "100",
        options: []
    };

    if (type === 'select') {
        newField.label = "New Dropdown";
        newField.options = ["Option 1", "Option 2"];
    } else if (type === 'checkbox') {
        newField.label = "I agree to terms";
        newField.width = "100";
    } else if (type === 'textarea') {
        newField.label = "Comments";
    }

    window.fieldsData.unshift(newField); 
    
    initSidebar();
    render();
    
    document.getElementById('fieldsList').scrollTop = 0;
}

window.saveConfig = saveConfig;
window.triggerLoad = triggerLoad;
window.loadConfig = loadConfig;
window.addField = addField;