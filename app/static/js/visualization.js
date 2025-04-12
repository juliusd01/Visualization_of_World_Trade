// Initialize variables
let worldMap = null;
let countryIdMap = {};  // Map to store country code to feature id mapping
let currentCountry = null;
let globeRotation = [0, 0, 0];
let isDragging = false;
let dragStart = null;
let width = 800;
let height = 500;

// Setup view switching
function setupViewSwitching() {
    const buttons = d3.selectAll('.nav-button');
    buttons.on('click', function() {
        const view = this.getAttribute('data-view');
        // Update active button
        buttons.classed('active', false);
        d3.select(this).classed('active', true);
        
        // Update active view
        d3.selectAll('.view').classed('active', false);
        d3.select(`#${view}-view`).classed('active', true);
        
        // If we have a selected country, update the current view
        if (currentCountry) {
            updateTradeData(currentCountry);
        }
    });
}

// Load world map data
d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
    .then(data => {
        console.log('Loaded world map data:', data);
        worldMap = data;
        loadCountries().then(() => {
            drawMap();
            setupMouseControls();
            setupDropdownListener();
            setupViewSwitching();
        });
    })
    .catch(error => {
        console.error('Error loading world map:', error);
    });

// Setup dropdown selection listener
function setupDropdownListener() {
    d3.select('#country-select').on('change', function() {
        const selectedValue = this.value;
        console.log('Selected country:', selectedValue);
        if (selectedValue) {
            selectCountry(selectedValue);
        }
    });
}

// Draw the world map
function drawMap(selector = '#map') {
    const container = d3.select(selector.replace('map', 'map-container'));
    width = container.node().getBoundingClientRect().width;
    height = container.node().getBoundingClientRect().height;
    
    // Setup projection
    const projection = d3.geoOrthographic()
        .scale(250)
        .translate([width / 2, height / 2])
        .rotate(globeRotation)
        .clipAngle(90);
    
    const path = d3.geoPath().projection(projection);
    
    // Setup SVG
    const svg = d3.select(selector)
        .attr('width', width)
        .attr('height', height);
    
    // Clear existing content
    svg.selectAll('*').remove();
    
    // Draw the globe background
    svg.append('circle')
        .attr('class', 'globe-background')
        .attr('cx', width / 2)
        .attr('cy', height / 2)
        .attr('r', projection.scale());
    
    // Draw countries
    svg.selectAll('.country')
        .data(topojson.feature(worldMap, worldMap.objects.countries).features)
        .enter()
        .append('path')
        .attr('class', 'country')
        .attr('d', path)
        .attr('fill', d => {
            const code = getCountryCode(d);
            return code === currentCountry ? '#4CAF50' : '#ccc';
        })
        .on('click', function(event, d) {
            const countryCode = getCountryCode(d);
            if (countryCode) {
                selectCountry(countryCode);
                // Update dropdown to match
                document.getElementById('country-select').value = countryCode;
            }
        });
    
    // Setup drag behavior
    svg.call(d3.drag()
        .on('start', dragStarted)
        .on('drag', dragged)
        .on('end', dragEnded));
    
    // If there's a selected country and this is the main map, draw trade flows
    if (currentCountry && selector === '#map') {
        fetch(`/api/trade/${currentCountry}`)
            .then(response => response.json())
            .then(data => {
                drawTradeFlows(data, currentCountry, projection);
            })
            .catch(error => console.error('Error fetching trade data:', error));
    }
}

// Drag handlers
function dragStarted(event) {
    isDragging = true;
    dragStart = [event.x, event.y];
}

function dragged(event) {
    if (!isDragging) return;
    
    const dragEnd = [event.x, event.y];
    const rotation = [
        globeRotation[0] + (dragEnd[0] - dragStart[0]) / 4,
        globeRotation[1] - (dragEnd[1] - dragStart[1]) / 4,
        globeRotation[2]
    ];
    
    globeRotation = rotation;
    dragStart = dragEnd;
    
    // Redraw both maps
    drawMap('#map');
    drawMap('#products-map');
}

function dragEnded() {
    isDragging = false;
}

// Load countries into the dropdown
async function loadCountries() {
    try {
        const response = await fetch('/api/countries');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const countries = await response.json();
        
        if (!countries || countries.length === 0) {
            throw new Error('No countries loaded from API');
        }
        
        const select = d3.select('#country-select');
        select.selectAll('option').remove();
        
        select.append('option')
            .attr('value', '')
            .text('Select a country');
        
        countries.forEach(country => {
            select.append('option')
                .attr('value', country.country_code)
                .text(country.country_name);
            
            // Store the mapping between country code and feature ID
            const countryFeature = topojson.feature(worldMap, worldMap.objects.countries).features
                .find(f => f.id === parseInt(country.country_code));
            
            if (countryFeature) {
                countryIdMap[country.country_code] = countryFeature.id;
            }
        });
        
        // Setup dropdown change handler
        select.on('change', function() {
            const countryCode = this.value;
            if (countryCode) {
                selectCountry(countryCode);
            }
        });
        
    } catch (error) {
        console.error('Error loading countries:', error);
        d3.select('#country-select')
            .html('<option value="">Error loading countries</option>');
    }
}

// Get country code from feature
function getCountryCode(feature) {
    if (!feature || !feature.id) return null;
    return Object.keys(countryIdMap).find(code => countryIdMap[code] === feature.id);
}

// Select a country
function selectCountry(countryCode) {
    if (!countryCode) return;
    
    currentCountry = countryCode;
    console.log('Selected country:', countryCode);
    
    // Update maps
    drawMap('#map');
    drawMap('#products-map');
    
    // Update data displays
    updateTradeData(countryCode);
}

// Update trade data visualization
function updateTradeData(countryCode) {
    console.log('Updating trade data for:', countryCode);
    if (!countryCode) {
        console.error('Invalid country code');
        return;
    }
    
    // Get trade partner data
    fetch(`/api/trade/${countryCode}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Received trade data:', data);
            updateTradeInfo(data);
            drawTradeFlows(data, countryCode);
        })
        .catch(error => {
            console.error('Error fetching trade data:', error);
            updateTradeInfo({ exports: [], imports: [] });
        });
    
    // Get product data
    fetch(`/api/products/${countryCode}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Received product data:', data);
            updateProductCharts(data);
        })
        .catch(error => {
            console.error('Error fetching product data:', error);
            updateProductCharts({ exports: [], imports: [] });
        });
}

// Update trade information display
function updateTradeInfo(data) {
    const tradeInfo = document.getElementById('trade-info');
    tradeInfo.innerHTML = ''; // Clear existing content
    
    // Create exports section
    const exportsSection = document.createElement('div');
    exportsSection.className = 'trade-section';
    exportsSection.innerHTML = '<h3>Top Export Partners</h3>';
    
    const exportsList = document.createElement('div');
    exportsList.className = 'trade-list';
    data.exports.forEach(partner => {
        const partnerItem = document.createElement('div');
        partnerItem.className = 'trade-item';
        partnerItem.innerHTML = `
            <div class="country-name">${partner.country_name}</div>
            <div class="trade-value">$${(partner.value / 1000000).toFixed(2)}M</div>
        `;
        exportsList.appendChild(partnerItem);
    });
    exportsSection.appendChild(exportsList);
    
    // Create imports section
    const importsSection = document.createElement('div');
    importsSection.className = 'trade-section';
    importsSection.innerHTML = '<h3>Top Import Partners</h3>';
    
    const importsList = document.createElement('div');
    importsList.className = 'trade-list';
    data.imports.forEach(partner => {
        const partnerItem = document.createElement('div');
        partnerItem.className = 'trade-item';
        partnerItem.innerHTML = `
            <div class="country-name">${partner.country_name}</div>
            <div class="trade-value">$${(partner.value / 1000000).toFixed(2)}M</div>
        `;
        importsList.appendChild(partnerItem);
    });
    importsSection.appendChild(importsList);
    
    // Add both sections to the trade info div
    tradeInfo.appendChild(exportsSection);
    tradeInfo.appendChild(importsSection);
}

// Draw trade flows on the map
function drawTradeFlows(data, countryCode) {
    const svg = d3.select('#map');
    
    // Remove previous trade flows
    svg.selectAll('.trade-flow').remove();

    // Get the selected country's coordinates
    const selectedCountryFeature = topojson.feature(worldMap, worldMap.objects.countries).features
        .find(f => f.id === parseInt(countryCode));
    
    if (!selectedCountryFeature) {
        console.error('Could not find selected country feature:', countryCode);
        return;
    }

    const selectedCountryCenter = d3.geoCentroid(selectedCountryFeature);
    const selectedCountryPoint = projection(selectedCountryCenter);

    // Draw export flows
    if (data.exports && data.exports.length > 0) {
        data.exports.forEach(trade => {
            const targetCountryFeature = topojson.feature(worldMap, worldMap.objects.countries).features
                .find(f => f.id === parseInt(trade.country_code));
            
            if (targetCountryFeature) {
                const targetCenter = d3.geoCentroid(targetCountryFeature);
                const targetPoint = projection(targetCenter);
                
                // Only draw if both points are visible (not clipped by the globe)
                if (isPointVisible(selectedCountryCenter) && isPointVisible(targetCenter)) {
                    svg.append('line')
                        .attr('class', 'trade-flow')
                        .attr('x1', selectedCountryPoint[0])
                        .attr('y1', selectedCountryPoint[1])
                        .attr('x2', targetPoint[0])
                        .attr('y2', targetPoint[1])
                        .style('stroke', '#ff0000')
                        .style('stroke-width', 2)
                        .style('opacity', 0.7);
                }
            }
        });
    }

    // Draw import flows
    if (data.imports && data.imports.length > 0) {
        data.imports.forEach(trade => {
            const sourceCountryFeature = topojson.feature(worldMap, worldMap.objects.countries).features
                .find(f => f.id === parseInt(trade.country_code));
            
            if (sourceCountryFeature) {
                const sourceCenter = d3.geoCentroid(sourceCountryFeature);
                const sourcePoint = projection(sourceCenter);
                
                // Only draw if both points are visible (not clipped by the globe)
                if (isPointVisible(selectedCountryCenter) && isPointVisible(sourceCenter)) {
                    svg.append('line')
                        .attr('class', 'trade-flow')
                        .attr('x1', sourcePoint[0])
                        .attr('y1', sourcePoint[1])
                        .attr('x2', selectedCountryPoint[0])
                        .attr('y2', selectedCountryPoint[1])
                        .style('stroke', '#0000ff')
                        .style('stroke-width', 2)
                        .style('opacity', 0.7);
                }
            }
        });
    }
}

// Check if a point is visible on the globe
function isPointVisible(point) {
    const projected = projection(point);
    return projected && 
           projected[0] >= 0 && 
           projected[0] <= width && 
           projected[1] >= 0 && 
           projected[1] <= height;
}

// Update product charts
function updateProductCharts(data) {
    // Clear previous charts
    const exportProducts = d3.select('#export-products');
    const importProducts = d3.select('#import-products');
    
    exportProducts.html('<h3>Top Export Categories</h3>');
    importProducts.html('<h3>Top Import Categories</h3>');

    // Create export products section
    if (data.exports && data.exports.length > 0) {
        const exportsList = exportProducts.append('div')
            .attr('class', 'products-list');
        
        data.exports.forEach(product => {
            exportsList.append('div')
                .attr('class', 'product-card')
                .html(`
                    <div class="product-info">
                        <h4>${product.product_name}</h4>
                        <p class="trade-value">$${(product.value / 1000000).toFixed(2)}M</p>
                    </div>
                `);
        });
    } else {
        exportProducts.append('div')
            .text('No export data available');
    }

    // Create import products section
    if (data.imports && data.imports.length > 0) {
        const importsList = importProducts.append('div')
            .attr('class', 'products-list');
        
        data.imports.forEach(product => {
            importsList.append('div')
                .attr('class', 'product-card')
                .html(`
                    <div class="product-info">
                        <h4>${product.product_name}</h4>
                        <p class="trade-value">$${(product.value / 1000000).toFixed(2)}M</p>
                    </div>
                `);
        });
    } else {
        importProducts.append('div')
            .text('No import data available');
    }
}

// Initialize the visualization
async function init() {
    try {
        // Load world map data
        worldMap = await d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json');
        console.log('Loaded world map data:', worldMap);
        
        // Load countries and setup visualization
        await loadCountries();
        
        // Draw initial maps
        drawMap('#map');
        drawMap('#products-map');
        
        // Setup navigation
        setupNavigation();
        
        // Setup dropdown change handler
        d3.select('#country-select').on('change', function() {
            const countryCode = this.value;
            if (countryCode) {
                selectCountry(countryCode);
            }
        });
        
        console.log('Initialization complete');
    } catch (error) {
        console.error('Error during initialization:', error);
    }
}

// Start the visualization
init();

// Setup navigation between views
function setupNavigation() {
    const buttons = document.querySelectorAll('.nav-button');
    const views = document.querySelectorAll('.view');
    
    buttons.forEach(button => {
        button.addEventListener('click', () => {
            const targetView = button.dataset.view;
            
            // Update buttons
            buttons.forEach(b => b.classList.remove('active'));
            button.classList.add('active');
            
            // Update views
            views.forEach(view => {
                if (view.id === `${targetView}-view`) {
                    view.classList.add('active');
                } else {
                    view.classList.remove('active');
                }
            });
            
            // Redraw the visible map
            if (targetView === 'partners') {
                drawMap('#map');
            } else {
                drawMap('#products-map');
            }
        });
    });
}

// Update maps when a country is selected
function updateMaps(countryCode) {
    // Update both maps
    ['#map', '#products-map'].forEach(selector => {
        const svg = d3.select(selector);
        svg.selectAll('.country')
            .attr('fill', d => {
                const code = getCountryCode(d);
                return code === countryCode ? '#4CAF50' : '#ccc';
            });
    });
}

// Select a country
function selectCountry(countryCode) {
    currentCountry = countryCode;
    console.log('Selected country:', countryCode);
    
    // Update maps
    updateMaps(countryCode);
    
    // Update data displays
    updateTradeData(countryCode);
} 