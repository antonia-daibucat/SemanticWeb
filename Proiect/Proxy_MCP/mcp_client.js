
const express = require("express");
const jayson = require("jayson/promise");
const axios = require("axios");
const cors = require("cors");
const app = express();
app.use(cors());
app.use(express.json());

const clientRpc = jayson.Client.http("http://localhost:6000");

const GEMINI_API_KEY = ""; // your API key
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

function cleanJsonResponse(text) {
    return text.replace(/```json/ig, "").replace(/```/g, "").trim();
}

async function callAI(prompt) {
    try {
        const response = await axios.post(GEMINI_URL, {
            contents: [{ parts: [{ text: prompt }] }]
        });
        if (response.data && response.data.candidates) {
            return response.data.candidates[0].content.parts[0].text;
        }
        throw new Error("Răspuns gol de la AI");
    } catch (error) {
        console.error("EROARE GEMINI:", JSON.stringify(error.response ? error.response.data : error.message));
        throw error;
    }
}

app.post("/ask", async (req, res) => {
    try {
        const userPrompt = req.body.prompt;
        console.log("\nCerere utilizator: ", userPrompt);

        const toolsRes = await clientRpc.request("tools/list", {});
        const toolsDesc = JSON.stringify(toolsRes.result.tools);

        const selectorPrompt = `
                                Ești un asistent expert în mall-urile din Cluj. Uneltele tale: ${toolsDesc}.

                                LOGICĂ DE SELECȚIE:

                                1. Adresa/Locația unui mall specific:"get_mall_location_rdf"(param: mallName).
                                2. Magazine dintr-un mall anume:="search_shops_by_mall_name_rdf"(param: numeMall).
                                3. Unde e un magazin anume: "find_shop_location_global"(param: shopName).
                                4. Magazine la un etaj:"get_stores_by_floor_rdf"(param: locatie).
                                5. Câte magazine sunt:"get_mall_statistics_rdf".
                                6. Căutare după adresă/stradă:"find_mall_by_address_rdf"(param: strada).
                                7. Căutare după cuvânt cheie (ex: haine, cafea):"search_shops_by_keyword_rdf"(param: keyword).
                                8. Adăugare magazin: "add_new_store_json"(params: mallId, nume, locatie).
                                Iulius=1, Vivo=2, Platinia=3, Central=4, Aushopping=5.
                                9. Dacă utilizatorul vrea o privire de ansamblu sau "totul" despre un mall (ierarhie):folosește "get_mall_hierarchy_gql" (param: id).
                                10. Adăugare magazin prin GraphQL:"add_store_graphql"(params: id, mall_id, nume, locatie).
                                11. Adăugare mall nou semantic în RDF:"add_new_mall_rdf"(params: id, numeMall, adresa).

                                Utilizatorul întreabă:"${userPrompt}".
                                Răspunde DOAR cu JSON:{"tool": "nume", "params": {...}}.
                                `;
        
        let aiRec = await callAI(selectorPrompt);
        const recommendation = JSON.parse(cleanJsonResponse(aiRec));
        console.log("AI a ales:", recommendation.tool);

        const executionRes = await clientRpc.request("tools/call", {
            name: recommendation.tool,
            arguments: recommendation.params
        });

        const finalPrompt = `
            Utilizatorul: "${userPrompt}".
            Date obținute de la server: ${JSON.stringify(executionRes.result)}.
            Formulează un răspuns prietenos în română care să explice clar informația cerută.
        `;
        
        const finalAnswer = await callAI(finalPrompt);
        res.json({ answer: finalAnswer });

    } catch (error) {
        console.error("EROARE:", error.message);
        res.json({ answer: "Eroare: " + error.message });
    }
});

app.listen(5000, () => console.log("MCP Client pornit pe portul 5000"));