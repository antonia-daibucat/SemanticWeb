
const jayson = require("jayson");
const axios = require("axios");

const PORTS = {
    json: 4000,
    graphql: 3000,
    rdf4j: 8080
};

const RDF4J_URL = `http://localhost:${PORTS.rdf4j}/rdf4j-server/repositories/grafexamen`;

const server = new jayson.Server({
    "tools/list": (args, callback) => {
        console.log("-> MCP Client cere lista extinsă de unelte...");
        const tools = [
            {
                name: "get_stores_by_mall_json",
                description: "Lista de magazine dintr-un mall folosind ID-ul numeric (JSON-Server).",
                params: { mallId: "string" }
            },
            {
                name: "search_shops_by_mall_name_rdf",
                description: "Caută toate magazinele dintr-un mall după numele acestuia (ex: Iulius, Vivo).",
                params: { numeMall: "string" }
            },
            {
                name: "find_shop_location_global",
                description: "Caută locația unui magazin specific în toate mall-urile (ex: Unde este Zara?).",
                params: { shopName: "string" }
            },
            {
                name: "get_stores_by_floor_rdf",
                description: "Filtrează magazinele după etaj sau locație specifică (ex: Parter, Etaj 1).",
                params: { locatie: "string" }
            },
            {
                name: "add_new_store_json",
                description: "Adaugă un magazin nou în baza de date (JSON-Server).",
                params: { mallId: "number", nume: "string", locatie: "string" }
            },
            {
                name: "get_mall_statistics_rdf",
                description: "Numără câte magazine sunt în fiecare mall (Statistici).",
                params: {}
            },
            {
                name: "find_mall_by_address_rdf",
                description: "Găsește mall-ul aflat la o anumită adresă sau stradă.",
                params: { strada: "string" }
            },
            {
                name: "search_shops_by_keyword_rdf",
                description: "Caută magazine după un cuvânt cheie (ex: 'Sport', 'Fashion', 'Beauty').",
                params: { keyword: "string" }
            },
            {
                name: "get_mall_location_rdf",
                description: "Află adresa exactă a unui mall (ex: Unde este localizat Platinia?).",
                params: { mallName: "string" }
            },
            {
                name: "get_mall_hierarchy_gql",
                description: "Obține ierarhia completă a unui mall (nume, adresă și magazine) folosind GraphQL.",
                params: { id: "string" }
            },
            {
                name: "add_store_graphql",
                description: "Adaugă un magazin nou folosind GraphQL.",
                params: { id: "string", mall_id: "string", nume: "string", locatie: "string" }
            },
            {
                name: "add_new_mall_rdf",
                description: "Adaugă un mall nou în RDF4J folosind SPARQL INSERT.",
                params: {id: "string",numeMall: "string",adresa: "string"}
            }
        ];
        callback(null, { tools });
    },

    "tools/call": async (args, callback) => {
        const { name, arguments: params } = args;
        console.log(`-> Apel unealtă: ${name}`, params);

        try {
           
            if (name === "get_stores_by_mall_json") {
                const id = params.mallId || params.id;
                const res = await axios.get(`http://localhost:4000/magazine?mallId=${id}`);
                return callback(null, res.data);
            }

           
            if (name === "search_shops_by_mall_name_rdf") {
                const sparql = `
                    PREFIX : <http://cherechesDaibucat.ro#>
                    PREFIX schema: <https://schema.org/>
                    SELECT ?numeMagazin ?locatie WHERE {
                        GRAPH :ClujMallsGraph {
                            ?mall a schema:ShoppingCenter ; schema:name ?nMall .
                            ?mag a schema:Store ; schema:name ?numeMagazin ; :locatie ?locatie ; schema:containedInPlace ?mall .
                            FILTER(CONTAINS(LCASE(STR(?nMall)), LCASE("${params.numeMall}")))
                        }
                    }`;
                const res = await axios.get(RDF4J_URL, { params: { query: sparql }, headers: { 'Accept': 'application/sparql-results+json' } });
                return callback(null, res.data.results.bindings);
            }

            if (name === "find_shop_location_global") {
                const sparql = `
                    PREFIX : <http://cherechesDaibucat.ro#>
                    PREFIX schema: <https://schema.org/>
                    SELECT ?numeMall ?etaj WHERE {
                        GRAPH :ClujMallsGraph {
                            ?mag a schema:Store ; schema:name ?nMag ; :locatie ?etaj ; schema:containedInPlace ?mall .
                            ?mall schema:name ?numeMall .
                            FILTER(CONTAINS(LCASE(STR(?nMag)), LCASE("${params.shopName}")))
                        }
                    }`;
                const res = await axios.get(RDF4J_URL, { params: { query: sparql }, headers: { 'Accept': 'application/sparql-results+json' } });
                return callback(null, res.data.results.bindings);
            }

            if (name === "get_stores_by_floor_rdf") {
                const sparql = `
                    PREFIX : <http://cherechesDaibucat.ro#>
                    PREFIX schema: <https://schema.org/>
                    SELECT ?numeMagazin ?numeMall WHERE {
                        GRAPH :ClujMallsGraph {
                            ?mag a schema:Store ; schema:name ?numeMagazin ; :locatie ?loc ; schema:containedInPlace ?mall .
                            ?mall schema:name ?numeMall .
                            FILTER(CONTAINS(LCASE(STR(?loc)), LCASE("${params.locatie}")))
                        }
                    }`;
                const res = await axios.get(RDF4J_URL, { params: { query: sparql }, headers: { 'Accept': 'application/sparql-results+json' } });
                return callback(null, res.data.results.bindings);
            }

            if (name === "get_mall_statistics_rdf") {
                const sparql = `
                    PREFIX : <http://cherechesDaibucat.ro#>
                    PREFIX schema: <https://schema.org/>
                    SELECT ?numeMall (COUNT(?mag) AS ?numarMagazine) WHERE {
                        GRAPH :ClujMallsGraph {
                            ?mall a schema:ShoppingCenter ; schema:name ?numeMall .
                            ?mag a schema:Store ; schema:containedInPlace ?mall .
                        }
                    } GROUP BY ?numeMall`;
                const res = await axios.get(RDF4J_URL, { params: { query: sparql }, headers: { 'Accept': 'application/sparql-results+json' } });
                return callback(null, res.data.results.bindings);
            }

            if (name === "find_mall_by_address_rdf") {
                const sparql = `
                    PREFIX : <http://cherechesDaibucat.ro#>
                    PREFIX schema: <https://schema.org/>
                    SELECT ?numeMall ?adresa WHERE {
                        GRAPH :ClujMallsGraph {
                            ?mall a schema:ShoppingCenter ; schema:name ?numeMall ; schema:address ?adresa .
                            FILTER(CONTAINS(LCASE(STR(?adresa)), LCASE("${params.strada}")))
                        }
                    }`;
                const res = await axios.get(RDF4J_URL, { params: { query: sparql }, headers: { 'Accept': 'application/sparql-results+json' } });
                return callback(null, res.data.results.bindings);
            }

            if (name === "search_shops_by_keyword_rdf") {
                const sparql = `
                    PREFIX : <http://cherechesDaibucat.ro#>
                    PREFIX schema: <https://schema.org/>
                    SELECT ?numeMagazin ?numeMall ?locatie WHERE {
                        GRAPH :ClujMallsGraph {
                            ?mag a schema:Store ; schema:name ?numeMagazin ; :locatie ?locatie ; schema:containedInPlace ?mall .
                            ?mall schema:name ?numeMall .
                            FILTER(CONTAINS(LCASE(STR(?numeMagazin)), LCASE("${params.keyword}")))
                        }
                    }`;
                const res = await axios.get(RDF4J_URL, { params: { query: sparql }, headers: { 'Accept': 'application/sparql-results+json' } });
                return callback(null, res.data.results.bindings);
            }

            if (name === "get_mall_location_rdf") {
                const sparql = `
                    PREFIX : <http://cherechesDaibucat.ro#>
                    PREFIX schema: <https://schema.org/>
                    SELECT ?numeMall ?adresa WHERE {
                        GRAPH :ClujMallsGraph {
                            ?mall a schema:ShoppingCenter ; 
                                  schema:name ?numeMall ; 
                                  schema:address ?adresa .
                            FILTER(CONTAINS(LCASE(STR(?numeMall)), LCASE("${params.mallName}")))
                        }
                    }`;
                const res = await axios.get(RDF4J_URL, { params: { query: sparql }, headers: { 'Accept': 'application/sparql-results+json' } });
                return callback(null, res.data.results.bindings);
            }

           
            if (name === "get_mall_hierarchy_gql") {
                const targetId = params.id || params.mallId || "1";
               
                const query = `query { 
                    Mall(id: "${targetId}") { 
                        nume 
                        adresa 
                        allMagazines { 
                            nume 
                            locatie 
                        } 
                    } 
                }`;
                const res = await axios.post('http://localhost:3000', { query });
                if (res.data && res.data.data && res.data.data.Mall) {
                    return callback(null, res.data.data.Mall);
                } else {
                    return callback(null, { message: "Mall-ul nu a fost găsit în GraphQL." });
                }
            }

          
            if (name === "add_new_store_json") {
                const res = await axios.post(`http://localhost:4000/magazine`, {
                    mallId: params.mallId,
                    nume: params.nume,
                    locatie: params.locatie
                });
                return callback(null, { message: "Magazin adăugat cu succes!", data: res.data });
            }
            if (name === "add_store_graphql") {

                const mutation = `
                         mutation {
                            createMagazine(
                                id: "${params.id}",
                                mall_id: "${params.mall_id}",
                                nume: "${params.nume}",
                                locatie: "${params.locatie}"
                            ) {
                                id
                                nume
                                locatie
                            }
                         }
                    `;

                const res = await axios.post('http://localhost:3000', {
                    query: mutation
                });

                return callback(null, {
                 message: "Magazin adăugat prin GraphQL!",
                data: res.data
                });
            }
            if (name === "add_new_mall_rdf") {

                const sparqlUpdate = `
                        PREFIX : <http://cherechesDaibucat.ro#>
                        PREFIX schema: <https://schema.org/>

                        INSERT DATA {
                             GRAPH :ClujMallsGraph {

                                :mall${params.id} a schema:ShoppingCenter ;
                                    schema:name "${params.numeMall}" ;
                                    schema:address "${params.adresa}" .

                                }
                        }
                        `;

                await axios.post(
                    `${RDF4J_URL}/statements`,
                    sparqlUpdate,
                    {
                        headers: {
                            "Content-Type": "application/sparql-update"
                        }
                    }
                );

                return callback(null, {
                    message: "Mall adăugat cu succes în RDF4J!"
                });
            }

            callback({ code: -32601, message: "Tool-ul nu a fost găsit" });

        } catch (error) {
            console.error(` Eroare la executarea uneltei ${name}:`, error.message);
         
            callback(null, { error: `Eroare la comunicarea cu serverul de date: ${error.message}` });
        }
    }
});

server.http().listen(6000, () => {
    console.log(" MCP Server extins pornit pe http://localhost:6000");
});