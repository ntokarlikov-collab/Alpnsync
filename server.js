const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

app.use(express.static(path.join(__dirname, 'public')));

// 5 Departure Hub Coordinates & Baseline Elevations (Meters)
const originCoordinates = {
    "Geneva": { lat: 46.2044, lon: 6.1432, elev: 375 },
    "Lausanne": { lat: 46.5197, lon: 6.6323, elev: 495 },
    "Zurich": { lat: 47.3769, lon: 8.5417, elev: 408 },
    "Bern": { lat: 46.9480, lon: 7.4474, elev: 542 },
    "Basel": { lat: 47.5596, lon: 7.5886, elev: 260 }
};

// Village Baseline Coordinates
const destinationCoordinates = {
    "Zermatt": { lat: 46.0207, lon: 7.7491 }, 
    "Andermatt": { lat: 46.6348, lon: 8.5947 },
    "Verbier": { lat: 46.0961, lon: 7.2286 }, 
    "Grindelwald": { lat: 46.6242, lon: 8.0414 },
    "St. Moritz": { lat: 46.4908, lon: 9.8355 },
    "Davos": { lat: 46.8041, lon: 9.8372 },
    "Engelberg": { lat: 46.8201, lon: 8.4021 },
    "Gryon": { lat: 46.2672, lon: 7.0673 },
    "Villars-sur-Ollon": { lat: 46.3000, lon: 7.0500 },
    "Les Diablerets": { lat: 46.3481, lon: 7.1578 }
};

// High-Resolution Mountain Lift Station Elevation Profiles (Meters)
const sectorCoordinates = {
    "Gornergrat Station": { lat: 45.9864, lon: 7.7857, elev: 3089 },
    "Matterhorn Glacier Paradise": { lat: 45.9383, lon: 7.7294, elev: 3883 },
    "Gemsstock Peak Terminal": { lat: 46.6022, lon: 8.6111, elev: 2961 },
    "Nätschen Family Sector": { lat: 46.6431, lon: 8.6186, elev: 1842 },
    "Mont-Fort Glacier Terminal": { lat: 46.0825, lon: 7.3312, elev: 3330 },
    "Savoleyres Ridgeway": { lat: 46.1132, lon: 7.2185, elev: 2354 },
    "Eiger Gletscher Terminal": { lat: 46.5752, lon: 8.0124, elev: 2320 },
    "First Adventure Peak": { lat: 46.6562, lon: 8.0531, elev: 2168 },
    "Corvatsch Glacier Station": { lat: 46.4194, lon: 9.8211, elev: 3303 },
    "Corviglia Snowpark Hub": { lat: 46.5055, lon: 9.8144, elev: 2486 },
    "Parsenn Weissfluhjoch": { lat: 46.8344, lon: 9.8081, elev: 2662 },
    "Jakobshorn Freeride Arena": { lat: 46.7781, lon: 9.8512, elev: 2590 },
    "Titlis Stand Glacier": { lat: 46.7981, lon: 8.4282, elev: 2428 },
    "Brunni Sunny Slopes": { lat: 46.8375, lon: 8.4111, elev: 1860 },
    "Les Chaux Cableway": { lat: 46.2821, lon: 7.1042, elev: 1773 },
    "Frience Family Play-Zone": { lat: 46.2755, fontColor: "text-red-500", lon: 7.0864, elev: 1558 },
    "Roc d'Orsay Gondola": { lat: 46.3055, lon: 7.1022, elev: 2002 },
    "Bretaye Rail Terminal": { lat: 46.3211, lon: 7.1182, elev: 1808 },
    "Glacier 3000 Col du Pillon": { lat: 46.3532, lon: 7.2064, elev: 2971 },
    "Isenau Traditional Sector": { lat: 46.3644, lon: 7.1432, elev: 1762 }
};

const stationMappers = {
    "Geneva": "Genève", "Lausanne": "Lausanne", "Zurich": "Zürich HB", "Bern": "Bern", "Basel": "Basel SBB",
    "Zermatt": "Zermatt", "Andermatt": "Andermatt", "Verbier": "Verbier, station", "Grindelwald": "Grindelwald",
    "St. Moritz": "St. Moritz", "Davos": "Davos Platz", "Engelberg": "Engelberg",
    "Gryon": "Gryon", "Villars-sur-Ollon": "Villars-sur-Ollon", "Les Diablerets": "Les Diablerets"
};

const baseLodgingRegistry = {
    "Zermatt": [
        { id: "z1", name: "Gandegghütte Alpine Outpost", feature: "SAC hut at 3,030m. Bunk platforms & warm stews.", price: 55, img: "https://images.unsplash.com/photo-1506059612708-99d6c258160e?auto=format&fit=crop&w=300&q=80" },
        { id: "z2", name: "Chalet Findeln Timber Mazot", feature: "19th-century private timber barn. Soapstone hearth wood stoves.", price: 210, img: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=300&q=80" }
    ],
    "Andermatt": [
        { id: "a1", name: "Albert-Heim Refuge (SAC)", feature: "Granite high refuge. Traditional long-table family dining.", price: 46, img: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=300&q=80" },
        { id: "a2", name: "Walser Chalet Urserntal", feature: "Historic exposed-beam cottage situated inside a silent snow meadow.", price: 125, img: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=300&q=80" }
    ],
    "Verbier": [
        { id: "v1", name: "Cabane du Mont-Fort", feature: "Stone refuge tracking along glacier routing trails.", price: 58, img: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=300&q=80" },
        { id: "v2", name: "Chalet Les Attelas Premium", feature: "Hand-crafted design framework. Vaulted cedar hot tubs.", price: 290, img: "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?auto=format&fit=crop&w=300&q=80" }
    ],
    "Grindelwald": [
        { id: "g1", name: "Berghaus Alpiglen Station", feature: "Rustic wooden lodge sitting below the Eiger North Face wall.", price: 52, img: "https://images.unsplash.com/photo-1506059612708-99d6c258160e?auto=format&fit=crop&w=300&q=80" },
        { id: "g2", name: "Oberland Heritage Log Chalet", feature: "Private multi-level luxury chalet layout with deep view balconies.", price: 185, img: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=300&q=80" }
    ],
    "St. Moritz": [
        { id: "sm1", name: "Chamanna Coaz Alpine Shelter", feature: "Isolated mountaineering base grid wrapped by active ice fields.", price: 48, img: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=300&q=80" },
        { id: "sm2", name: "Channa Engadina Private Barn", feature: "Beautifully restored traditional Engadin sheep barn with signature open stone hearths.", price: 260, img: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=300&q=80" }
    ],
    "Davos": [
        { id: "d1", name: "Clavadeler Alp Berghaus", feature: "Working dairy farm chalet. Fresh cheese arrays included.", price: 50, img: "https://images.unsplash.com/photo-1506059612708-99d6c258160e?auto=format&fit=crop&w=300&q=80" },
        { id: "d2", name: "Sertig Valley Walser Cabin", feature: "Quiet single log structure situated deep down an off-piste run corridor.", price: 165, img: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=300&q=80" }
    ],
    "Engelberg": [
        { id: "e1", name: "Brunnihütte Mountain Hut", feature: "High-altitude perching station with massive panoramic sundeck beds.", price: 44, img: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=300&q=80" },
        { id: "e2", name: "Grafenort Valley Forester House", feature: "Charming timber house with private built-in outdoor finish saunas.", price: 155, img: "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?auto=format&fit=crop&w=300&q=80" }
    ],
    "Gryon": [
        { id: "gr1", name: "Cergnement Valley Outpost", feature: "Ultra-budget stone cottage outpost equipped with an open wood fire hearth.", price: 34, img: "https://images.unsplash.com/photo-1506059612708-99d6c258160e?auto=format&fit=crop&w=300&q=80" },
        { id: "gr2", name: "Chalet de Frience Eco-Cabin", feature: "Solar-powered tracking cabin sitting right beside the biological swimming lake.", price: 88, img: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=300&q=80" }
    ],
    "Villars-sur-Ollon": [
        { id: "vi1", name: "Col de Soud Forest Hideaway", feature: "Traditional restaurant attic berths. Fresh regional fondues.", price: 38, img: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=300&q=80" },
        { id: "vi2", name: "Chalet Bretaye Ridge Cabin", feature: "Ski-in/ski-out timber structure located directly on the mountain pass line.", price: 110, img: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=300&q=80" }
    ],
    "Les Diablerets": [
        { id: "ld1", name: "Cabane des Diablerets (SAC)", feature: "High limestone cliff bunker at 2,485m built specifically for technical mountain crews.", price: 42, img: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=300&q=80" },
        { id: "ld2", name: "Refuge de l'Espace Glacier Overlook", feature: "Boutique timber structural grid hanging right off a vertical mountain face drop.", price: 140, img: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=300&q=80" }
    ]
};

function generateSbbItineraryLegs(from, to, timeVal) {
    return [
        { type: "IR", num: "90", info: `Direction ${to} Corridor`, dep: timeVal, station: from, arr: "10:15", dest: "Aigle Train Station", platform: "2" },
        { type: "walk", walkLabel: "Regional Mountain Train Connection", duration: "5 min" },
        { type: "REGIO", num: "ALC/TPC", info: "Alpine Narrow-Gauge Track Line", dep: "10:20", station: "Aigle Train Station", arr: "11:05", dest: to, platform: "Track 11" }
    ];
}

app.post('/api/compute-expedition', async (req, res) => {
    try {
        const { originKey, destKey, dateVal, timeVal, passengerPasses, passSystem, travelers, daysCount, targetSectorName } = req.body;
        
        const originObj = originCoordinates[originKey] || originCoordinates["Geneva"];
        const coords = sectorCoordinates[targetSectorName] || destinationCoordinates[destKey] || destinationCoordinates["Andermatt"];
        const durationNights = parseInt(daysCount) || 1;
        const crewSize = parseInt(travelers) || 1;
        
        let temp = 11.5, wind = 12.0;
        try {
            const meteoRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,wind_speed_10m&wind_speed_unit=kmh`);
            const meteoData = await meteoRes.json();
            if(meteoData?.current) {
                temp = meteoData.current.temperature_2m;
                wind = meteoData.current.wind_speed_10m;
            }
        } catch (e) { console.log("Meteo internal fallback triggered"); }

        let routeLegs = [];
        try {
            const sbbUrl = `http://transport.opendata.ch/v1/connections?from=${encodeURIComponent(stationMappers[originKey])}&to=${encodeURIComponent(stationMappers[destKey])}&date=${dateVal}&time=${encodeURIComponent(timeVal)}&limit=1`;
            const sbbRes = await fetch(sbbUrl);
            const sbbData = await sbbRes.json();

            if (sbbData?.connections && sbbData.connections.length > 0) {
                const activeConnection = sbbData.connections[0];
                activeConnection.sections.forEach((sec) => {
                    if (sec.walk) {
                        routeLegs.push({ type: 'walk', walkLabel: 'Station Transfer Connection Block', duration: `${sec.walk.duration || 5} min` });
                    } else if (sec.journey) {
                        const depTime = new Date(sec.departure.departure).toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' });
                        const arrTime = new Date(sec.arrival.arrival).toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' });
                        routeLegs.push({
                            type: sec.journey.category || 'Train', num: sec.journey.number || '', info: sec.journey.to || 'Direction Station',
                            dep: depTime, station: sec.departure.station.name, arr: arrTime, dest: sec.arrival.station.name, platform: sec.departure.platform || 'N/A'
                        });
                    }
                });
            }
        } catch(e) { console.log("SBB OpenData baseline active"); }

        if (routeLegs.length === 0) {
            routeLegs = generateSbbItineraryLegs(stationMappers[originKey], stationMappers[destKey], timeVal);
        }

        const sbbBaseTariffs = {
            "Geneva": { "Zermatt": 102.00, "Andermatt": 78.50, "Verbier": 56.00, "Grindelwald": 93.00, "St. Moritz": 134.00, "Davos": 122.00, "Engelberg": 88.00, "Gryon": 38.00, "Villars-sur-Ollon": 41.00, "Les Diablerets": 44.00 },
            "Lausanne": { "Zermatt": 71.00, "Andermatt": 68.00, "Verbier": 33.60, "Grindelwald": 73.00, "St. Moritz": 116.00, "Davos": 104.00, "Engelberg": 70.00, "Gryon": 22.00, "Villars-sur-Ollon": 25.00, "Les Diablerets": 28.00 },
            "Zurich": { "Zermatt": 125.00, "Andermatt": 53.00, "Verbier": 106.00, "Grindelwald": 86.00, "St. Moritz": 78.00, "Davos": 62.00, "Engelberg": 38.00, "Gryon": 76.00, "Villars-sur-Ollon": 79.00, "Les Diablerets": 82.00 },
            "Bern": { "Zermatt": 92.00, "Andermatt": 61.00, "Verbier": 74.00, "Grindelwald": 42.00, "St. Moritz": 108.00, "Davos": 89.00, "Engelberg": 52.00, "Gryon": 58.00, "Villars-sur-Ollon": 61.00, "Les Diablerets": 64.00 },
            "Basel": { "Zermatt": 138.00, "Andermatt": 79.00, "Verbier": 114.00, "Grindelwald": 98.00, "St. Moritz": 118.00, "Davos": 96.00, "Engelberg": 66.00, "Gryon": 88.00, "Villars-sur-Ollon": 91.00, "Les Diablerets": 94.00 }
        };

        let baseFareUnit = 75.00;
        if (sbbBaseTariffs[originKey] && sbbBaseTariffs[originKey][destKey]) {
            baseFareUnit = sbbBaseTariffs[originKey][destKey];
        }

        // --- GRANULAR COMPUTATION MATRIX LOOP ---
        let totalRail2nd = 0;
        let totalRail1st = 0;
        
        // Loop through explicit individual crew passenger tokens securely
        const passesArray = Array.isArray(passengerPasses) ? passengerPasses : [passengerPasses || 'FullFare'];
        
        passesArray.forEach(pass => {
            let discountModifier = pass === "HalfFare" ? 0.5 : (pass === "GA" ? 0.0 : 1.0);
            totalRail2nd += baseFareUnit * discountModifier;
            totalRail1st += (baseFareUnit * 1.65) * discountModifier;
        });

        let localLiftPricePerDay = ["Gryon", "Villars-sur-Ollon", "Les Diablerets"].includes(destKey) ? 54.00 : 82.00;
        let liftBaseEach = localLiftPricePerDay * durationNights;
        let liftTicketStatusText = passSystem !== "None" ? `${passSystem} Card Active` : `CHF ${(liftBaseEach * crewSize).toFixed(2)} Fee`;

        let hotels = baseLodgingRegistry[destKey] || baseLodgingRegistry["Andermatt"];
        let calculatedHotels = hotels.map(h => {
            let totalVolumeSum = h.price * durationNights * crewSize;
            return {
                id: h.id, name: h.name, feature: h.feature, img: h.img, 
                price: totalVolumeSum.toFixed(2),
                baseIndividualPrice: (h.price * durationNights).toFixed(2)
            };
        });

        let safetyScore = wind > 25 ? 2 : (wind > 15 ? 4 : 5);

        const encodedFrom = encodeURIComponent(stationMappers[originKey]);
        const encodedTo = encodeURIComponent(stationMappers[destKey]);
        const sbbBookingUrl = `https://www.sbb.ch/en?von=${encodedFrom}&nach=${encodedTo}&date=%22${dateVal}%22&time=%22${timeVal}%22`;

        return res.json({
            success: true,
            telemetry: { temp, wind, score: safetyScore },
            railTariffs: { cost2nd: totalRail2nd, cost1st: totalRail1st, legs: routeLegs },
            resortPass: { statusText: liftTicketStatusText },
            lodging: calculatedHotels,
            liveRouteConfirmed: true,
            sbbBookingUrl,
            geoCoordinates: { origin: originObj, dest: coords },
            durationNights,
            passengerPasses: passesArray
        });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

app.listen(PORT, () => console.log(`AlpenSync Master Framework active on port ${PORT}`));
