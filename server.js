<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AlpenSync OS — Year-Round Production Hub</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <style>
        html { scroll-behavior: smooth; }
        .swiss-glow-frame { box-shadow: 0 15px 50px rgba(227, 28, 37, 0.18); }
        .scrollbar-stark::-webkit-scrollbar { width: 5px; }
        .scrollbar-stark::-webkit-scrollbar-track { background: #f4f5f7; }
        .scrollbar-stark::-webkit-scrollbar-thumb { background: #1c1917; border-radius: 2px; }
        #alpineMap { height: 260px; width: 100%; border-radius: 16px; z-index: 10; border: 1px solid #e2e8f0; }
    </style>
</head>
<body class="bg-[#f8f9fa] text-slate-900 font-sans antialiased min-h-screen flex flex-col">

    <nav class="border-b border-stone-900 bg-[#0c0d0f] text-white sticky top-0 z-50 shadow-md">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-[#E31C25] to-[#B31218] flex flex-col items-center justify-center shadow shadow-red-600/30">
                    <i class="fa-solid fa-mountain text-white text-xs leading-none relative -top-0.5"></i>
                    <i class="fa-solid fa-plus text-white text-[8px] font-bold mt-0.5"></i>
                </div>
                <span class="font-black text-lg tracking-wider text-white">ALPEN<span class="text-[#E31C25]">SYNC</span></span>
            </div>

            <div class="flex items-center gap-2 bg-stone-900 p-1 rounded-xl border border-stone-800 text-xs">
                <button id="seasonWinter" onclick="setSeason('winter')" class="px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider transition-all bg-[#E31C25] text-white">
                    <i class="fa-solid fa-snowflake mr-1"></i> Winter
                </button>
                <button id="seasonSummer" onclick="setSeason('summer')" class="px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider transition-all text-stone-400 hover:text-white">
                    <i class="fa-solid fa-sun mr-1"></i> Summer
                </button>
            </div>
        </div>
    </nav>

    <header id="heroSection" class="relative w-full min-h-[45vh] flex flex-col justify-center items-center bg-cover bg-center transition-all duration-700" style="background-image: url('https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1920&q=80');">
        <div class="absolute inset-0 bg-gradient-to-b from-black/50 via-black/20 to-[#f8f9fa] z-10"></div>
        <div class="relative z-20 text-center max-w-4xl px-4 space-y-2 pt-12 pb-24">
            <h1 class="text-4xl sm:text-6xl font-black text-white tracking-tight uppercase drop-shadow-xl">
                Conquer The <span id="heroSeasonTitle" class="text-transparent bg-clip-text bg-gradient-to-r from-[#E31C25] to-red-400">Winter Heights</span>
            </h1>
            <p class="text-white/90 text-xs sm:text-sm max-w-xl mx-auto">Automated Swiss Pass pricing grids, localized trail mapping, and live weather telemetry arrays.</p>
        </div>
    </header>

    <section id="configure-zone" class="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 -mt-24 relative z-30 mb-8">
        <div class="bg-[#0b0c0e] text-white rounded-3xl p-6 shadow-2xl border border-stone-900">
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-sans">
                <div class="bg-[#14161a] p-3 rounded-xl border border-stone-800">
                    <label class="text-[9px] text-red-500 font-black uppercase tracking-wider block mb-1">From (SBB Station)</label>
                    <select id="paramOrigin" class="w-full bg-transparent text-white focus:outline-none cursor-pointer">
                        <option value="Lausanne" selected>Lausanne Central</option>
                        <option value="Zurich">Zürich HB</option>
                        <option value="Geneva">Genève Central</option>
                    </select>
                </div>

                <div class="bg-[#14161a] p-3 rounded-xl border border-stone-800">
                    <label class="text-[9px] text-red-500 font-black uppercase tracking-wider block mb-1">To (Resort Hub)</label>
                    <select id="paramDestination" onchange="updateMountainSectors()" class="w-full bg-transparent text-white focus:outline-none cursor-pointer">
                        <option value="Zermatt" selected>Zermatt (Matterhorn)</option>
                        <option value="Verbier">Verbier (4 Vallées)</option>
                        <option value="Grindelwald">Grindelwald Terminal</option>
                        <option value="Andermatt">Andermatt Sedrun</option>
                    </select>
                </div>

                <div class="bg-[#14161a] p-3 rounded-xl border border-stone-800">
                    <label class="text-[9px] text-red-500 font-black uppercase tracking-wider block mb-1">Mountain Target Sector</label>
                    <select id="paramSector" class="w-full bg-transparent text-white focus:outline-none cursor-pointer">
                        </select>
                </div>

                <div class="bg-[#14161a] p-3 rounded-xl border border-stone-800 grid grid-cols-2 gap-2">
                    <div>
                        <label class="text-[9px] text-red-500 font-black uppercase tracking-wider block mb-1">Departure Date</label>
                        <input type="date" id="paramDate" class="w-full bg-transparent text-white text-[11px] font-mono focus:outline-none">
                    </div>
                    <div>
                        <label class="text-[9px] text-red-500 font-black uppercase tracking-wider block mb-1">Time Window</label>
                        <input type="time" id="paramTime" value="08:14" class="w-full bg-transparent text-white text-[11px] font-mono focus:outline-none">
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-sans mt-4 pt-4 border-t border-stone-800">
                <div class="bg-[#14161a] p-3 rounded-xl border border-stone-800">
                    <label class="text-[9px] text-stone-400 font-black uppercase tracking-wider block mb-1">Alpine Objective</label>
                    <select id="paramObjective" onchange="runEngineGearUpdate()" class="w-full bg-transparent text-white focus:outline-none cursor-pointer">
                        </select>
                </div>

                <div class="bg-[#14161a] p-3 rounded-xl border border-stone-800 grid grid-cols-2 gap-2">
                    <div>
                        <label class="text-[9px] text-stone-400 font-black uppercase tracking-wider block mb-1">SwissPass Profile</label>
                        <select id="paramSwissPass" class="w-full bg-transparent text-white focus:outline-none cursor-pointer text-[11px]">
                            <option value="FullFare" selected>Full Price Tariff</option>
                            <option value="HalfFare">Half-Fare (1/2)</option>
                            <option value="GA">GA Membership</option>
                        </select>
                    </div>
                    <div>
                        <label class="text-[9px] text-stone-400 font-black uppercase tracking-wider block mb-1">Crew Size</label>
                        <input type="number" id="paramGroupSize" value="1" min="1" max="25" class="w-full bg-transparent text-white font-bold focus:outline-none">
                    </div>
                </div>

                <div class="bg-[#14161a] p-3 rounded-xl border border-stone-800">
                    <label class="text-[9px] text-stone-400 font-black uppercase tracking-wider block mb-1">Resort Pass Subscriptions</label>
                    <select id="paramPasses" class="w-full bg-transparent text-stone-300 focus:outline-none cursor-pointer">
                        <option value="None" selected>Purchase Lift Day Pass</option>
                        <option value="MagicPass">Magic Pass Active Holder</option>
                        <option value="Top4">Top4 Region Season Card</option>
                    </select>
                </div>

                <div class="flex items-end">
                    <button onclick="executeClusterCalculation()" id="engineBtn" class="w-full bg-gradient-to-r from-[#E31C25] to-[#B31218] hover:brightness-110 text-white font-black py-3.5 rounded-xl uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2">
                        <i class="fa-solid fa-circle-nodes"></i> Compute Search
                    </button>
                </div>
            </div>
        </div>
    </section>

    <main class="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pb-12 flex-1">
        <div class="bg-white p-6 sm:p-8 rounded-[32px] border-2 border-[#E31C25] swiss-glow-frame space-y-6">
            <div class="border-b border-stone-200 pb-2 flex justify-between items-end">
                <h2 class="text-xl font-black text-stone-950 tracking-tight uppercase">Workspace Metrics</h2>
                <div class="text-[10px] font-mono text-stone-400 font-bold uppercase tracking-wider">
                    Temp: <span id="hudTemp">--</span> | Wind: <span id="hudWind">--</span> | Status: <span id="matchRate">Standby</span>
                </div>
            </div>

            <div id="logConsole" class="bg-stone-50 p-2.5 rounded-xl border border-stone-200 h-12 overflow-y-auto text-[11px] font-mono text-stone-600 scrollbar-stark">
                > System operational. Select metrics and click Compute Search to query full-stack backend routers...
            </div>

            <div class="grid grid-cols-1 gap-4">
                <div id="alpineMap"></div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div class="lg:col-span-3 bg-[#f4f5f6] border border-stone-200 rounded-2xl p-4 sm:p-6 space-y-4">
                    <h4 class="text-xs font-black tracking-widest text-stone-950 uppercase border-b border-stone-200 pb-2 flex justify-between items-center">
                        <span>SBB Timetable Card Breakdown</span>
                        <img src="https://upload.wikimedia.org/wikipedia/commons/0/00/SBB_CFF_FFS_LOGO.svg" class="h-3" alt="SBB Logo">
                    </h4>
                    <div id="itineraryContainer" class="space-y-4 text-center py-12 text-stone-400 text-xs font-medium">
                        Awaiting cluster generation protocols...
                    </div>
                </div>

                <div class="lg:col-span-2 space-y-4">
                    <div class="bg-stone-50 border border-stone-200 rounded-2xl p-5 transition-all duration-500" id="meteoVillageContainer">
                        <h4 class="text-xs font-black tracking-widest text-stone-950 uppercase mb-2">MeteoSuisse Environment</h4>
                        <div class="text-xs text-stone-500 font-mono">No parameters computed yet.</div>
                    </div>

                    <div class="bg-stone-50 border border-stone-200 rounded-2xl p-5">
                        <h4 class="text-xs font-black tracking-widest text-stone-950 uppercase mb-3 flex justify-between items-center">
                            <span>Available Accommodations</span>
                            <span class="text-[10px] text-stone-400 font-mono" id="selectedHotelTally">None Chosen</span>
                        </h4>
                        <div id="accommodationContainer" class="space-y-3 text-xs text-stone-400">
                            No rooms loaded yet. Click Compute Search to view baseline local options.
                        </div>
                    </div>
                </div>
            </div>

            <div id="expenseLedgerSection" class="hidden border border-stone-200 rounded-2xl p-5 bg-gradient-to-br from-stone-50 to-stone-100/50 space-y-3">
                <h4 class="text-xs font-black tracking-widest text-stone-950 uppercase border-b pb-2 flex justify-between items-center">
                    <span><i class="fa-solid fa-calculator text-[#E31C25] mr-1"></i> Crew Expedition Cost Ledger Spreadsheet</span>
                    <span id="ledgerGroupSizeBadge" class="bg-stone-950 text-white font-mono px-2 py-0.5 rounded-md text-[10px]">1 Crew Member</span>
                </h4>
                <div class="overflow-x-auto text-xs font-sans text-slate-800">
                    <table class="w-full text-left border-collapse bg-white rounded-xl overflow-hidden border border-stone-200">
                        <thead>
                            <tr class="bg-stone-900 text-white font-bold text-[10px] uppercase tracking-wider">
                                <th class="p-3">Expense Category Description</th>
                                <th class="p-3">Rate Per Person</th>
                                <th class="p-3 text-right">Group Total Volume</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-stone-100">
                            <tr>
                                <td class="p-3 font-medium">SBB Transport Transit Passes (Standard 2nd Class Baseline)</td>
                                <td class="p-3 font-mono" id="tableCostSbbEach">CHF 0.00</td>
                                <td class="p-3 font-mono font-bold text-right" id="tableCostSbbTotal">CHF 0.00</td>
                            </tr>
                            <tr>
                                <td class="p-3 font-medium">Mountain Target Resort Lift Access Tickets</td>
                                <td class="p-3 font-mono" id="tableCostLiftEach">CHF 0.00</td>
                                <td class="p-3 font-mono font-bold text-right" id="tableCostLiftTotal">CHF 0.00</td>
                            </tr>
                            <tr>
                                <td class="p-3 font-medium">Active Selection Alpine Staging Stays (Lodging Tally)</td>
                                <td class="p-3 font-mono" id="tableCostHotelEach">CHF 0.00</td>
                                <td class="p-3 font-mono font-bold text-right" id="tableCostHotelTotal">CHF 0.00</td>
                            </tr>
                            <tr class="bg-stone-950 text-white font-black">
                                <td class="p-3 uppercase tracking-wider">Calculated Expedition Split Matrix Tally</td>
                                <td class="p-3 font-mono text-red-400" id="tableGrandEach">CHF 0.00 / individual</td>
                                <td class="p-3 font-mono text-right text-emerald-400 text-sm" id="tableGrandTotal">CHF 0.00 Total</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="p-4 bg-stone-50 border border-stone-200 rounded-xl">
                <h4 class="text-xs font-black tracking-widest text-stone-950 uppercase mb-2">Technical Equipment Framework Checklist</h4>
                <div id="gearDisplayBox" class="text-xs text-stone-600 font-mono">Select objective to parse active gear arrays.</div>
            </div>
        </div>
    </main>

    <script>
        let currentSeasonMode = "winter";
        let globalCalculatedCache = null; // Storing computation data frames to feed ledger splits dynamically
        let mapInstance = null;

        const destinationSectorRegistry = {
            "Zermatt": [
                { name: "Gornergrat Crest System (3089m)", summer: "Alpine Trail Wilderness Trekking", winter: "Piste High Freeride Paths" },
                { name: "Matterhorn Glacier Paradise (3883m)", summer: "Glacial High Traverse / Summer Ski", winter: "Technical High Glacial Arena" },
                { name: "Rothorn Domain Area (3103m)", summer: "Downhill Extreme Mountain Biking", winter: "Sun-Deck Wide Carver Slopes" }
            ],
            "Verbier": [
                { name: "Mont-Fort Summit Spine (3330m)", summer: "Panoramic Glacier Ridge Treks", winter: "Expert High Backcountry Couloirs" },
                { name: "Savoleyres Alpine Pastures", summer: "Cross-Country E-Biking Loops", winter: "Intermediate Cruising Open Trails" }
            ],
            "Grindelwald": [
                { name: "Eiger Glacier Terminal", summer: "Technical North Face Rock Trails", winter: "Technical High-Speed Carver Slopes" },
                { name: "First Adventure Sector", summer: "High Alpine Cliff Walk Circuits", winter: "Freestyle Progressive Snowparks" }
            ],
            "Andermatt": [
                { name: "Gemsstock Savage North Face (2961m)", summer: "Technical Multi-pitch Rock Climbing", winter: "Deep Powder Ski Touring" }
            ]
        };

        const seasonObjectivesRegistry = {
            "winter": ["Ski Touring", "Alpinism", "Ice Climbing", "Glacier Mountaineering"],
            "summer": ["High-Altitude Trekking", "Technical Rock Climbing", "Downhill Mountain Biking", "Glacier Via Ferrata"]
        };

        const technicalApparelRegistry = {
            "Ski Touring": "Breathable technical touring softshell coats, protective safety avalanche tracking beacons, and wind blocks.",
            "Alpinism": "Heavy shell weather defense jackets, hard abrasion-resistant mount gear sets, and safety crampons.",
            "Ice Climbing": "Reinforced water resistant outer coatings, double layers isolated utility ice climbing gloves, and dual ice tools.",
            "Glacier Mountaineering": "High-altitude UV Category 4 glacier reflection glasses, thermal base undershirts, and dynamic ropes.",
            "High-Altitude Trekking": "Moisture-wicking active base layers, stretch trail trekking canvas diameters, light rain pack shell.",
            "Technical Rock Climbing": "Form-fitting highly durable canvas stretch climbing segments, chalk gear utilities, and climbing harness.",
            "Downhill Mountain Biking": "Long-sleeve armored protection mesh layers, impact absorbing composite joint armor pads, and full-face helmet.",
            "Glacier Via Ferrata": "Active protective softshell element tracking coat, specialized via ferrata lanyard absorber system, and high-traction boots."
        };

        // LAUNCH INITIAL ENGINE MAP DEPLOYMENT HOOK
        document.addEventListener("DOMContentLoaded", () => {
            document.getElementById('paramDate').value = new Date().toISOString().split('T')[0];
            updateMountainSectors();
            populateObjectives();
            
            // Boot map framework pointing default view at Swiss geographic center
            mapInstance = L.map('alpineMap').setView([46.8182, 8.2275], 8);
            L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
                attribution: 'Map data: &copy; OpenTopoMap contributors'
            }).addTo(mapInstance);
        });

        function setSeason(mode) {
            currentSeasonMode = mode;
            const winterBtn = document.getElementById('seasonWinter');
            const summerBtn = document.getElementById('seasonSummer');
            const heroSection = document.getElementById('heroSection');
            const heroTitle = document.getElementById('heroSeasonTitle');

            if(mode === 'winter') {
                winterBtn.className = "px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider transition-all bg-[#E31C25] text-white";
                summerBtn.className = "px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider transition-all text-stone-400 hover:text-white";
                heroSection.style.backgroundImage = "url('https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1920&q=80')";
                heroTitle.innerText = "Winter Heights";
            } else {
                summerBtn.className = "px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider transition-all bg-amber-500 text-slate-950";
                winterBtn.className = "px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider transition-all text-stone-400 hover:text-white";
                heroSection.style.backgroundImage = "url('https://images.unsplash.com/photo-1464146072230-91cabc968266?auto=format&fit=crop&w=1920&q=80')";
                heroTitle.innerText = "Summer Wilderness";
            }
            updateMountainSectors();
            populateObjectives();
        }

        function updateMountainSectors() {
            const destKey = document.getElementById('paramDestination').value;
            const sectorSelect = document.getElementById('paramSector');
            const sectors = destinationSectorRegistry[destKey] || [];
            
            sectorSelect.innerHTML = "";
            sectors.forEach(s => {
                const activeContext = currentSeasonMode === "winter" ? s.winter : s.summer;
                const opt = document.createElement('option');
                opt.value = s.name;
                opt.innerText = `${s.name} (${activeContext})`;
                sectorSelect.appendChild(opt);
            });
        }

        function populateObjectives() {
            const objectiveSelect = document.getElementById('paramObjective');
            const arrayItems = seasonObjectivesRegistry[currentSeasonMode] || [];
            objectiveSelect.innerHTML = "";
            arrayItems.forEach(item => {
                const opt = document.createElement('option');
                opt.value = item; opt.innerText = item;
                objectiveSelect.appendChild(opt);
            });
            runEngineGearUpdate();
        }

        function runEngineGearUpdate() {
            const obj = document.getElementById('paramObjective').value;
            const text = technicalApparelRegistry[obj] || "Standard mountain utility gear mapping packages active.";
            document.getElementById('gearDisplayBox').innerText = text;
        }

        // REAL-TIME LEDGER INTERACTIVE ACCOUNTING SPLITTER FORMULA CALCULATORS
        function selectAccommodationChoice(id, name, totalVolumePrice, singleNightBasePrice) {
            document.getElementById('selectedHotelTally').innerText = `Selected: CHF ${totalVolumePrice}`;
            document.getElementById('logConsole').innerHTML = `> Accommodation selection locked: Registered space at ${name}.`;
            
            if (!globalCalculatedCache) return;

            const crewSize = parseInt(document.getElementById('paramGroupSize').value) || 1;
            const sbbTotal = globalCalculatedCache.railTariffs.cost2nd;
            const sbbEach = sbbTotal / crewSize;

            let liftTotal = 0;
            if (globalCalculatedCache.resortPass.statusText.includes("Tariff")) {
                liftTotal = parseFloat(globalCalculatedCache.resortPass.statusText.replace(/[^0-9.]/g, '')) || 0;
            }
            const liftEach = liftTotal / crewSize;

            const hotelTotal = parseFloat(totalVolumePrice);
            const hotelEach = parseFloat(singleNightBasePrice);

            const grandTotal = sbbTotal + liftTotal + hotelTotal;
            const grandEach = grandTotal / crewSize;

            // Paint data spreadsheet fields
            document.getElementById('tableCostSbbEach').innerText = `CHF ${sbbEach.toFixed(2)}`;
            document.getElementById('tableCostSbbTotal').innerText = `CHF ${sbbTotal.toFixed(2)}`;
            document.getElementById('tableCostLiftEach').innerText = `CHF ${liftEach.toFixed(2)}`;
            document.getElementById('tableCostLiftTotal').innerText = `CHF ${liftTotal.toFixed(2)}`;
            document.getElementById('tableCostHotelEach').innerText = `CHF ${hotelEach.toFixed(2)}`;
            document.getElementById('tableCostHotelTotal').innerText = `CHF ${hotelTotal.toFixed(2)}`;
            
            document.getElementById('tableGrandEach').innerText = `CHF ${grandEach.toFixed(2)} / individual`;
            document.getElementById('tableGrandTotal').innerText = `CHF ${grandTotal.toFixed(2)} Gross Total`;
            
            document.getElementById('ledgerGroupSizeBadge').innerText = `${crewSize} Crew Members Active`;
            document.getElementById('expenseLedgerSection').classList.remove('hidden');
        }

        async function executeClusterCalculation() {
            const btn = document.getElementById('engineBtn');
            const consoleBox = document.getElementById('logConsole');
            
            btn.setAttribute('disabled', 'true');
            btn.innerHTML = "<i class='fa-solid fa-spinner animate-spin'></i> Computing...";
            consoleBox.innerHTML = `> Querying live cloud server endpoints securely...`;

            const payload = {
                originKey: document.getElementById('paramOrigin').value,
                destKey: document.getElementById('paramDestination').value,
                dateVal: document.getElementById('paramDate').value,
                timeVal: document.getElementById('paramTime').value,
                swissPassMode: document.getElementById('paramSwissPass').value,
                passSystem: document.getElementById('paramPasses').value,
                targetSectorName: document.getElementById('paramSector').value,
                travelers: parseInt(document.getElementById('paramGroupSize').value) || 1,
                currentSeasonMode: currentSeasonMode
            };

            try {
                const response = await fetch('https://alpnsync-1.onrender.com/api/compute-expedition', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                data = await response.json();
                globalCalculatedCache = data; // Caching dataframe frames locally

                if(data.success) {
                    consoleBox.innerHTML = `> Core metrics synchronised. Live SBB Route Connection: ${data.liveRouteConfirmed}`;
                    
                    // --- MAP MARKER ENGINE FLUID ROUTE PAN ANIMATOR ---
                    if (mapInstance && data.geoCoordinates) {
                        // Clear out older markers by rebuilding container layout layer views cleanly
                        mapInstance.eachLayer((layer) => {
                            if (!!layer.toGeoJSON) mapInstance.removeLayer(layer);
                        });
                        L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png').addTo(mapInstance);

                        const startPoint = [data.geoCoordinates.origin.lat, data.geoCoordinates.origin.lon];
                        const stopPoint = [data.geoCoordinates.dest.lat, data.geoCoordinates.dest.lon];

                        const markerA = L.marker(startPoint).addTo(mapInstance).bindPopup(`<b>Origin Station:</b> ${payload.originKey}`).openPopup();
                        const markerB = L.marker(stopPoint).addTo(mapInstance).bindPopup(`<b>Expedition Target:</b> ${payload.destKey}`);

                        const routeVectorLine = L.polyline([startPoint, stopPoint], { color: '#E31C25', weight: 4, opacity: 0.85, dashArray: '8, 8' }).addTo(mapInstance);
                        mapInstance.fitBounds(routeVectorLine.getBounds(), { padding: [40, 40] });
                    }

                    const hudTemp = document.getElementById('hudTemp');
                    const hudWind = document.getElementById('hudWind');
                    const matchRate = document.getElementById('matchRate');
                    const meteoContainer = document.getElementById('meteoVillageContainer');

                    hudTemp.innerText = `${data.telemetry.temp} °C`;
                    hudWind.innerText = `${data.telemetry.wind} km/h`;

                    meteoContainer.className = "text-xs p-5 rounded-2xl border font-mono transition-all duration-500 shadow-sm";

                    if (data.telemetry.score === 2) {
                        matchRate.innerText = "🚨 WEATHER RISK METRICS REACHED";
                        matchRate.className = "text-red-600 font-black animate-pulse";
                        
                        meteoContainer.classList.add("bg-gradient-to-br", "from-red-50", "to-rose-100", "border-red-300", "text-red-950");
                        meteoContainer.innerHTML = `
                            <div class="flex gap-4 items-start">
                                <div class="text-red-600 text-3xl animate-bounce pt-1"><i class="fa-solid fa-wind"></i></div>
                                <div class="space-y-1 flex-1">
                                    <div class="font-black text-red-800 uppercase tracking-wider text-[11px]">Severe Cable Car Advisory</div>
                                    <p class="text-[11px] text-red-800 font-sans leading-relaxed">
                                        Dangerous crosswinds discovered at peak sections (${data.telemetry.wind} km/h). Mountain lifts, cable frameworks, and high altitude tracking regions are under operational hold.
                                    </p>
                                </div>
                            </div>`;
                    } else if (data.telemetry.score === 4) {
                        matchRate.innerText = "⚠️ Cautionary Climate State";
                        matchRate.className = "text-amber-600 font-bold";
                        
                        meteoContainer.classList.add("bg-gradient-to-br", "from-amber-50", "to-orange-100", "border-amber-300", "text-amber-950");
                        meteoContainer.innerHTML = `
                            <div class="flex gap-4 items-start">
                                <div class="text-amber-600 text-3xl pt-1"><i class="fa-solid fa-cloud-sun-rain animate-pulse"></i></div>
                                <div class="space-y-1 flex-1">
                                    <div class="font-black text-amber-800 uppercase tracking-wider text-[11px]">Unstable Weather Front</div>
                                    <p class="text-[11px] text-amber-800 font-sans leading-relaxed">
                                        Moderate wind streams matching ${data.telemetry.wind} km/h detected. Exercise extreme navigation care on open ridge structures.
                                    </p>
                                </div>
                            </div>`;
                    } else {
                        matchRate.innerText = "🟢 Optimal Technical Window";
                        matchRate.className = "text-emerald-600 font-bold";
                        
                        meteoContainer.classList.add("bg-gradient-to-br", "from-emerald-50", "to-teal-50", "border-emerald-300", "text-emerald-950");
                        meteoContainer.innerHTML = `
                            <div class="flex gap-4 items-start">
                                <div class="text-emerald-500 text-3xl animate-spin [animation-duration:12s] pt-1"><i class="fa-solid fa-sun"></i></div>
                                <div class="space-y-1 flex-1">
                                    <div class="font-black text-emerald-800 uppercase tracking-wider text-[11px]">Clear Alpine Blue Skies</div>
                                    <p class="text-[11px] text-emerald-700 font-sans leading-relaxed">
                                        Ideal clear visibility parameters active across your target nodes. Safe operations window completely verified.
                                    </p>
                                </div>
                            </div>`;
                    }

                    // --- INTERACTIVE ACCOMMODATION CHECKBOX VIEW ---
                    let lodgHtml = "";
                    data.lodging.forEach((l, index) => {
                        const checkedAttr = index === 0 ? "checked" : "";
                        lodgHtml += `
                            <label class='flex gap-3 items-center bg-white p-3 rounded-xl border border-stone-200 shadow-sm cursor-pointer hover:border-[#E31C25] transition-all block relative'>
                                <input type="radio" name="accommodationOption" value="${l.id}" ${checkedAttr} 
                                    onclick="selectAccommodationChoice('${l.id}', '${l.name}', '${l.price}', '${l.baseIndividualPrice}')"
                                    class="accent-[#E31C25] h-4 w-4 shrink-0 focus:ring-0">
                                <img src='${l.img}' class='w-12 h-12 object-cover rounded-lg border ml-1'>
                                <div class='flex-1 min-w-0'>
                                    <div class='font-bold text-stone-900 text-xs truncate'>${l.name}</div>
                                    <div class='text-[10px] text-stone-400 truncate'>${l.feature}</div>
                                </div>
                                <div class='font-mono font-black text-red-600 text-xs shrink-0 pl-1'>CHF ${l.price}</div>
                            </label>`;
                    });
                    document.getElementById('accommodationContainer').innerHTML = lodgHtml;

                    // Trigger baseline billing calculations update loop matching index array item 0
                    if (data.lodging.length > 0) {
                        selectAccommodationChoice(data.lodging[0].id, data.lodging[0].name, data.lodging[0].price, data.lodging[0].baseIndividualPrice);
                    }

                    let sbbLegsHtml = "";
                    if (data.railTariffs.legs) {
                        data.railTariffs.legs.forEach(leg => {
                            if(leg.type === 'walk') {
                                sbbLegsHtml += `<div class='bg-stone-200 text-stone-600 p-2 text-center text-[10px] rounded-lg font-mono'><i class="fa-solid fa-person-walking mr-1"></i> ${leg.walkLabel} (${leg.duration})</div>`;
                            } else {
                                sbbLegsHtml += `
                                    <div class='bg-white p-4 border border-stone-200 rounded-2xl shadow-sm space-y-2 text-left relative overflow-hidden'>
                                        <div class="absolute top-0 left-0 w-1 h-full bg-[#E31C25]"></div>
                                        <div class='flex justify-between font-black text-stone-900 text-xs tracking-tight'>
                                            <span>${leg.dep} — ${leg.station}</span>
                                            <span class="bg-stone-100 px-2 py-0.5 rounded text-[10px] font-mono text-stone-500">Track ${leg.platform}</span>
                                        </div>
                                        <div class='text-[11px] font-mono text-stone-600 flex items-center gap-2'>
                                            <span class="bg-red-600 text-white font-black px-1.5 py-0.5 rounded text-[9px] uppercase">${leg.type}</span>
                                            <span class="font-bold">${leg.num}</span> 
                                            <span class="text-stone-400 font-medium">→ ${leg.info}</span>
                                        </div>
                                        <div class='font-bold text-stone-500 text-xs pt-1 border-t border-dashed border-stone-100'>${leg.arr} — ${leg.dest}</div>
                                    </div>`;
                            }
                        });
                    }

                    document.getElementById('itineraryContainer').innerHTML = `
                        <div class='space-y-4 font-sans text-xs'>
                            <div class='grid grid-cols-2 gap-3 text-left bg-gradient-to-br from-stone-950 to-stone-900 p-4 rounded-2xl text-white shadow-lg'>
                                <div><span class='text-stone-400 text-[9px] uppercase font-black tracking-wider block mb-0.5'>2nd Class Estimated Total</span><b class='text-base text-white font-mono font-black'>CHF ${data.railTariffs.cost2nd.toFixed(2)}</b></div>
                                <div><span class='text-red-400 text-[9px] uppercase font-black tracking-wider block mb-0.5'>1st Class Premium</span><b class='text-base text-red-500 font-mono font-black'>CHF ${data.railTariffs.cost1st.toFixed(2)}</b></div>
                            </div>
                            
                            <a href="${data.sbbBookingUrl}" target="_blank" class="w-full bg-[#E31C25] hover:bg-red-700 text-white font-black py-3 rounded-xl uppercase tracking-wider text-center block transition-all shadow shadow-red-600/20">
                                <i class="fa-solid fa-ticket mr-2"></i> Book Live Fares on SBB.ch
                            </a>

                            <div class='text-left text-[11px] font-medium p-3 bg-white border rounded-xl flex items-center justify-between shadow-sm'>
                                <span><i class="fa-solid fa-ticket text-red-600 mr-2"></i><b>Mountain Lift Passes:</b></span>
                                <span class="font-mono font-black text-stone-900 bg-stone-100 px-2 py-1 rounded text-[10px]">${data.resortPass.statusText}</span>
                            </div>
                            <div class='space-y-2'>${sbbLegsHtml || 'Point-to-point routing loaded.'}</div>
                        </div>`;
                }
            } catch (err) {
                consoleBox.innerHTML = `<span class='text-red-600'>✕ UI Render Error. Verify API parameter parsing configurations.</span>`;
            }

            btn.removeAttribute('disabled');
            btn.innerHTML = "Compute Search";
        }
    </script>
</body>
</html>
