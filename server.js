const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// 1. OPEN SECURITY PORT PASSPORTS (CORS)
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

// Serve frontend layout assets from public folder
app.use(express.static(path.join(__dirname, 'public')));

// Alpine Coordinates Database
const destinationCoordinates = {
    "Zermatt": { lat: 46.0207, lon: 7.7491 }, 
    "Andermatt": { lat: 46.6348, lon: 8.5947 },
    "Verbier": { lat: 46.0961, lon: 7.2286 }, 
    "Grindelwald": { lat: 46.6242, lon: 8.0414 }
};

// SBB Timetable Station String Database
const stationMappers = {
    "Lausanne": "Lausanne", 
    "Zurich": "Zürich HB", 
    "Geneva": "Genève",
    "Zermatt": "Zermatt", 
    "Andermatt": "Andermatt", 
    "Verbier": "Verbier, station", 
    "Grindelwald": "Grindelwald"
};

// Mock Lodging Database
const baseLodgingRegistry = {
    "Andermatt": [{ name: "Andermatt Basecamp Hostel", feature: "Central mountain baseline staging access points", price: 48, img: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=300&q=80" }],
    "Zermatt": [{ name: "Zermatt Youth Hostel", feature: "Ski basement lockers, close to rail station hubs", price: 55, img: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=300&q=80" }],
    "Verbier": [{ name: "MAP Verbier Lodge", feature: "Direct walk to Médran lift terminal", price: 68, img: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=300&q=80" }],
    "Grindelwald": [{ name: "Downtown Lodge Grindelwald", feature: "Risk briefing assembly spaces", price: 52, img: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=300&q=80" }]
};

// Mock SBB Route Engine Breakdown Generator
function generateSbbItineraryLegs(from, to, timeVal) {
    return [
        { type: "train", num: "IR 95", info: "Direction Brig // Fleet 1. 2.", dep: timeVal, station: from, arr: "10:02", dest: "Brig", platform: "4" },
        { type: "walk", walkLabel: "Walking Route Transfer to Brig micro platform sectors", duration: "7 min" },
        { type: "train", num: "PE", info: "GLACIER EXPRESS // Line Connection Axis", dep: "10:14", station: "Brig Bahnhofplatz", arr: "11:46", dest: to, platform: "12" }
    ];
}

// 2. PRODUCTION API COMPUTE ENDPOINT ROUTER
app.post('/api/compute-expedition', async (req, res) => {
    try {
        const { originKey, destKey, dateVal, timeVal, swissPassMode, passSystem, targetSectorName, travelers } = req.body;
        const coords = destinationCoordinates[destKey] || destinationCoordinates["Andermatt"];
        
        // Fetch Live Meteo Data
        let temp = 12.0, wind = 14.0;
        try {
            const meteoRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,wind_speed_10m&wind_speed_unit=kmh`);
            const meteoData = await meteoRes.json();
            if(meteoData?.current) {
                temp = meteoData.current.temperature_2m;
                wind = meteoData.current.wind_speed_10m;
            }
        } catch (e) { console.log("Meteo telemetry fallback active"); }

        // Fetch Live SBB Connection Validation
        let liveRouteConfirmed = false;
        try {
            const transitUrl = `https://transport.opendata.ch/v1/connections?from=${encodeURIComponent(stationMappers[originKey])}&to=${encodeURIComponent(stationMappers[destKey])}&date=${dateVal}&time=${encodeURIComponent(timeVal)}&limit=1`;
            const sbbRes = await fetch(transitUrl);
            const sbbData = await sbbRes.json();
            if (sbbData?.connections?.length > 0) liveRouteConfirmed = true;
        } catch(e) { console.log("SBB data connection fallback active"); }

        // Core Financial Business Calculations
        let railBaseEach = (originKey === "Lausanne" && destKey === "Andermatt") ? 84.00 : 63.00;
        let discountModifier = swissPassMode === "HalfFare" ? 0.5 : (swissPassMode === "GA" ? 0.0 : 1.0);
        let totalRail2nd = railBaseEach * discountModifier * travelers;
        let totalRail1st = totalRail2nd * 1.6;

        let liftBaseEach = 82.00;
        let liftTicketStatusText = passSystem !== "None" ? `${passSystem} Subscription Active Holder` : `CHF ${(liftBaseEach * travelers).toFixed(2)} Total Access Tariff`;

        // Map Accommodations
        let hotels = baseLodgingRegistry[destKey] || baseLodgingRegistry["Andermatt"];
        let calculatedHotels = hotels.map(h => ({
            name: h.name,
            feature: h.feature,
            img: h.img,
            price: (h.price * travelers).toFixed(2)
        }));

        // Generate SBB Timeline Leg Objects
        let routeLegs = generateSbbItineraryLegs(stationMappers[originKey], stationMappers[destKey], timeVal);

        return res.json({
            success: true,
            telemetry: { temp, wind, score: wind > 22 ? 3 : 5 },
            railTariffs: { cost2nd: totalRail2nd, cost1st: totalRail1st, legs: routeLegs },
            resortPass: { statusText: liftTicketStatusText },
            lodging: calculatedHotels,
            liveRouteConfirmed
        });
    } catch (err) {
        console.error("Critical Runtime Engine Defect:", err);
        res.status(500).json({ success: false, error: "Internal Computing Error" });
    }
});

// Start Cloud Container Port Hook Listener
app.listen(PORT, () => console.log(`AlpenSync Engine running on port ${PORT}`));
