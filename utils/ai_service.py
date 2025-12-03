import google.generativeai as genai
import json
import os
from dotenv import load_dotenv

load_dotenv

# --- TU API KEY AQUÍ ---
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") 

if not GEMINI_API_KEY:
    print("❌ ERROR: No se encontró la GEMINI_API_KEY en el archivo .env")
else:
    genai.configure(api_key=GEMINI_API_KEY)

def suggest_field_names(pdf_text, current_fields):
    """
    Envía el texto del PDF y los campos actuales a Gemini.
    Incluye logs de depuración para ver qué pasa.
    """
    
    print("\n--- [DEBUG] INICIANDO IA ---")
    
    # 1. Verificar si hay texto
    if not pdf_text or len(pdf_text.strip()) < 10:
        print("❌ [ERROR] El PDF parece no tener texto legible (es una imagen/escaneo).")
        return {}

    print(f"✅ [DEBUG] Texto extraído del PDF: {len(pdf_text)} caracteres.")
    print(f"📜 [DEBUG] Muestra del texto: {pdf_text[:200]}...") # Muestra los primeros 200 caracteres

    model = genai.GenerativeModel('models/gemini-2.0-flash')
    
    # Prompt ajustado para ser más estricto
    prompt = f"""
    You are a PDF Form Data Extractor.
    
    CONTEXT (PDF CONTENT):
    ---------------------
    {pdf_text[:15000]}
    ---------------------
    
    DETECTED FIELD IDs (Technical Names):
    {json.dumps([f['id'] for f in current_fields])}
    
    TASK:
    Map the technical "Field IDs" to human-readable "Labels" based on the PDF context.
    - Example: If ID is "Text1" and text nearby says "Full Name", rename to "Full Name".
    - Example: If ID is "Signature22", rename to "Supervisor Signature".
    - Ignore fields you cannot identify clearly.
    
    OUTPUT FORMAT:
    Return ONLY a raw JSON object. Do not use Markdown. Do not say "Here is the JSON".
    Syntax: {{"OLD_ID": "NEW_READABLE_LABEL", ...}}
    """
    
    try:
        response = model.generate_content(prompt)
        raw_text = response.text
        
        print(f"\n🤖 [DEBUG] Respuesta cruda de Gemini:\n{raw_text}\n")

        # 2. Limpieza robusta del JSON
        # Buscamos donde empieza '{' y donde termina '}'
        start_idx = raw_text.find('{')
        end_idx = raw_text.rfind('}') + 1
        
        if start_idx == -1 or end_idx == 0:
            print("❌ [ERROR] No se encontró un objeto JSON en la respuesta.")
            return {}
            
        json_str = raw_text[start_idx:end_idx]
        
        suggestions = json.loads(json_str)
        print(f"✅ [ÉXITO] Se generaron {len(suggestions)} sugerencias.")
        return suggestions
    
    except Exception as e:
        print(f"❌ [ERROR CRÍTICO] Falló la conexión o el parsing: {e}")
        return {}