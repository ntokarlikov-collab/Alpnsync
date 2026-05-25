const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
// Hosts your website from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

const destinationCoordinates = {
    "Zermatt": { lat: 46.0207, lon: 7.7491 }, "Andermatt": { lat: 46.6348, lon: 8.5947 },
    "Verbier": { lat: 46.0961, lon: 7.2286 }, "Grindelwald": { lat: 46.6242, lon: 8.0414 }
};

const stationMappers = {
    "Lausanne": "Lausanne", "Zurich": "Zürich HB", "Geneva": "Genève",
    "Zermatt": "Zermatt", "Andermatt": "Andermatt", "Verbier": "Verbier, station", "Grindelwald": "Grindelwald"
};

app.post('/api/compute-expedition', async (req, res) => {
    try {
        const { originKey, destKey, dateVal, timeVal, travelers } = req.body;
        const coords = destinationCoordinates[destKey] || destinationCoordinates["Andermatt"];
        
        let temp = 12.0, wind = 14.0;
        try {
            const meteoRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,wind_speed_10m&wind_speed_unit=kmh`);
            const meteoData = await meteoRes.json();
            if(meteoData?.current) {
                temp = meteoData.current.temperature_2m;
                wind = meteoData.current.wind_speed_10m;
            }
        } catch (e) { console.log("Meteo fallback active"); }

        let liveRouteConfirmed = false;
        try {
            const transitUrl = `https://transport.opendata.ch/v1/connections?from=${encodeURIComponent(stationMappers[originKey])}&to=${encodeURIComponent(stationMappers[destKey])}&date=${dateVal}&time=${encodeURIComponent(timeVal)}&limit=1`;
            const sbbRes = await fetch(transitUrl);
            const sbbData = await sbbRes.json();
            if (sbbData?.connections?.length > 0) liveRouteConfirmed = true;
        } catch(e) { console.log("SBB fallback active"); }

        let basePrice = (originKey === "Lausanne" && destKey === "Andermatt") ? 84.00 : 63.00;
        
        return res.json({
            success: true,
            telemetry: { temp, wind, score: wind > 22 ? 4 : 5 },
            railTariffs: { basePrice, total: basePrice * travelers },
            liveRouteConfirmed
        });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

app.listen(PORT, () => console.log(`AlpenSync Engine running on port ${PORT}`));
