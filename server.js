const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const pkg = require('./package.json');

const app = express();
const PORT = process.env.PORT || 3000;
const STARTED_AT = Date.now();
const INDEX_HTML = path.join(__dirname, 'index.html');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Local Databases / Registries
const DESTINATIONS = {
    'zermatt': {
        name: 'Zermatt', lat: 46.0207, lon: 7.7491, baseTariff: 45, region: 'Valais',
        facts: { village: 1620, topLift: 3883, pistesKm: 360, signature: 'Matterhorn Glacier Paradise' }
    },
    'verbier': {
        name: 'Verbier', lat: 46.0961, lon: 7.2286, baseTariff: 42, region: 'Valais',
        facts: { village: 1500, topLift: 3330, pistesKm: 410, signature: 'Mont Fort · 4 Vallées' }
    },
    'grindelwald': {
        name: 'Grindelwald', lat: 46.6242, lon: 8.0414, baseTariff: 48, region: 'Bernese Oberland',
        facts: { village: 1034, topLift: 2500, pistesKm: 211, signature: 'Eiger North Face views' }
    },
    'stmoritz': {
        name: 'St. Moritz', lat: 46.4908, lon: 9.8355, baseTariff: 52, region: 'Graubünden',
        facts: { village: 1822, topLift: 3303, pistesKm: 350, signature: 'Corvatsch · Engadin valley' }
    },
    'chamonix': {
        name: 'Chamonix (Cross-Border)', lat: 45.9227, lon: 6.8685, baseTariff: 55, region: 'Haute-Savoie',
        facts: { village: 1035, topLift: 3842, pistesKm: 155, signature: 'Aiguille du Midi · Mont Blanc' }
    }
};

const ORIGINS = {
    'geneva': { name: 'Geneva Airport / Cornavin', baseRailPrice: 40 },
    'zurich': { name: 'Zürich HB', baseRailPrice: 50 },
    'lausanne': { name: 'Lausanne', baseRailPrice: 28 },
    'basel': { name: 'Basel SBB', baseRailPrice: 45 }
};

// SwissPass Matrix: fraction of the standard fare actually paid
const PASS_PROFILES = {
    'none': { label: 'Standard Fare', modifier: 1.0 },
    'halbtax': { label: 'Half-Fare Card (Halbtax)', modifier: 0.5 },
    'generalabonnement': { label: 'GA Travelcard', modifier: 0.0 },
    'swiss-travel-pass': { label: 'Swiss Travel Pass', modifier: 0.15 }
};

// WMO weather interpretation codes (Open-Meteo `weathercode`)
const WMO_CONDITIONS = {
    0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
    45: 'Fog', 48: 'Depositing rime fog',
    51: 'Light drizzle', 53: 'Drizzle', 55: 'Dense drizzle',
    56: 'Freezing drizzle', 57: 'Dense freezing drizzle',
    61: 'Light rain', 63: 'Rain', 65: 'Heavy rain',
    66: 'Freezing rain', 67: 'Heavy freezing rain',
    71: 'Light snowfall', 73: 'Snowfall', 75: 'Heavy snowfall', 77: 'Snow grains',
    80: 'Light rain showers', 81: 'Rain showers', 82: 'Violent rain showers',
    85: 'Light snow showers', 86: 'Heavy snow showers',
    95: 'Thunderstorm', 96: 'Thunderstorm with hail', 99: 'Thunderstorm with heavy hail'
};

const roundCHF = (value) => Math.round(value * 100) / 100;

// Balances within half a rappen of zero are considered settled — strict
// equality misses them after repeated float arithmetic.
const SETTLED_EPSILON = 0.005;

// Open-Meteo responses are cached per destination so rapid sector-switching
// in the UI doesn't hammer the upstream API.
const WEATHER_TTL_MS = 5 * 60 * 1000;
const weatherCache = new Map();

const sumRange = (values, start, count) =>
    (values || []).slice(start, start + count).reduce((sum, v) => sum + (v || 0), 0);

// Pick the most promising day in the outlook window: clearest skies first,
// warmth as the tiebreaker.
function pickBestDay(outlook) {
    if (!outlook.length) return null;
    let bestIndex = 0;
    let bestScore = -Infinity;
    outlook.forEach((day, i) => {
        const score = -(day.precipitationMm || 0) * 2 + (day.tempMax || 0) * 0.3;
        if (score > bestScore) {
            bestScore = score;
            bestIndex = i;
        }
    });
    return {
        date: outlook[bestIndex].date,
        reason: (outlook[bestIndex].precipitationMm || 0) < 1
            ? 'clearest skies in the window'
            : 'driest day in the window'
    };
}

// --- API ROUTES ---

// 0. Engine Health Probe
app.get('/api/health', (req, res) => {
    res.json({
        status: 'operational',
        engine: 'AlpenSync OS',
        version: pkg.version,
        uptimeSeconds: Math.round((Date.now() - STARTED_AT) / 1000)
    });
});

// 1. Weather Telemetry Endpoint (Open-Meteo Integration)
app.get('/api/weather', async (req, res) => {
    const { destination } = req.query;
    const key = destination?.toLowerCase();
    const loc = DESTINATIONS[key];

    if (!loc) {
        return res.status(404).json({ error: 'Destination not supported in AlpenSync registries.' });
    }

    const cached = weatherCache.get(key);
    if (cached && Date.now() - cached.fetchedAt < WEATHER_TTL_MS) {
        return res.json({
            ...cached.payload,
            cacheAgeSeconds: Math.round((Date.now() - cached.fetchedAt) / 1000)
        });
    }

    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}` +
            `&current_weather=true` +
            `&hourly=temperature_2m,snowfall,precipitation,weathercode` +
            `&daily=temperature_2m_max,temperature_2m_min,snowfall_sum,precipitation_sum,weathercode` +
            `&forecast_days=3&timezone=Europe/Berlin`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Open-Meteo responded with ${response.status}`);
        }
        const data = await response.json();

        if (!data.current_weather) {
            throw new Error('Telemetry payload missing current_weather block');
        }

        // Forecast accumulations for the 12 hours following the current reading
        const nowIndex = data.hourly?.time
            ? data.hourly.time.findIndex(t => t >= data.current_weather.time)
            : -1;
        const snowfallNext12h = nowIndex === -1 ? null : roundCHF(sumRange(data.hourly.snowfall, nowIndex, 12));
        const precipitationNext12h = nowIndex === -1 ? null : roundCHF(sumRange(data.hourly.precipitation, nowIndex, 12));

        const outlook = (data.daily?.time || []).map((date, i) => ({
            date,
            condition: WMO_CONDITIONS[data.daily.weathercode?.[i]] || 'Unknown',
            weathercode: data.daily.weathercode?.[i],
            tempMax: data.daily.temperature_2m_max?.[i],
            tempMin: data.daily.temperature_2m_min?.[i],
            snowfallCm: data.daily.snowfall_sum?.[i],
            precipitationMm: data.daily.precipitation_sum?.[i]
        }));

        const payload = {
            destination: loc.name,
            region: loc.region,
            facts: loc.facts,
            current: {
                ...data.current_weather,
                condition: WMO_CONDITIONS[data.current_weather.weathercode] || 'Unknown'
            },
            snowfallNext12h,
            precipitationNext12h,
            outlook,
            bestDay: pickBestDay(outlook),
            stationElevation: Math.round(data.elevation),
            elevation_telemetry: `Station grid at ${Math.round(data.elevation)}m a.s.l. — FADP Compliant Data`
        };

        weatherCache.set(key, { fetchedAt: Date.now(), payload });
        res.json({ ...payload, cacheAgeSeconds: 0 });
    } catch (error) {
        res.status(502).json({ error: 'Failed to stream alpine telemetry.' });
    }
});

// 2. SBB Rail & Tariff Matrix Engine
app.post('/api/tariff/calculate', (req, res) => {
    const { origin, destination, passType, groupSize } = req.body;

    const fromLoc = ORIGINS[origin?.toLowerCase()];
    const toLoc = DESTINATIONS[destination?.toLowerCase()];
    const size = Math.max(1, parseInt(groupSize) || 1);

    if (!fromLoc || !toLoc) {
        return res.status(400).json({ error: 'Invalid departure hub or mountain sector.' });
    }

    const pass = PASS_PROFILES[passType] || PASS_PROFILES['none'];

    // Base calculation
    const standardTicket = fromLoc.baseRailPrice + toLoc.baseTariff;
    let discountModifier = pass.modifier;

    // Group discounts (SBB corporate / Youth group mechanics)
    const groupDiscountApplied = size >= 10;
    if (groupDiscountApplied) {
        discountModifier *= 0.70; // 30% group rate deduction
    }

    const pricePerPerson = roundCHF(standardTicket * discountModifier);
    const totalGroupCost = roundCHF(pricePerPerson * size);

    res.json({
        route: `${fromLoc.name} ➔ ${toLoc.name}`,
        origin: fromLoc.name,
        destinationName: toLoc.name,
        breakdown: {
            railLeg: fromLoc.baseRailPrice,
            alpineSupplement: toLoc.baseTariff,
            standardTicket: standardTicket,
            passLabel: pass.label,
            passDiscountPct: Math.round((1 - pass.modifier) * 100),
            groupDiscountApplied: groupDiscountApplied
        },
        pricing: {
            basePricePerPerson: standardTicket,
            appliedModifier: discountModifier,
            finalPricePerPerson: pricePerPerson,
            savingsPerPerson: roundCHF(standardTicket - pricePerPerson),
            totalGroupCost: totalGroupCost,
            groupSize: size
        }
    });
});

// 3. TWINT Mock Settlement Ledger Gateway
app.post('/api/ledger/settle', (req, res) => {
    const { expenses, groupMembers } = req.body;

    if (!Array.isArray(expenses) || !Array.isArray(groupMembers) || groupMembers.length === 0) {
        return res.status(400).json({ error: 'Missing ledger properties or member roster.' });
    }

    const invalidItems = expenses.filter(exp => !(parseFloat(exp.amount) > 0));
    if (invalidItems.length > 0) {
        return res.status(400).json({
            error: `Invalid amount on line item(s): ${invalidItems.map(e => e.description || '(unnamed)').join(', ')}. Amounts must be positive numbers.`
        });
    }

    const unknownPayers = [...new Set(
        expenses.map(exp => exp.payer).filter(p => !groupMembers.includes(p))
    )];
    if (unknownPayers.length > 0) {
        return res.status(400).json({
            error: `Payer(s) not on the group roster: ${unknownPayers.join(', ')}. Add them to the roster or correct the payer name.`
        });
    }

    const totalSpent = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
    const perPersonShare = totalSpent / groupMembers.length;

    // Calculate balances
    const paidBy = {};
    groupMembers.forEach(m => { paidBy[m] = 0; });
    expenses.forEach(exp => { paidBy[exp.payer] += parseFloat(exp.amount); });

    const memberBalances = groupMembers.map(member => ({
        name: member,
        paid: roundCHF(paidBy[member]),
        share: roundCHF(perPersonShare),
        net: roundCHF(paidBy[member] - perPersonShare)
    }));

    // Split logic: pair largest debtor with largest creditor until settled
    const working = groupMembers.map(member => ({
        name: member,
        balance: paidBy[member] - perPersonShare
    }));
    const debtors = working.filter(m => m.balance < -SETTLED_EPSILON).sort((a, b) => a.balance - b.balance);
    const creditors = working.filter(m => m.balance > SETTLED_EPSILON).sort((a, b) => b.balance - a.balance);

    const settlements = [];
    debtors.forEach(d => {
        creditors.forEach(c => {
            if (Math.abs(d.balance) < SETTLED_EPSILON || c.balance < SETTLED_EPSILON) return;

            const payment = Math.min(Math.abs(d.balance), c.balance);
            d.balance += payment;
            c.balance -= payment;

            const paymentCHF = roundCHF(payment);
            settlements.push({
                from: d.name,
                to: c.name,
                amount: paymentCHF,
                twintMockString: `twint://pay?to=${encodeURIComponent(c.name)}&amount=${paymentCHF.toFixed(2)}&ref=AlpenSync-${Math.random().toString(36).substring(7).toUpperCase()}`
            });
        });
    });

    res.json({
        totalSpent: roundCHF(totalSpent),
        perPersonShare: roundCHF(perPersonShare),
        memberBalances: memberBalances,
        settlements: settlements
    });
});

// Unknown API routes get a JSON 404 instead of the HTML fallback
app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Unknown AlpenSync API route.' });
});

// Serve frontend routing fallback
app.get('*', (req, res) => {
    if (!fs.existsSync(INDEX_HTML)) {
        console.error(`[AlpenSync] index.html not found at ${INDEX_HTML}. Directory contains: ${fs.readdirSync(__dirname).join(', ')}`);
        return res.status(500).json({
            error: 'Frontend asset index.html is missing from the deployment.',
            expectedPath: INDEX_HTML
        });
    }
    res.sendFile(INDEX_HTML);
});

// JSON error handler — malformed request bodies should not yield HTML stack traces
app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ error: 'Malformed JSON payload.' });
    }
    console.error('[AlpenSync] Unhandled engine fault:', err);
    res.status(500).json({ error: 'Internal AlpenSync engine fault.' });
});

app.listen(PORT, () => {
    console.log(`[AlpenSync OS Engine v${pkg.version} running smoothly on port ${PORT}]`);
    console.log(`[AlpenSync] Serving from ${__dirname}`);
    console.log(`[AlpenSync] index.html present: ${fs.existsSync(INDEX_HTML)}`);
    console.log(`[AlpenSync] Directory contents: ${fs.readdirSync(__dirname).join(', ')}`);
});
