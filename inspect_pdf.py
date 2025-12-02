import fitz  # PyMuPDF
import os

# Busca el PDF automáticamente en la carpeta uploads
upload_folder = 'static/uploads'
files = [f for f in os.listdir(upload_folder) if f.endswith('.pdf')]

if not files:
    print("Error: No hay PDF en static/uploads. Sube uno primero en la web.")
else:
    # Usamos el último PDF subido
    pdf_path = os.path.join(upload_folder, files[0])
    print(f"\n🔍 INSPECCIONANDO: {files[0]}")
    print("-" * 50)

    doc = fitz.open(pdf_path)
    
    count = 0
    for page in doc:
        for widget in page.widgets():
            # Solo nos interesan los Dropdowns (Combobox)
            if widget.field_type == fitz.PDF_WIDGET_TYPE_COMBOBOX:
                count += 1
                print(f"\n[Campo #{count}]")
                print(f"Nombre: {widget.field_name}")
                print(f"Valor Actual: {widget.field_value}")
                print(f"Opciones Detectadas (Raw): {widget.choice_values}")
                
                if widget.choice_values is None:
                    print("⚠️  ESTADO: Las opciones son NULL (Invisibles para Python)")
                else:
                    print("✅ ESTADO: Opciones encontradas")

    if count == 0:
        print("\nNo se encontraron campos desplegables (Combobox).")