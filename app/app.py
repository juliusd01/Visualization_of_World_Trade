from flask import Flask, render_template, jsonify
import pandas as pd
import os
import logging

app = Flask(__name__)
logging.basicConfig(level=logging.DEBUG)

# Global variables for data
country_codes = None

# Load and process data
def load_data():
    try:
        global country_codes
        
        # Check if data files exist
        required_files = [
            'data/country_codes_V202501.csv',
            'data/top_exports_by_country_aggregated.csv',
            'data/top_imports_by_country_aggregated.csv',
            'data/trade_volume_by_country.csv'
        ]
        
        for file_path in required_files:
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"Required file not found: {file_path}")
            
        app.logger.info("Loading country codes...")
        # Load country codes
        country_codes = pd.read_csv('data/country_codes_V202501.csv')
        app.logger.info(f"Loaded {len(country_codes)} country codes")
        
        return True
        
    except Exception as e:
        app.logger.error(f"Error loading data: {str(e)}")
        raise

# Load data at startup
try:
    load_data()
    app.logger.info("Data loaded successfully")
except Exception as e:
    app.logger.error(f"Failed to load data: {str(e)}")
    raise

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/countries')
def get_countries():
    try:
        # Filter out any special entries (like regions or historical entities)
        valid_countries = country_codes[
            ~country_codes['country_name'].str.contains(r'\(...\d{4}\)|\bnes\b', regex=True, na=False)
        ].copy()  # Create a copy to avoid SettingWithCopyWarning
        
        # Convert country codes to strings to ensure consistent type
        valid_countries['country_code'] = valid_countries['country_code'].astype(str)
        
        # Sort by country name
        valid_countries = valid_countries.sort_values('country_name')
        
        # Convert to list of dictionaries
        countries_list = valid_countries[['country_code', 'country_name']].to_dict('records')
        
        app.logger.info(f"Returning {len(countries_list)} valid countries")
        app.logger.debug(f"Sample countries: {countries_list[:5]}")
        
        return jsonify(countries_list)
    except Exception as e:
        app.logger.error(f"Error getting countries: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/trade/<country_code>')
def get_trade_data(country_code):
    try:
        app.logger.info(f"Getting trade data for country {country_code}")
        
        # Read the trade volume data
        df = pd.read_csv('data/trade_volume_by_country.csv')
        
        # Convert country_code to integer for comparison
        country_code_int = int(country_code)
        
        # Create a dictionary of country codes to names for quick lookup
        country_dict = dict(zip(country_codes['country_code'].astype(str), country_codes['country_name']))
        
        # Get exports (where the country is the exporter)
        exports_df = df[df['Exporter'] == country_code_int]
        top_exports = exports_df.nlargest(5, 'Trade Volume')
        export_data = []
        for _, row in top_exports.iterrows():
            partner_name = country_dict.get(str(int(row['Importer'])), f"Country {int(row['Importer'])}")
            export_data.append({
                'country_code': str(int(row['Importer'])),
                'country_name': partner_name,
                'value': float(row['Trade Volume'])
            })
        
        # Get imports (where the country is the importer)
        imports_df = df[df['Importer'] == country_code_int]
        top_imports = imports_df.nlargest(5, 'Trade Volume')
        import_data = []
        for _, row in top_imports.iterrows():
            partner_name = country_dict.get(str(int(row['Exporter'])), f"Country {int(row['Exporter'])}")
            import_data.append({
                'country_code': str(int(row['Exporter'])),
                'country_name': partner_name,
                'value': float(row['Trade Volume'])
            })
        
        app.logger.info(f"Found {len(export_data)} exports and {len(import_data)} imports")
        
        return jsonify({
            'exports': export_data,
            'imports': import_data
        })
    except Exception as e:
        app.logger.error(f"Error in get_trade_data: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/products/<country_code>')
def get_product_data(country_code):
    try:
        # Read the aggregated product data files
        exports_df = pd.read_csv('data/top_exports_by_country_aggregated.csv')
        imports_df = pd.read_csv('data/top_imports_by_country_aggregated.csv')
        
        # Get top 10 exports for the country
        country_exports = exports_df[exports_df['Exporter'] == int(country_code)]
        top_exports = country_exports.nlargest(10, 'Export Value')
        export_data = []
        for _, row in top_exports.iterrows():
            export_data.append({
                'product_name': row['Category'],
                'value': float(row['Export Value'])
            })
            
        # Get top 10 imports for the country
        country_imports = imports_df[imports_df['Importer'] == int(country_code)]
        top_imports = country_imports.nlargest(10, 'Import Value')
        import_data = []
        for _, row in top_imports.iterrows():
            import_data.append({
                'product_name': row['Category'],
                'value': float(row['Import Value'])
            })
        
        return jsonify({
            'exports': export_data,
            'imports': import_data
        })
    except Exception as e:
        app.logger.error(f"Error in get_product_data: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True) 