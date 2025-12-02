import fitz  # PyMuPDF

def parse_pdf_to_data(pdf_path):
    """
    Parsea el PDF con diagnósticos para encontrar opciones ocultas.
    """
    doc = fitz.open(pdf_path)
    form_data = []
    
    print(f"--- INICIANDO ANÁLISIS DEL PDF: {pdf_path} ---") # DEBUG
    
    for page_num, page in enumerate(doc):
        page_width = page.rect.width
        widgets = list(page.widgets())
        widgets.sort(key=lambda w: (w.rect.y0, w.rect.x0))
        
        for widget in widgets:
            if not widget.field_name: continue
            
            # Cálculo de ancho
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
            
            # A. Checkbox
            if widget.field_type == fitz.PDF_WIDGET_TYPE_CHECKBOX:
                field_info["type"] = "checkbox"
            
            # B. Dropdowns (Select) - AQUÍ ESTÁ EL CAMBIO IMPORTANTE
            elif widget.field_type in (fitz.PDF_WIDGET_TYPE_COMBOBOX, fitz.PDF_WIDGET_TYPE_LISTBOX):
                field_info["type"] = "select"
                
                # DEBUG: Imprimir qué ve Python realmente en este campo
                raw_options = widget.choice_values
                # print(f"DEBUG: Campo '{widget.field_name}' tiene opciones raw: {raw_options}") 
                
                if raw_options:
                    clean_options = []
                    for val in raw_options:
                        final_val = ""
                        
                        # Caso 1: Es una lista/tupla (Ej: ['export', 'display'])
                        if isinstance(val, (list, tuple)):
                            # Intentamos agarrar el segundo valor (display), si no hay, el primero
                            if len(val) > 1:
                                final_val = str(val[1])
                            elif len(val) > 0:
                                final_val = str(val[0])
                        
                        # Caso 2: Es un string simple
                        else:
                            final_val = str(val)
                        
                        # Limpieza final
                        final_val = final_val.strip()
                        if final_val:
                            clean_options.append(final_val)
                    
                    field_info["options"] = clean_options
                else:
                    # Si Python dice que no hay opciones, agregamos una de prueba para verificar
                    # print(f"ALERTA: El campo {widget.field_name} es SELECT pero no tiene opciones detectables.")
                    pass

            # C. Textarea
            else:
                if widget.field_flags & 4096:
                    field_info["type"] = "textarea"
            
            form_data.append(field_info)
            
    print("--- ANÁLISIS FINALIZADO ---")
    return form_data