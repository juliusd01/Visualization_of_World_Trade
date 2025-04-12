import pandas as pd
import os

def filter_baci_data(input_file, output_file):
    print(f"Reading BACI data from {input_file}...")
    # Read the CSV file
    df = pd.read_csv(input_file)
    
    print("Processing exports...")
    # Get top 5 exports for each country (i is exporter)
    top_exports = df.groupby('i').apply(
        lambda x: x.nlargest(5, 'v')
    ).reset_index(drop=True)
    
    print("Processing imports...")
    # Get top 5 imports for each country (j is importer)
    top_imports = df.groupby('j').apply(
        lambda x: x.nlargest(5, 'v')
    ).reset_index(drop=True)
    
    print("Combining and removing duplicates...")
    # Combine exports and imports and remove duplicates
    filtered_df = pd.concat([top_exports, top_imports]).drop_duplicates()
    
    print(f"Writing filtered data to {output_file}...")
    # Save the filtered data
    filtered_df.to_csv(output_file, index=False)
    
    original_size = os.path.getsize(input_file) / (1024 * 1024)  # Size in MB
    filtered_size = os.path.getsize(output_file) / (1024 * 1024)  # Size in MB
    
    print(f"\nOriginal file size: {original_size:.2f} MB")
    print(f"Filtered file size: {filtered_size:.2f} MB")
    print(f"Size reduction: {((original_size - filtered_size) / original_size * 100):.2f}%")

if __name__ == "__main__":
    input_file = "data/BACI_HS22_Y2023_V202501.csv"
    output_file = "data/BACI_HS22_Y2023_V202501_filtered.csv"
    
    filter_baci_data(input_file, output_file) 