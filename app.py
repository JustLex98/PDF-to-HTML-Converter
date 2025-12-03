import os
import json
import fitz  # PyMuPDF
from flask import Flask, render_template, request, jsonify
from utils.pdf_parser import parse_pdf_to_data
# Importamos el servicio de IA (Asegúrate de haber creado utils/ai_service.py)
from utils.ai_service import suggest_field_names 

app = Flask(__name__)

# Configuración
UPLOAD_FOLDER = 'static/uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route('/', methods=['GET', 'POST'])
def index():
    if request.method == 'POST':
        if 'pdf_file' not in request.files:
            return "No file part"
        
        file = request.files['pdf_file']
        
        if file.filename == '':
            return "No selected file"

        if file:
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], file.filename)
            file.save(filepath)
            
            try:
                # 1. Extraer datos del PDF
                fields_data = parse_pdf_to_data(filepath)
                
                # 2. Renderizar resultado pasando datos Y el nombre del archivo
                return render_template('result.html', 
                                       fields_json=json.dumps(fields_data),
                                       filename=file.filename) # <--- IMPORTANTE: Pasamos el nombre
            except Exception as e:
                return f"Error processing PDF: {e}"

    return render_template('index.html')

# --- NUEVA RUTA PARA LA IA ---
@app.route('/api/ai-rename', methods=['POST'])
def ai_rename():
    try:
        data = request.json
        filename = data.get('filename')
        current_fields = data.get('fields')
        
        if not filename or not current_fields:
            return jsonify({"error": "Faltan datos"}), 400
        
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        
        # 1. Extraer texto completo del PDF para dar contexto a la IA
        doc = fitz.open(filepath)
        full_text = ""
        for page in doc:
            full_text += page.get_text()
        
        # 2. Llamar a Gemini (utils/ai_service.py)
        suggestions = suggest_field_names(full_text, current_fields)
        
        # 3. Devolver sugerencias
        return jsonify({"suggestions": suggestions})
        
    except Exception as e:
        print(f"Error en endpoint IA: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)