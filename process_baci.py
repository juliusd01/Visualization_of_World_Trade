import pandas as pd
import os

def process_baci_data(input_file, output_file):
    print("Reading BACI data...")
    # Read the BACI file
    df = pd.read_csv(input_file)
    
    print("Processing data...")
    # Group by exporter (i) and importer (j) to get total trade value
    trade_agg = df.groupby(['i', 'j'])['v'].sum().reset_index()
    
    # Create empty lists to store top 5 records
    top_records = []
    
    # Get unique countries
    countries = pd.concat([trade_agg['i'], trade_agg['j']]).unique()
    
    print(f"Processing {len(countries)} countries...")
    # For each country, get top 5 exports and imports
    for country in countries:
        # Get top 5 export destinations
        top_exports = trade_agg[trade_agg['i'] == country].nlargest(5, 'v')
        top_records.extend(top_exports.to_dict('records'))
        
        # Get top 5 import sources
        top_imports = trade_agg[trade_agg['j'] == country].nlargest(5, 'v')
        top_records.extend(top_imports.to_dict('records'))
    
    # Convert to DataFrame and save
    result_df = pd.DataFrame(top_records)
    result_df.to_csv(output_file, index=False)
    print(f"Saved top 5 trading partners to {output_file}")
    print(f"Original file size: {os.path.getsize(input_file) / (1024*1024):.2f} MB")
    print(f"New file size: {os.path.getsize(output_file) / (1024*1024):.2f} MB")

if __name__ == "__main__":
    input_file = "/home/juliusd/documents/Deep_Learning/shi/BACI_HS22_Y2023_V202501.csv"
    output_file = "data/top_5.csv"
    
    # Create data directory if it doesn't exist
    os.makedirs("data", exist_ok=True)
    
    process_baci_data(input_file, output_file) 