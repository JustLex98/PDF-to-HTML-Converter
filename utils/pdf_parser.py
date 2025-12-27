import fitz  # PyMuPDF
import os
import time
import json
import google.generativeai as genai
from google.api_core.exceptions import ResourceExhausted

# Configuración de la API Key (Intenta leerla de las variables de entorno)
API_KEY = os.environ.get("GOOGLE_API_KEY")
if API_KEY:
    genai.configure(api_key=API_KEY)

def call_ai_with_retry(model, prompt, max_retries=3):
    """
    Realiza una llamada a Gemini con manejo de errores de cuota (429).
    Si se agota la cuota, espera y reintenta con backoff exponencial.
    """
    wait_time = 65  # Tiempo de espera inicial en segundos
    
    for attempt in range(max_retries):
        try:
            # Intentamos generar contenido
            response = model.generate_content(prompt)
            return response.text
            
        except ResourceExhausted:
            print(f"⚠️ [ALERTA 429] Cuota excedida. Esperando {wait_time}s para reintentar... (Intento {attempt+1}/{max_retries})")
            time.sleep(wait_time)
            wait_time *= 2  # Duplicamos el tiempo de espera para la próxima (20s -> 40s -> 80s)
            
        except Exception as e:
            print(f"❌ [ERROR] Falló la llamada a la IA: {e}")
            return None

    print("❌ [ERROR CRÍTICO] Se agotaron los reintentos con la IA.")
    return None

def parse_pdf_to_data(pdf_path):
    """
    Parsea el PDF, limpia opciones basura, calcula anchos y MEJORA NOMBRES CON IA (si es posible).
    """
    doc = fitz.open(pdf_path)
    form_data = []
    full_text = "" # Para acumular texto y enviarlo a la IA
    
    JUNK_OPTS = [
        "select performance rating", "select response", "choose response",
        "select action", "no experience", "n/a", ""
    ]
    
    # 1. Primera pasada: Extraer Widgets y Texto para contexto
    all_widgets = []
    for page in doc:
        full_text += page.get_text()[:1000] + "\n" # Limitamos texto por página para ahorrar tokens
        
        page_width = page.rect.width
        widgets = list(page.widgets())
        widgets.sort(key=lambda w: (w.rect.y0, w.rect.x0)) # Ordenar visualmente
        
        for widget in widgets:
            if not widget.field_name: continue
            
            # Cálculo de ancho relativo
            width_ratio = widget.rect.width / page_width
            suggested_width = "100"
            if width_ratio < 0.35: suggested_width = "33"
            elif width_ratio < 0.6: suggested_width = "50"
            
            # Info base
            field_info = {
                "id": widget.field_name,
                "label": widget.field_name.replace("_", " ").capitalize(), # Label temporal
                "type": "text",
                "options": [],
                "width": suggested_width
            }
            
            # Lógica de tipos
            if widget.field_type == fitz.PDF_WIDGET_TYPE_CHECKBOX:
                field_info["type"] = "checkbox"
            elif widget.field_type in (fitz.PDF_WIDGET_TYPE_COMBOBOX, fitz.PDF_WIDGET_TYPE_LISTBOX):
                field_info["type"] = "select"
                raw_options = widget.choice_values
                if raw_options:
                    clean_options = []
                    for val in raw_options:
                        final_val = val[1] if isinstance(val, (list, tuple)) and len(val)>1 else str(val[0] if isinstance(val, (list, tuple)) else val)
                        final_val = final_val.strip()
                        if final_val.lower() not in JUNK_OPTS and not final_val.lower().startswith(("select ", "choose ")):
                            if final_val: clean_options.append(final_val)
                    field_info["options"] = clean_options
            else:
                if widget.field_flags & 4096:
                    field_info["type"] = "textarea"
            
            all_widgets.append(field_info)

    # 2. SEGUNDA PASADA: MEJORA CON IA (Solo si hay API KEY)
    if API_KEY:
        try:
            print("🤖 [INFO] Intentando mejorar nombres con IA...")
            model = genai.GenerativeModel("gemini-2.0-flash")
            
            # Prompt optimizado para JSON
            prompt = f"""
            Analiza este texto extraído de un formulario PDF:
            ---
            {full_text[:1500]}  
            ---
            Tengo estos IDs de campos técnicos: {[w['id'] for w in all_widgets]}
            
            Tu tarea es generar un JSON simple donde la CLAVE es el ID técnico y el VALOR es una etiqueta (Label) humana, limpia y bonita en Inglés.
            Ejemplo: {{"Text1": "First Name", "Check_Box_3": "Subscribe"}}
            Devuelve SOLO el JSON válido, sin markdown.
            """
            
            # LLAMADA SEGURA CON RETRY
            ai_response = call_ai_with_retry(model, prompt)
            
            if ai_response:
                # Limpiar respuesta para obtener JSON puro
                clean_json = ai_response.replace("```json", "").replace("```", "").strip()
                name_mapping = json.loads(clean_json)
                
                # Aplicar los nombres bonitos
                for widget in all_widgets:
                    if widget['id'] in name_mapping:
                        widget['label'] = name_mapping[widget['id']]
                print("✅ [EXITO] Nombres mejorados con IA.")
            else:
                print("⚠️ [WARN] La IA no respondió, usando nombres originales.")
                
        except Exception as e:
            print(f"❌ [ERROR] Falló el proceso de IA (pero el PDF se procesó): {e}")

    return all_widgets