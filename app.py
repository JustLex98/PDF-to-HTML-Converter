import os
import json
from flask import Flask, render_template, request
from utils.pdf_parser import parse_pdf_to_data

app = Flask(__name__)

# Config
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
                # Extract data from PDF
                fields_data = parse_pdf_to_data(filepath)
                
                # Convert to JSON string for the frontend
                return render_template('result.html', fields_json=json.dumps(fields_data))
            except Exception as e:
                return f"Error processing PDF: {e}"

    return render_template('index.html')

if __name__ == '__main__':
    app.run(debug=True)