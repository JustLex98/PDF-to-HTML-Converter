import fitz  # PyMuPDF

def parse_pdf_to_data(pdf_path):
    """
    Parsea el PDF, limpia opciones basura y calcula anchos.
    """
    doc = fitz.open(pdf_path)
    form_data = []
    
    JUNK_OPTS = [
        "select performance rating",
        "select response",
        "choose response",
        "select action",
        "no experience",
        "n/a",
        ""
    ]
    
    for page in doc:
        page_width = page.rect.width
        widgets = list(page.widgets())
        
        # Ordenar: Arriba->Abajo, Izq->Der
        widgets.sort(key=lambda w: (w.rect.y0, w.rect.x0))
        
        for widget in widgets:
            if not widget.field_name: 
                continue
            
            # --- Cálculo de Ancho ---
            width_ratio = widget.rect.width / page_width
            suggested_width = "100"
            if width_ratio < 0.35: suggested_width = "33"
            elif width_ratio < 0.6: suggested_width = "50"
            
            field_info = {
                "id": widget.field_name,
                "label": widget.field_name.replace("_", " ").capitalize(),
                "type": "text",
                "options": [],
                "width": suggested_width
            }
            
            # --- Detección de Tipo ---
            if widget.field_type == fitz.PDF_WIDGET_TYPE_CHECKBOX:
                field_info["type"] = "checkbox"
            
            elif widget.field_type in (fitz.PDF_WIDGET_TYPE_COMBOBOX, fitz.PDF_WIDGET_TYPE_LISTBOX):
                field_info["type"] = "select" # Por defecto select, tú lo cambias a Radio en el editor si quieres
                
                # --- LIMPIEZA INTELIGENTE DE OPCIONES ---
                raw_options = widget.choice_values
                if raw_options:
                    clean_options = []
                    for val in raw_options:
                        final_val = ""
                        
                        # Manejo de tuplas (['valor', 'display'])
                        if isinstance(val, (list, tuple)):
                            if len(val) > 1: final_val = str(val[1])
                            elif len(val) > 0: final_val = str(val[0])
                        else:
                            final_val = str(val)
                        
                        final_val = final_val.strip()
                        
                        # === FILTRO: Si está en la lista negra, LO SALTAMOS ===
                        if final_val.lower() in JUNK_OPTS:
                            continue
                        
                        # Filtro extra: Si empieza con "Select " o "Choose "
                        if final_val.lower().startswith("select ") or final_val.lower().startswith("choose "):
                            continue

                        if final_val:
                            clean_options.append(final_val)
                    
                    field_info["options"] = clean_options

            else:
                if widget.field_flags & 4096:
                    field_info["type"] = "textarea"
            
            form_data.append(field_info)
            
    return form_data