# Function to decode HS codes into product names
def decode_hs_code(hs_code):
    # Basic HS code categories (2-digit level)
    hs_categories = {
        '01': 'Live animals',
        '02': 'Meat and edible meat offal',
        '03': 'Fish and crustaceans',
        '04': 'Dairy produce',
        '05': 'Products of animal origin',
        '06': 'Live trees and plants',
        '07': 'Edible vegetables',
        '08': 'Edible fruit and nuts',
        '09': 'Coffee, tea, and spices',
        '10': 'Cereals',
        '11': 'Milling products',
        '12': 'Oil seeds',
        '13': 'Lac, gums, resins',
        '14': 'Vegetable plaiting materials',
        '15': 'Animal or vegetable fats',
        '16': 'Preparations of meat or fish',
        '17': 'Sugars and sugar confectionery',
        '18': 'Cocoa and cocoa preparations',
        '19': 'Preparations of cereals',
        '20': 'Preparations of vegetables, fruit, nuts',
        '21': 'Miscellaneous edible preparations',
        '22': 'Beverages, spirits and vinegar',
        '23': 'Residues and waste from food industries',
        '24': 'Tobacco and manufactured tobacco substitutes',
        '25': 'Salt, sulfur, earths and stone',
        '26': 'Ores, slag and ash',
        '27': 'Mineral fuels, oils',
        '28': 'Inorganic chemicals',
        '29': 'Organic chemicals',
        '30': 'Pharmaceutical products',
        '31': 'Fertilizers',
        '32': 'Tanning or dyeing extracts',
        '33': 'Essential oils and resinoids',
        '34': 'Soap, organic surface-active agents',
        '35': 'Albuminoidal substances',
        '36': 'Explosives',
        '37': 'Photographic or cinematographic goods',
        '38': 'Miscellaneous chemical products',
        '39': 'Plastics and articles thereof',
        '40': 'Rubber and articles thereof',
        '41': 'Raw hides and skins',
        '42': 'Articles of leather',
        '43': 'Furskins and artificial fur',
        '44': 'Wood and articles of wood',
        '45': 'Cork and articles of cork',
        '46': 'Manufactures of straw',
        '47': 'Pulp of wood',
        '48': 'Paper and paperboard',
        '49': 'Printed books, newspapers',
        '50': 'Silk',
        '51': 'Wool, fine or coarse animal hair',
        '52': 'Cotton',
        '53': 'Other vegetable textile fibers',
        '54': 'Man-made filaments',
        '55': 'Man-made staple fibers',
        '56': 'Wadding, felt and nonwovens',
        '57': 'Carpets and other textile floor coverings',
        '58': 'Special woven fabrics',
        '59': 'Impregnated, coated, covered or laminated textile fabrics',
        '60': 'Knitted or crocheted fabrics',
        '61': 'Articles of apparel and clothing accessories, knitted or crocheted',
        '62': 'Articles of apparel and clothing accessories, not knitted or crocheted',
        '63': 'Other made up textile articles',
        '64': 'Footwear, gaiters and the like',
        '65': 'Headgear and parts thereof',
        '66': 'Umbrellas, sun umbrellas',
        '67': 'Prepared feathers and down',
        '68': 'Articles of stone, plaster, cement',
        '69': 'Ceramic products',
        '70': 'Glass and glassware',
        '71': 'Natural or cultured pearls',
        '72': 'Iron and steel',
        '73': 'Articles of iron or steel',
        '74': 'Copper and articles thereof',
        '75': 'Nickel and articles thereof',
        '76': 'Aluminum and articles thereof',
        '78': 'Lead and articles thereof',
        '79': 'Zinc and articles thereof',
        '80': 'Tin and articles thereof',
        '81': 'Other base metals',
        '82': 'Tools, implements, cutlery',
        '83': 'Miscellaneous articles of base metal',
        '84': 'Nuclear reactors, boilers, machinery',
        '85': 'Electrical machinery and equipment',
        '86': 'Railway or tramway locomotives',
        '87': 'Vehicles other than railway or tramway rolling stock',
        '88': 'Aircraft, spacecraft',
        '89': 'Ships, boats and floating structures',
        '90': 'Optical, photographic, cinematographic',
        '91': 'Clocks and watches',
        '92': 'Musical instruments',
        '93': 'Arms and ammunition',
        '94': 'Furniture',
        '95': 'Toys, games and sports requisites',
        '96': 'Miscellaneous manufactured articles',
        '97': 'Works of art',
        '98': 'Special classification provisions',
        '99': 'Services'
    }
    
    # Get the 2-digit category code
    category_code = str(hs_code)[:2]
    return hs_categories.get(category_code, 'Unknown product')

@app.route('/api/trade/<country_code>')
def get_trade_data(country_code):
    try:
        # Read the filtered BACI data
        df = pd.read_csv('data/BACI_HS22_Y2023_V202501_filtered.csv')
        
        # Filter for the selected country
        country_df = df[df['i'] == int(country_code)]
        
        # Get top 5 export partners
        exports = country_df.groupby('j')['v'].sum().nlargest(5)
        export_data = []
        for partner_code, value in exports.items():
            partner_name = country_names.get(str(partner_code), 'Unknown')
            # Get the main product exported to this partner
            main_product = country_df[country_df['j'] == partner_code].groupby('k')['v'].sum().idxmax()
            product_name = decode_hs_code(main_product)
            export_data.append({
                'country_code': str(partner_code),
                'country_name': partner_name,
                'value': value,
                'product_code': str(main_product),
                'product_name': product_name
            })
        
        # Get top 5 import partners
        imports = country_df.groupby('j')['v'].sum().nlargest(5)
        import_data = []
        for partner_code, value in imports.items():
            partner_name = country_names.get(str(partner_code), 'Unknown')
            # Get the main product imported from this partner
            main_product = country_df[country_df['j'] == partner_code].groupby('k')['v'].sum().idxmax()
            product_name = decode_hs_code(main_product)
            import_data.append({
                'country_code': str(partner_code),
                'country_name': partner_name,
                'value': value,
                'product_code': str(main_product),
                'product_name': product_name
            })
        
        return jsonify({
            'exports': export_data,
            'imports': import_data
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500 