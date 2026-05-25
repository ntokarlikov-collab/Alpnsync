const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// 1. OPEN ACCESS SECURITY CORRIDORS (CORS)
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

// Serve static frontend assets from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Precise Alpine Coordinates Database for Weather Fetching
const destinationCoordinates = {
    "Zermatt": { lat: 46.0207, lon: 7.7491 }, 
    "Andermatt": { lat: 46.6348, lon: 8.5947 },
    "Verbier": { lat: 46.0961, lon: 7.2286 }, 
    "Grindelwald": { lat: 46.6242, lon: 8.0414 }
};

// SBB Timetable Station String Database Mappers
const stationMappers = {
    "Lausanne": "Lausanne", "Zurich": "Zürich HB", "Geneva": "Genève",
    "Zermatt": "Zermatt", "Andermatt": "Andermatt", "Verbier": "Verbier, station", "Grindelwald": "Grindelwald"
};

// Premium Tier Staging Lodging Database
const baseLodgingRegistry = {
    "Andermatt": [{ name: "Andermatt Basecamp Hostel", feature: "Central mountain baseline staging access points", price: 48, img: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=300&q=80" }],
    "Zermatt": [{ name: "Zermatt Matterhorn Mountain Lodge", feature: "Premium ski basement lockers, panoramic view peaks", price: 75, img: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=300&q=80" }],
    "Verbier": [{ name: "W Verbier Alpine Crew Chalet", feature: "Direct walk-out access to Médran lift terminal", price: 89, img: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=300&q=80" }],
    "Grindelwald": [{ name: "Eiger Terminal Downtown Lodge", feature: "Risk briefing assembly spaces, north face base access", price: 58, img: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=300&q=80" }]
};

// Dynamic SBB Route Engine Breakdown Generator (Internal Backup Method)
function generateSbbItineraryLegs(from, to, timeVal) {
    return [
        { type: "IR", num: "95", info: `Direction ${to} Line`, dep: timeVal, station: from, arr: "10:02", dest: "Interchange Hub", platform: "4" },
        { type: "walk", walkLabel: "Station Transfer Connection", duration: "5 min" },
        { type: "REGIO", num: "Alpine", info: "Glacial Valley Shuttle", dep: "10:12", station: "Interchange Hub", arr: "11:46", dest: to, platform: "12" }
    ];
}

// 2. MAIN LOGIC AND COMPUTATION ENDPOINT ROUTER
app.post('/api/compute-expedition', async (req, res) => {
    try {
        const { originKey, destKey, dateVal, timeVal, swissPassMode, passSystem, travelers } = req.body;
        const coords = destinationCoordinates[destKey] || destinationCoordinates["Andermatt"];
        
        // --- STEP A: REAL-TIME METEO TELEMETRY HARVESTING ---
        let temp = 12.0, wind = 14.0;
        try {
            const meteoRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,wind_speed_10m&wind_speed_unit=kmh`);
            const meteoData = await meteoRes.json();
            if(meteoData?.current) {
                temp = meteoData.current.temperature_2m;
                wind = meteoData.current.wind_speed_10m;
            }
        } catch (e) { console.log("Meteo framework fallback running"); }

        // --- STEP B: LIVE TIMETABLE ROUTE EXTRACTION ---
        let routeLegs = [];
        let liveRouteConfirmed = false;
        try {
            const sbbUrl = `http://transport.opendata.ch/v1/connections?from=${encodeURIComponent(stationMappers[originKey])}&to=${encodeURIComponent(stationMappers[destKey])}&date=${dateVal}&time=${encodeURIComponent(timeVal)}&limit=1`;
            const sbbRes = await fetch(sbbUrl);
            const sbbData = await sbbRes.json();

            if (sbbData?.connections && sbbData.connections.length > 0) {
                liveRouteConfirmed = true;
                const activeConnection = sbbData.connections[0];
                activeConnection.sections.forEach((sec) => {
                    if (sec.walk) {
                        routeLegs.push({ type: 'walk', walkLabel: 'Station Transfer / Footpath Connection', duration: `${sec.walk.duration || 5} min` });
                    } else if (sec.journey) {
                        const depTime = new Date(sec.departure.departure).toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' });
                        const arrTime = new Date(sec.arrival.arrival).toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' });
                        routeLegs.push({
                            type: sec.journey.category || 'Train',
                            num: sec.journey.number || '',
                            info: sec.journey.to || 'Direction Hub',
                            dep: depTime, station: sec.departure.station.name,
                            arr: arrTime, dest: sec.arrival.station.name,
                            platform: sec.departure.platform || 'N/A'
                        });
                    }
                });
            }
        } catch(e) { console.log("Using baseline internal timetable generator"); }

        if (routeLegs.length === 0) {
            routeLegs = generateSbbItineraryLegs(stationMappers[originKey], stationMappers[destKey], timeVal);
        }

        // --- STEP C: VERIFIED POINT-TO-POINT SBB FULL-FARE ONE-WAY LOOKUP MATRIX ---
        const sbbBaseTariffs = {
            "Geneva": { 
                "Zermatt": { class2nd: 102.00, class1st: 174.00 }, 
                "Andermatt": { class2nd: 78.50, class1st: 137.60 }, 
                "Verbier": { class2nd: 56.00, class1st: 98.40 }, 
                "Grindelwald": { class2nd: 93.00, class1st: 163.60 } 
            },
            "Lausanne": { 
                "Zermatt": { class2nd: 71.00, class1st: 125.00 }, 
                "Andermatt": { class2nd: 68.00, class1st: 119.60 }, 
                "Verbier": { class2nd: 33.60, class1st: 59.20 }, 
                "Grindelwald": { class2nd: 73.00, class1st: 128.40 } 
            },
            "Zurich": { 
                "Zermatt": { class2nd: 129.00, class1st: 226.00 }, 
                "Andermatt": { class2nd: 51.00, class1st: 89.80 }, 
                "Verbier": { class2nd: 106.00, class1st: 186.00 }, 
                "Grindelwald": { class2nd: 86.00, class1st: 151.40 } 
            }
        };

        let selectedTariff = { class2nd: 85.00, class1st: 145.00 }; 
        if (sbbBaseTariffs[originKey] && sbbBaseTariffs[originKey][destKey]) {
            selectedTariff = sbbBaseTariffs[originKey][destKey];
        }

        // Apply SwissPass Reduction Modifiers (GA = Free, Half-Fare = 50%, Full Price = 100%)
        let discountModifier = 1.0;
        if (swissPassMode === "HalfFare") discountModifier = 0.5;
        if (swissPassMode === "GA") discountModifier = 0.0;

        // Compute total values scaling across traveler group volume metrics
        let totalRail2nd = selectedTariff.class2nd * discountModifier * travelers;
        let totalRail1st = selectedTariff.class1st * discountModifier * travelers;

        // --- STEP D: ADDITIONAL ASSET PACKAGING ---
        let liftBaseEach = 82.00;
        let liftTicketStatusText = passSystem !== "None" ? `${passSystem} Card Active Holder` : `CHF ${(liftBaseEach * travelers).toFixed(2)} Total Access Fee`;

        let hotels = baseLodgingRegistry[destKey] || baseLodgingRegistry["Andermatt"];
        let calculatedHotels = hotels.map(h => ({
            name: h.name, feature: h.feature, img: h.img, price: (h.price * travelers).toFixed(2)
        }));

        let safetyScore = wind > 25 ? 2 : (wind > 15 ? 4 : 5);

        // --- STEP E: OFFICIAL DEEP-LINK DEPLOYMENT ROUTER ---
        const encodedFrom = encodeURIComponent(stationMappers[originKey]);
        const encodedTo = encodeURIComponent(stationMappers[destKey]);
        const sbbBookingUrl = `https://www.sbb.ch/en?von=${encodedFrom}&nach=${encodedTo}&date=%22${dateVal}%22&time=%22${timeVal}%22`;

        return res.json({
            success: true,
            telemetry: { temp, wind, score: safetyScore },
            railTariffs: { cost2nd: totalRail2nd, cost1st: totalRail1st, legs: routeLegs },
            resortPass: { statusText: liftTicketStatusText },
            lodging: calculatedHotels,
            liveRouteConfirmed,
            sbbBookingUrl
        });
    } catch (err) {
        console.error("Critical server runtime engine fault:", err);
        res.status(500).json({ success: false, error: "Internal Computing Core Error" });
    }
});

// Boot listening ports
app.listen(PORT, () => console.log(`AlpenSync Master Engine fully operational on port ${PORT}`));
