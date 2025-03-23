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
                    <v-btn color="primary" class="mr-2" @click="create3DPOISinglePoint"> Create Points from Single POI </v-btn>
                    <v-btn color="error" class="ml-2" @click="removePoint" :disabled="!layerExists"> Remove Point </v-btn>

                </div>

                <!-- Display current moisture data -->
                <v-card v-if="mqtt_data && mqtt_data.length > 0" class="mt-4">
                    <v-card-title>Current Moisture Data</v-card-title>
                    <v-card-text>
                        <p><strong>GUID:</strong> {{ mqtt_data[0].guid }}</p>
                        <p><strong>Soil Moisture:</strong> {{ mqtt_data[0].fields.soil_moisture_content }}%</p>
                    </v-card-text>
                </v-card>

                <!-- Add selected item info display -->
                <v-card v-if="selectedItem" class="mt-4 selected-item-card">
                    <v-card-title>Selected Tree Information</v-card-title>
                    <v-card-text>
                        <div class="selected-item-info">
                            <p><strong>GUID:</strong> {{ selectedItem.guid }}</p>
                            <p><strong>Soil Moisture:</strong> {{ selectedItem.moisture }}%</p>
                        </div>
                    </v-card-text>
                </v-card>
            </v-container>
        </v-main>
    </v-app>
</template>

<script>
import { mapStores } from "pinia";
import { th } from "vuetify/locale";
import mqtt from "mqtt";
import { widget } from "@widget-lab/3ddashboard-utils";
import geojson from "@/assets/sundial_orchard_object_V2.geojson";
import { createTreeCoordinates } from "@/components/create-tree-coordinates";
import { useGlobalStore } from "@/store/global";

export default {
    name: "App",
    data() {
        return {
        selectedID: null,
            mqttClient: null,
            layerExists: false,
            mqttClient: null,
            currentMoisture: 0,
            selectedItem: null,
            mqtt_data: null,
            x: null,
            y: null,
            z: null,
            geojson_empty: {
                type: "FeatureCollection",
                name: "empty_layer",
                crs: { type: "name", properties: { name: "urn:ogc:def:crs:EPSG::7855" } },
                features: []
            },

            mositure_content_low: {
                widgetID: widget.id,
                geojson: {
                type: "FeatureCollection",
                name: "empty_layer",
                crs: { type: "name", properties: { name: "urn:ogc:def:crs:EPSG::7855" } },
                features: []
            }, // Use the imported geojson file
                
                layer: {
                    id: "mositure_content_low",
                    name: "mositure_content_low",
                    attributeMapping: {
                        "STRID": "GUID",
                        "Soil Moisture": "Soil Moisture"
                    }
                },
                render: {
                    anchor: true,
                    color: "blue",
                    scale: [1, 1, 3],
                    shape: "tube",
                    switchDistance: 500,
                    opacity: 1
                }
            },

            mositure_content_high: {
                widgetID: widget.id,
                geojson: {
                type: "FeatureCollection",
                name: "empty_layer",
                crs: { type: "name", properties: { name: "urn:ogc:def:crs:EPSG::7855" } },
                features: []
            }, // Use the imported geojson file
                layer: {
                    id: "mositure_content_high",
                    name: "mositure_content_high",
                    attributeMapping: {
                        "STRID": "GUID",
                        "Soil Moisture": "Soil Moisture"
                    }
                },
                render: {
                    anchor: true,
                    color: "red",
                    scale: [1, 1, 3],
                    shape: "tube",
                    switchDistance: 500,
                    opacity: 1
                }
            }

            // tree_coordinate: {
            //     widgetID: widget.id,
            //     geojson: geojson, // Use the imported geojson file
            //     layer: {
            //         id: "tree-layer",
            //         name: "tree POI",
            //         attributeMapping: {
            //             "STRID": "GUID",
            //             "Soil Moisture": "Soil Moisture"
            //         }
            //     },
            //     render: {
            //         anchor: true,
            //         color: "green",
            //         scale: [1, 1, 3],
            //         shape: "tube",
            //         switchDistance: 500,
            //         opacity: 1
            //     }
            // }
        };
    },
    computed: {
        ...mapStores(useGlobalStore)
    },

    async mounted() {
        console.log("App mounted");
        this.platformAPI = await requirejs("DS/PlatformAPI/PlatformAPI");
        this.platformAPI.subscribe("3DEXPERIENCity.OnItemSelect", this.handleOnItemSelect);
        this.CreateLayerWith3DPOI();

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
                this.mqtt_data = JSON.parse(message.toString());

                // Ensure geojson and its features are initialized
                if (!geojson || !geojson.features) {
                    console.error("GeoJSON or its features are not properly initialized.");
                    return;
                }

                this.mositure_content_low.geojson.features = [];
                this.mositure_content_high.geojson.features = [];

                // Match the MQTT data with the geojson data
                this.mqtt_data.forEach(sensor => {
                    const matchingFeature = geojson.features.find(feature => feature.properties.GUID === sensor.guid);
                    if (matchingFeature) {
                        matchingFeature.properties["Soil Moisture"] = sensor.fields.soil_moisture_content;
                        if (sensor.fields.soil_moisture_content < 50) {
                            this.mositure_content_low.geojson.features.push(matchingFeature);
                        } else {
                            this.mositure_content_high.geojson.features.push(matchingFeature);
                        }
                    }
                });

                // Add this console log to show the first feature
                if (this.mositure_content_low.geojson.features.length > 0) {
                    console.log("First low moisture:", this.mositure_content_low);
                }

                console.log("📊 Low moisture features:", this.mositure_content_low.geojson.features.length);
                console.log("📊 High moisture features:", this.mositure_content_high.geojson.features.length);

                this.platformAPI.publish("3DEXPERIENCity.Update3DPOIContent", this.mositure_content_low);

                // Update selected item moisture if it exists
                // if (this.selectedItem) {
                //     const matchingMoistureData = this.mqtt_data.find(sensor => sensor.guid === this.selectedItem.guid);
                //     if (matchingMoistureData) {
                //         this.selectedItem.moisture = matchingMoistureData.fields.soil_moisture_content;
                //     }
                // }
            }
        });

        this.mqttClient.on("error", error => {
            console.error("❌ MQTT Error:", error);
        });
    },

    beforeUnmount() {
        if (this.mqttClient) {
            this.mqttClient.end();
        }
        this.removeContentLayers();
    },

    methods: {
        handleOnItemSelect(res) {
            this.GetSelectedItemsGUID(res);
            // this.GetUpdateSelectedItemsAttribute(res);
        },

        // use add 3dpoi create differnt layers with different rendering options, layer name mositure_content_low render to blue, layer name mositure_content_high render to red
        // create two GEOJSON, one for mostiture contetn_low, and one for higg
        // read the mqtt data and append the GEOJSON with the GUID and moiture_content
        // if the moisture content is less than 50%, append to a GeoJSON, if more than 50% append to another geojson
        // use update3dpoi with the layer name mositure_content_low with the GeoJSON lessthan 50%, and mosture_content_hihg with the more than 50%
        //

        CreateLayerWith3DPOI() {
            this.platformAPI.publish("3DEXPERIENCity.Add3DPOI", this.mositure_content_low);
            this.platformAPI.subscribe("3DEXPERIENCity.Add3DPOIReturn", res => {
                console.log("Mille Says Add3DPOIReturn", res);
            });
            this.platformAPI.publish("3DEXPERIENCity.Add3DPOI", this.mositure_content_high);
            this.platformAPI.subscribe("3DEXPERIENCity.Add3DPOIReturn", res => {
                console.log("Mille Says Add3DPOIReturn", res);
            });
            this.layerExists = true;
        },

        removeContentLayers() {
            this.platformAPI.publish("3DEXPERIENCity.RemoveContent", "mositure_content_low");
            this.platformAPI.publish("3DEXPERIENCity.RemoveContent", "mositure_content_high");
            // this.platformAPI.publish("3DEXPERIENCity.RemoveContent", "tree-layer");
            this.layerExists = false;
        },

        GetSelectedItemsGUID(res) {
            this.platformAPI.publish("3DEXPERIENCity.GetSelectedItems", res);
            this.platformAPI.subscribe("3DEXPERIENCity.GetSelectedItemsReturn", res => {
                if (res.data && res.data.length > 0) {
                    const selectedGuid = res.data[0].userData.GUID;
                    console.log("Selected GUID:", selectedGuid);

                    // Find matching moisture data from MQTT data
                    const matchingMoistureData = this.mqtt_data?.find(sensor => sensor.guid === selectedGuid);

                    this.selectedItem = {
                        id: res.data[0].id,
                        guid: selectedGuid
                    };
                } else {
                    this.selectedItem = null;
                }
            });
        }

        // create3DPOI() {
        //     console.log("Creating Points");
        //     this.platformAPI.publish("3DEXPERIENCity.Add3DPOI", this.tree_coordinate);
        //     this.platformAPI.subscribe("3DEXPERIENCity.Add3DPOIReturn", res => {
        //         console.log("Mille Says Add3DPOIReturn", res);
        //     });
        //     this.pointExists = true;
        // },

        // removePoint() {
        //     console.log("Removing Point");
        //     this.platformAPI.publish("3DEXPERIENCity.RemoveContent", "tree-layer");
        //     this.pointExists = false;
        // },

        // updateAttribute() {
        //     this.tree_coordinate.geojson.features[0].properties["Soil Moisture"] = this.currentMoisture;
        //     this.platformAPI.publish("3DEXPERIENCity.Update3DPOIContent", this.tree_coordinate);
        //     this.platformAPI.subscribe("3DEXPERIENCity.Update3DPOIContentReturn", res => {
        //         console.log("Mille Says Update3DPOIContentReturn", res);
        //     });
        // }

        // GetUpdateSelectedItemsAttribute(res) {
        //     this.platformAPI.publish("3DEXPERIENCity.GetSelectedItems", res);
        //     this.platformAPI.subscribe("3DEXPERIENCity.GetSelectedItemsReturn", res => {
        //         // const selectedGuid = res.data[0].userData.GUID;
        //         this.selectedID = res.data[0].id;
        //         // console.log("Selected GUID:", selectedGuid);
        //         console.log("Selected ID:", this.selectedID);
        //     });

        //     this.platformAPI.publish("3DEXPERIENCity.Get", [this.selectedID, "Content"]);
        //     console.log("Published Get\n\n");
        //     this.platformAPI.subscribe("3DEXPERIENCity.GetReturn", res => {
        //         console.log("MIlle Says GetReturn", res);
        //     });
        //     console.log("Subscribed Get\n\n");
        // },

        // GetListAttributes(res) {
        //     this.platformAPI.publish("3DEXPERIENCity.GetListAttributes", res);
        //     this.platformAPI.subscribe("3DEXPERIENCity.GetListAttributesReturn", res => {
        //         console.log("MIlle Says GetListAttributesReturn", res);
        //     });
        // },

        // GetAttribute(res) {
        //     this.platformAPI.publish("3DEXPERIENCity.Get", res);
        //     this.platformAPI.subscribe("3DEXPERIENCity.GetReturn", res => {
        //         console.log("MIlle Says GetReturn", res);
        //     });
        // },

        // create3DPOISinglePoint() {
        //     console.log("Creating up to 10 Points");
        //     let count = 0;
        //     createTreeCoordinates((treeCoordinate) => {
        //         if (count < 10) {
        //             this.platformAPI.publish("3DEXPERIENCity.Add3DPOI", treeCoordinate);
        //             count++;
        //         }
        //     });
        //     console.log("MILLE says up to 10 Points Created\n\n\n");
        // },
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

.geojson-display {
    margin-top: 20px;
    padding: 20px;
}

.feature-item {
    margin-bottom: 20px;
    padding: 10px;
    border: 1px solid #eee;
    border-radius: 4px;
}

.feature-item h3 {
    margin-bottom: 10px;
    color: #2196f3;
}

.selected-item-card {
    max-width: 600px;
    margin: 20px auto;
}

.selected-item-info {
    padding: 10px;
}

.selected-item-info p {
    margin-bottom: 8px;
    font-size: 16px;
}
</style>
