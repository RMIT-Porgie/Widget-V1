<template>
    <v-app>
        <v-main>
            <v-container style="background: white; min-height: 100vh">
                <h1>Hello World From RMIT</h1>
                <div>
                    <p>X: {{ x }}</p>
                    <p>Y: {{ y }}</p>
                    <p>Z: {{ z }}</p>
                    <v-btn color="primary" class="mr-2" @click="create3DPOI"> Create Point </v-btn>

                    <v-btn color="error" class="ml-2" @click="removePoint" :disabled="!pointExists"> Remove Point </v-btn>
                    <v-btn color="info" class="ml-2" @click="updateAttribute" :disabled="!pointExists"> Update Temperature to 10 </v-btn>
                </div>
                <div class="temperature-display">
                    <p>Current Moisture: {{ currentMoisture }}%</p>
                </div>
            </v-container>
        </v-main>
    </v-app>
</template>

<script>
// Import mapStores from Pinia to map the global store into the component's computed properties
import { mapStores } from "pinia";
// Importing the widget object to access its ID for uniquely identifying the tree_coordinate widget
import { widget } from "@widget-lab/3ddashboard-utils";
import { widget } from "@widget-lab/3ddashboard-utils";
import geojson from "src/assets/sundial_orchard_tree_object_test.geojson"; // Import the geojson file
// import geojson from "src\assets\sundial_orchard_object.geojson"; // Import the geojson file

import { useGlobalStore } from "@/store/global";

export default {
    name: "App",
    data() {
        return {
            mqttClient: null,
            currentMoisture: null,

            x: null,
            y: null,
            z: null,

            tree_coordinate: {
                widgetID: widget.id,
                geojson: geojson, // Use the imported geojson file
                // geojson: {
                //     type: "FeatureCollection",
                //     name: "tree_coordinates",
                //     crs: { type: "name", properties: { name: "urn:ogc:def:crs:EPSG::7855" } },
                //     features: [
                //         {
                //             type: "Feature",
                //             properties: { "id": 1, "Soil Moisture": 0 },
                //             geometry: { type: "Point", coordinates: [344743.73853630596, 5966167.156872547, 120.72197453345325] }
                //         }
                //     ]
                // },
                layer: {
                    id: "tree-layer",
                    name: "tree POI",
                    attributeMapping: {
                        "STRID": "GUID",
                        "Soil Moisture": "Soil Moisture"
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
            currentMoisture: 0,
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
        this.platformAPI.subscribe("3DEXPERIENCity.OnItemSelect", this.handleOnItemSelect);

        // Connect to MQTT broker
        const options = {
            protocol: "wss",
            hostname: "mqtt-sooft.duckdns.org",
            port: 443,
            clientId: "vue-client-" + Math.random().toString(16).substr(2, 8)
        };
        this.mqttClient = mqtt.connect(options);

        this.mqttClient.on("connect", () => {
            console.log("✅ Connected to MQTT broker");
            this.mqttClient.subscribe("sensor/soil_moisture", err => {
                if (!err) {
                    console.log("✅ Subscribed to sensor/soil_mositure");
                }
            });
        });

        this.mqttClient.on("message", (topic, message) => {
            if (topic === "sensor/soil_moisture") {
                const data = JSON.parse(message.toString());
                console.log(`📩 MQTT Message Received:`, data);
                this.currentMoisture = data.fields.soil_moisture_content;
            }
        });

        this.mqttClient.on("error", error => {
            console.error("❌ MQTT Error:", error);
        });
    },

    beforeUnmount() {
        if (this.temperatureInterval) {
            clearInterval(this.temperatureInterval);
        }
        if (this.mqttClient) {
            this.mqttClient.end();
        }
    },

    methods: {
        handleWorldClick(res) {
            // console.log("World Clicked Millie Says", res);
            this.x = res.x;
            this.y = res.y;
            this.z = res.z;
        },

        handleOnItemSelect(res) {
            // console.log("Item Selected Millie Says WOWOWOOWOWOWO", res);
            this.GetSelectedItems(res);
            // this.GetListAttributes(res);
            // this.GetAttribute(res);
        },

        GetSelectedItems(res) {
            this.platformAPI.publish("3DEXPERIENCity.GetSelectedItems", res);
            this.platformAPI.subscribe("3DEXPERIENCity.GetSelectedItemsReturn", res => {
                console.log("Mille SAys GetSelectedItemsReturn\n\n\n\n");

                const id = res.data[0].id;
                const geoItemUuid = res.data[0].userData.geoItemUuid;
                const datasetUuid = res.data[0].userData.datasetUuid;
                const referentialUuid = res.data[0].userData.referentialUuid;
            });
        },

        GetListAttributes(res) {
            this.platformAPI.publish("3DEXPERIENCity.GetListAttributes", res);
            this.platformAPI.subscribe("3DEXPERIENCity.GetListAttributesReturn", res => {
                console.log("MIlle Says GetListAttributesReturn", res);
            });
        },

        GetAttribute(res) {
            this.platformAPI.publish("3DEXPERIENCity.Get", res);
            this.platformAPI.subscribe("3DEXPERIENCity.GetReturn", res => {
                console.log("MIlle Says GetReturn", res);
            });
        },

        SetAttribute(res) {
            this.platformAPI.publish("3DEXPERIENCity.Set", res);
        },

        create3DPOI() {
            console.log("Creating Point");
            this.platformAPI.publish("3DEXPERIENCity.Add3DPOI", this.tree_coordinate);
            this.platformAPI.subscribe("3DEXPERIENCity.Add3DPOIReturn", res => {
                console.log("MIlle Says Add3DPOIReturn", res);
            });

            this.pointExists = true;
        },

        removePoint() {
            console.log("Removing Point");
            this.platformAPI.publish("3DEXPERIENCity.RemoveContent", "tree-layer");
            this.pointExists = false;
        },

        updateAttribute() {
            // const updateContent = {
            //     widgetID: widget.id,
            //     layerID: "tree-layer",
            //     geojson: {
            //         type: "FeatureCollection",
            //         name: "tree_coordinates",
            //         crs: { type: "name", properties: { name: "urn:ogc:def:crs:EPSG::7855" } },
            //         features: [
            //             {
            //                 type: "Feature",
            //                 properties: { "id": 1, "Soil Moisture": this.currentMoisture },
            //                 geometry: { type: "Point", coordinates: [344743.73853630596, 5966167.156872547, 120.72197453345325] }
            //             }
            //         ]
            //     }
            // };

            // update the geojson file, update the Soil Moisture value to this.currentMoisture
            this.tree_coordinate.geojson.features[0].properties["Soil Moisture"] = this.currentMoisture;

            this.platformAPI.publish("3DEXPERIENCity.Update3DPOIContent", updateContent);
            this.platformAPI.subscribe("3DEXPERIENCity.Update3DPOIContentReturn", res => {
                console.log("Mille Says Update3DPOIContentReturn", res);
            });
        }
    }
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
