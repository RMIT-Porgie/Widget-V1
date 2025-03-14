<template>
    <v-app>
        <v-main>
            <v-container style="background: white; min-height: 100vh">
                <h1>Hello World From RMIT</h1>
                <div class="temperature-display mb-4">
                    <h2>Current Temperature</h2>
                    <v-card elevation="2" class="pa-4 text-center">
                        <span class="text-h3">{{ currentTemperature }}°C</span>
                    </v-card>
                </div>
                <div>
                    <p>X: {{ x }}</p>
                    <p>Y: {{ y }}</p>
                    <p>Z: {{ z }}</p>
                    <v-btn color="primary" class="mr-2" @click="create3DPOI"> Create Point </v-btn>
                    <v-btn color="primary" class="mr-2" @click="create3DPOISet"> Create Point SET</v-btn>
                    <v-btn color="primary" class="mr-2" @click="create3DPOISetPopulate"> Create Point SET Populate </v-btn>

                    <v-btn color="error" class="ml-2" @click="removePoint" :disabled="!pointExists"> Remove Point </v-btn>
                    <v-btn color="warning" class="ml-2" @click="setTemperature" :disabled="!pointExists"> Set Temperature to 10 </v-btn>
                    <v-btn color="info" class="ml-2" @click="updateTemperature" :disabled="!pointExists"> Update Temperature to 10 </v-btn>
                </div>
            </v-container>
        </v-main>
    </v-app>
</template>

<script>
import { widget } from "@widget-lab/3ddashboard-utils";
import { mapStores } from "pinia";
import { useGlobalStore } from "@/store/global";

export default {
    name: "App",
    data() {
        return {
            x: null,
            y: null,
            z: null,

            tree_coordinate: {
                widgetID: widget.id,
                geojson: {
                    type: "FeatureCollection",
                    name: "tree_coordinates",
                    crs: { type: "name", properties: { name: "urn:ogc:def:crs:EPSG::7855" } },

                    features: [
                        {
                            type: "Feature",
                            properties: { "id": 0, "Temperature": 0, "Humidity": 0, "Wind Speed": 0 },
                            geometry: { type: "Point", coordinates: [344743.73853630596, 5966167.156872547, 120.72197453345325] }
                       
                        },
                        {
                            type: "Feature",
                            properties: { "id": 0, "Temperature": 0, "Humidity": 0, "Wind Speed": 0 },
                            geometry: { type: "Point", coordinates: [344748.34285080613, 5966162.11668492, 120.66504647215706] }
                       
                        }
                    ]
                },
                layer: {
                    id: "tree-layer",
                    name: "tree POI",
                    attributeMapping: {
                        "STRID": "id",
                        "Temperature": "currentTemperature",
                        "Humidity": "currentHumidity",
                        "Wind Speed": "currentWindSpeed"
                    }
                },
                render: {
                    anchor: true,
                    color: "blue",
                    scale: [5, 5, 20],
                    shape: "tube",
                    switchDistance: 500,
                    opacity: 1
                }
            },
            pointExists: false,
            mqttClient: null,
            currentTemperature: 0,
            temperatureInterval: null
        };
    },
    computed: {
        ...mapStores(useGlobalStore)
    },

    async mounted() {
        console.log("App mounted");
        this.platformAPI = await requirejs("DS/PlatformAPI/PlatformAPI");
        this.platformAPI.subscribe("3DEXPERIENCity.OnWorldClick", this.handleWorldClick);
        
        // Start temperature update interval
        this.temperatureInterval = setInterval(this.updateTemperatureAutomatic, 5000);
    },

    beforeUnmount() {
        if (this.temperatureInterval) {
            clearInterval(this.temperatureInterval);
        }
    },

    methods: {
        handleWorldClick(res) {
            console.log("World Clicked Millie Says", res);
            this.x = res.x; 
            this.y = res.y;
            this.z = res.z;
        },

        create3DPOI() {
            console.log("Creating Point");
            this.platformAPI.publish("3DEXPERIENCity.Add3DPOI", this.tree_coordinate);
            this.platformAPI.subscribe("3DEXPERIENCity.Add3DPOIReturn", res => {
                console.log("MIlle Says Add3DPOIReturn", res);
            });

            this.pointExists = true;
        },
        
        create3DPOISet() {
            console.log("Creating Point");
            this.platformAPI.publish("3DEXPERIENCity.Add3DPOISet", this.tree_coordinate);
            this.platformAPI.subscribe("3DEXPERIENCity.Add3DPOISetReturn", res => {
                console.log("MIlle Says Add3DPOISetReturn", res);
            });

            this.pointExists = true;
        },

        create3DPOISetPopulate() {
            console.log("Creating Point");
            this.platformAPI.publish("3DEXPERIENCity.Populate3DPOISet", this.tree_coordinate);
            this.platformAPI.subscribe("3DEXPERIENCity.Populate3DPOISetReturn", res => {
                console.log("MIlle Says Populate3DPOISetReturn", res);
            });

            this.pointExists = true;
        },

        removePoint() {
            console.log("Removing Point");
            this.platformAPI.publish("3DEXPERIENCity.RemoveContent", "tree-layer");
            this.pointExists = false;
        },

        setTemperature() {
            console.log("Setting temperature to 10");
            const setArray = ["tree-layer", "currentTemperature", 10];
            this.platformAPI.publish("3DEXPERIENCity.Set", setArray);

            // Update local state to match
            this.tree_coordinate.geojson.features[0].properties.Temperature = 10;
        },

        updateTemperature() {

            const updateContent = {
                widgetID: widget.id,
                layerID: "tree-layer",
                geojson: {
                    type: "FeatureCollection",
                    name: "tree_coordinates",
                    crs: { type: "name", properties: { name: "urn:ogc:def:crs:EPSG::7855" } },
                    features: [
                        {
                            type: "Feature",
                            properties: { "id": 0, "Temperature": 10, "Humidity": 10, "Wind Speed": 0 },
                            geometry: { type: "Point", coordinates: [344743.73853630596, 5966167.156872547, 120.72197453345325] }
                        },
                        {
                            type: "Feature",
                            properties: { "id": 0, "Temperature": 10, "Humidity": 0, "Wind Speed": 10 },
                            geometry: { type: "Point", coordinates: [344748.34285080613, 5966162.11668492, 120.66504647215706] }
                       
                        }
                    ]
                }
            };

            this.platformAPI.publish("3DEXPERIENCity.Update3DPOIContent", updateContent);
            this.platformAPI.subscribe("3DEXPERIENCity.Update3DPOIContentReturn", res => {
                console.log("MIlle Says Update3DPOIContentReturn", res);
            });
        },

        updateTemperatureAutomatic() {
            if (!this.pointExists) return;
            
            this.currentTemperature += 1;
            const updateContent = {
                widgetID: widget.id,
                layerID: "tree-layer",
                geojson: {
                    type: "FeatureCollection",
                    name: "tree_coordinates",
                    crs: { type: "name", properties: { name: "urn:ogc:def:crs:EPSG::7855" } },
                    features: [
                        {
                            type: "Feature",
                            properties: { "id": 0, "Temperature": this.currentTemperature, "Humidity": 10, "Wind Speed": 0 },
                            geometry: { type: "Point", coordinates: [344743.73853630596, 5966167.156872547, 120.72197453345325] }
                        },
                        {
                            type: "Feature",
                            properties: { "id": 0, "Temperature": this.currentTemperature, "Humidity": 0, "Wind Speed": 10 },
                            geometry: { type: "Point", coordinates: [344748.34285080613, 5966162.11668492, 120.66504647215706] }
                        }
                    ]
                }
            };

            this.platformAPI.publish("3DEXPERIENCity.Update3DPOIContent", updateContent);
        }
    },

};
</script>

<style>
.v-application {
    background: white !important;
}

.temperature-display {
    max-width: 300px;
    margin: 20px auto;
}
</style>
