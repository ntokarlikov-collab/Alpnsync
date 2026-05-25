const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Open Cross-Origin Access Port Passports For Frontend Integrations
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

// Serve frontend layout assets from public folder
app.use(express.static(path.join(__dirname, 'public')));

// Precise Alpine Coordinates Database
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

const baseLodgingRegistry = {
    "Andermatt": [{ name: "Andermatt Basecamp Hostel", feature: "Central mountain baseline staging access points", price: 48, img: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=300&q=80" }],
    "Zermatt": [{ name: "Zermatt Youth Hostel", feature: "Ski basement lockers, close to rail station hubs", price: 55, img: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=300&q=80" }],
    "Verbier": [{ name: "MAP Verbier Lodge", feature: "Direct walk to Médran lift terminal", price: 68, img: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=300&q=80" }],
    "Grindelwald": [{ name: "Downtown Lodge Grindelwald", feature: "Risk briefing assembly spaces", price: 52, img: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=300&q=80" }]
};

// LIVE API ENDPOINT ROUTER
app.post('/api/compute-expedition', async (req, res) => {
    try {
        const { originKey, destKey, dateVal, timeVal, swissPassMode, passSystem, targetSectorName, travelers } = req.body;
        const coords = destinationCoordinates[destKey] || destinationCoordinates["Andermatt"];
        
        // 1. LIVE METEO API INTEGRATION
        let temp = 12.0, wind = 14.0;
        try {
            const meteoRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,wind_speed_10m&wind_speed_unit=kmh`);
            const meteoData = await meteoRes.json();
            if(meteoData?.current) {
                temp = meteoData.current.temperature_2m;
                wind = meteoData.current.wind_speed_10m;
            }
        } catch (e) { console.log("Meteo fallback active"); }

        // 2. LIVE SBB TRANSPORT API DATA HARVESTER
        let routeLegs = [];
        let liveRouteConfirmed = false;
        try {
            const sbbUrl = `http://transport.opendata.ch/v1/connections?from=${encodeURIComponent(stationMappers[originKey])}&to=${encodeURIComponent(stationMappers[destKey])}&date=${dateVal}&time=${encodeURIComponent(timeVal)}&limit=1`;
            const sbbRes = await fetch(sbbUrl);
            const sbbData = await sbbRes.json();

            if (sbbData?.connections && sbbData.connections.length > 0) {
                liveRouteConfirmed = true;
                const activeConnection = sbbData.connections[0];

                // Map real SBB journey sections dynamically 
                activeConnection.sections.forEach((sec) => {
                    if (sec.walk) {
                        routeLegs.push({
                            type: 'walk',
                            walkLabel: 'Station Transfer / Footpath Connection',
                            duration: `${sec.walk.duration || 5} min`
                        });
                    } else if (sec.journey) {
                        const depTime = new Date(sec.departure.departure).toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' });
                        const arrTime = new Date(sec.arrival.arrival).toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' });
                        routeLegs.push({
                            type: sec.journey.category || 'Train',
                            num: sec.journey.number || '',
                            info: sec.journey.to || 'Direction Hub',
                            dep: depTime,
                            station: sec.departure.station.name,
                            arr: arrTime,
                            dest: sec.arrival.station.name,
                            platform: sec.departure.platform || 'N/A'
                        });
                    }
                });
            }
        } catch(e) { 
            console.log("SBB API error, loading system fallback layout patterns");
        }

        // Fallback layout generators if SBB API undergoes downtime limits
        if (routeLegs.length === 0) {
            routeLegs = [
                { type: "IR 95", num: "Regional", info: "Direction Interlaken/Brig", dep: timeVal, station: stationMappers[originKey], arr: "10:05", dest: "Interchange Hub", platform: "3" },
                { type: "Regio", num: "Alpine", info: "Resort Regional Shuttle Line", dep: "10:15", station: "Interchange Hub", arr: "11:30", dest: stationMappers[destKey], platform: "1" }
            ];
        }

        // Dynamic pricing calculator systems
        let railBaseEach = (originKey === "Lausanne" && destKey === "Andermatt") ? 84.00 : 63.00;
        let discountModifier = swissPassMode === "HalfFare" ? 0.5 : (swissPassMode === "GA" ? 0.0 : 1.0);
        let totalRail2nd = railBaseEach * discountModifier * travelers;
        let totalRail1st = totalRail2nd * 1.6;

        let liftBaseEach = 82.00;
        let liftTicketStatusText = passSystem !== "None" ? `${passSystem} Subscription Card Applied` : `CHF ${(liftBaseEach * travelers).toFixed(2)} Total Lift Access Fee`;

        let hotels = baseLodgingRegistry[destKey] || baseLodgingRegistry["Andermatt"];
        let calculatedHotels = hotels.map(h => ({
            name: h.name, feature: h.feature, img: h.img, price: (h.price * travelers).toFixed(2)
        }));

        // Dynamic Safety Index evaluation based on live wind telemetry loops
        let safetyScore = wind > 30 ? 2 : (wind > 15 ? 4 : 5);

        return res.json({
            success: true,
            telemetry: { temp, wind, score: safetyScore },
            railTariffs: { cost2nd: totalRail2nd, cost1st: totalRail1st, legs: routeLegs },
            resortPass: { statusText: liftTicketStatusText },
            lodging: calculatedHotels,
            liveRouteConfirmed
        });
    } catch (err) {
        res.status(500).json({ success: false, error: "Calculation Pipeline Error" });
    }
});

app.listen(PORT, () => console.log(`AlpenSync Dynamic Live Engine running on port ${PORT}`));
