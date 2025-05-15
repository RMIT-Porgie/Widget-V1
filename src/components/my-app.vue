<template>
    <v-app>
        <v-main>
            <v-container style="background: white; min-height: 100vh">
                <h1>Soil Mositure Content Visualisation</h1>
                <!-- create a button to toggle startVisualisation to True and False -->
                <!-- also trigger the clearcontent -->
                <v-btn
                    @click="
                        startVisualisation = !startVisualisation;
                        removeContentLayers();
                    "
                    color="primary"
                >
                    {{ startVisualisation ? "Stop Visualisation" : "Start Visualisation" }}
                </v-btn>

                <!-- Button to create test 3D POI -->
                <v-btn class="ml-2" color="success" @click="createTest3DPoi"> Create Test 3D POI </v-btn>

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
// import src/assets/response_mositureContent
import { mapStores } from "pinia";
import { th } from "vuetify/locale";
import mqtt from "mqtt";
import { widget } from "@widget-lab/3ddashboard-utils";
import geojson_template from "@/assets/sundial_orchard_object_V2.geojson";
import { useGlobalStore } from "@/store/global";

export default {
    name: "App",
    data() {
        return {
            mqttClient: null,
            startVisualisation: false,
            layerExists: false,
            selectedItem: null,
            mqtt_data: null,

            mositure_content_low: {
                widgetID: widget.id,
                geojson: {
                    type: "FeatureCollection",
                    name: "mositure_content_low",
                    crs: { type: "name", properties: { name: "urn:ogc:def:crs:EPSG::7855" } },
                    features: []
                },
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
                    scale: [1, 1, 1],
                    shape: "tube",
                    switchDistance: 500,
                    opacity: 0.5
                }
            },

            mositure_content_medium: {
                widgetID: widget.id,
                geojson: {
                    type: "FeatureCollection",
                    name: "mositure_content_medium",
                    crs: { type: "name", properties: { name: "urn:ogc:def:crs:EPSG::7855" } },
                    features: []
                },
                layer: {
                    id: "mositure_content_medium",
                    name: "mositure_content_medium",
                    attributeMapping: {
                        "STRID": "GUID",
                        "Soil Moisture": "Soil Moisture"
                    }
                },
                render: {
                    anchor: true,
                    color: "red",
                    scale: [1, 1, 3],
                    shape: "sphere",
                    switchDistance: 500,
                    opacity: 0.5
                }
            },

            mositure_content_high: {
                widgetID: widget.id,
                geojson: {
                    type: "FeatureCollection",
                    name: "mositure_content_high",
                    crs: { type: "name", properties: { name: "urn:ogc:def:crs:EPSG::7855" } },
                    features: []
                },
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
                    color: "green",
                    scale: [1, 1, 5],
                    shape: "pyramid",
                    switchDistance: 500,
                    opacity: 0.5
                }
            }
        };
    },
    computed: {
        ...mapStores(useGlobalStore)
    },

    async mounted() {
        console.log("App mounted");
        // CONSOLE LOG GEOJSON TEMPLATE
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

                this.mositure_content_low.geojson.features = [];
                this.mositure_content_medium.geojson.features = [];
                this.mositure_content_high.geojson.features = [];

                // Match the MQTT data with the geojson data
                this.mqtt_data.forEach(sensor => {
                    const matchingFeature = geojson_template.features.find(feature => feature.properties.GUID === sensor.guid);
                    if (matchingFeature) {
                        matchingFeature.properties["Soil Moisture"] = sensor.fields.soil_moisture_content;
                        // below 50 is low moisture
                        // 50 to 70 is medium moisture
                        // above 70 is high moisture
                        if (sensor.fields.soil_moisture_content < 50) {
                            this.mositure_content_low.geojson.features.push(matchingFeature);
                        } else if (sensor.fields.soil_moisture_content >= 50 && sensor.fields.soil_moisture_content < 70) {
                            this.mositure_content_medium.geojson.features.push(matchingFeature);
                        } else {
                            this.mositure_content_high.geojson.features.push(matchingFeature);
                        }
                        // if (sensor.fields.soil_moisture_content < 70) {
                        //     this.mositure_content_low.geojson.features.push(matchingFeature);
                        // } else {
                        //     this.mositure_content_high.geojson.features.push(matchingFeature);
                        // }
                    }
                });

                console.log("📊 Low moisture features:", this.mositure_content_low.geojson.features.length);
                console.log("📊 Medium moisture features:", this.mositure_content_medium.geojson.features.length);
                console.log("📊 High moisture features:", this.mositure_content_high.geojson.features.length);

                // if layerExists and startVisualisation is true, update the layer with 3DPOI
                if (this.layerExists && this.startVisualisation) {
                    this.UpdateLayerWith3DPOI();
                    console.log("Layer Exists, updating content");
                }
                // if (this.layerExists) {
                //     this.UpdateLayerWith3DPOI();
                //     console.log("Layer Exists, updating content");
                // }

                if (this.selectedItem) {
                    const matchingMoistureData = this.mqtt_data.find(sensor => sensor.guid === this.selectedItem.guid);
                    if (matchingMoistureData) {
                        this.selectedItem.moisture = matchingMoistureData.fields.soil_moisture_content;
                    }
                }
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
        },

        CreateLayerWith3DPOI() {
            this.platformAPI.publish("3DEXPERIENCity.Add3DPOI", this.mositure_content_low);
            // this.platformAPI.subscribe("3DEXPERIENCity.Add3DPOIReturn", res => {
            //     console.log("Mille Says Add3DPOIReturn", res);
            // });
            this.platformAPI.publish("3DEXPERIENCity.Add3DPOI", this.mositure_content_medium);
            this.platformAPI.publish("3DEXPERIENCity.Add3DPOI", this.mositure_content_high);
            // this.platformAPI.subscribe("3DEXPERIENCity.Add3DPOIReturn", res => {
            //     console.log("Mille Says Add3DPOIReturn", res);
            // });
            this.layerExists = true;
        },

        UpdateLayerWith3DPOI() {
            // console.log("Widget ID: ", widget.id);
            this.platformAPI.publish("3DEXPERIENCity.Update3DPOIContent", {
                widgetID: this.mositure_content_low.widgetID,
                layerID: "mositure_content_low",
                geojson: this.mositure_content_low.geojson
            });
            // this.platformAPI.subscribe("3DEXPERIENCity.Update3DPOIContentReturn", res => {
            //     console.log("Mille Says Update3DPOIContentReturn", res);
            // });

            this.platformAPI.publish("3DEXPERIENCity.Update3DPOIContent", {
                widgetID: this.mositure_content_medium.widgetID,
                layerID: "mositure_content_medium",
                geojson: this.mositure_content_medium.geojson
            });
            // this.platformAPI.subscribe("3DEXPERIENCity.Update3DPOIContentReturn", res => {
            //     console.log("Mille Says Update3DPOIContentReturn", res);
            // });
            this.platformAPI.publish("3DEXPERIENCity.Update3DPOIContent", {
                widgetID: this.mositure_content_high.widgetID,
                layerID: "mositure_content_high",
                geojson: this.mositure_content_high.geojson
            });
            // this.platformAPI.subscribe("3DEXPERIENCity.Update3DPOIContentReturn", res => {
            //     console.log("Mille Says Update3DPOIContentReturn", res);
            // });
        },

        removeContentLayers() {
            this.platformAPI.publish("3DEXPERIENCity.RemoveContent", "mositure_content_low");
            this.platformAPI.publish("3DEXPERIENCity.RemoveContent", "mositure_content_medium");
            this.platformAPI.publish("3DEXPERIENCity.RemoveContent", "mositure_content_high");
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
                        guid: selectedGuid,
                        moisture: matchingMoistureData.fields.soil_moisture_content
                    };
                } else {
                    this.selectedItem = null;
                }
            });
        },

        createTest3DPoi() {
            // Test point GeoJSON as provided
            const testPoi = {
                type: "FeatureCollection",
                crs: {
                    type: "name",
                    properties: {
                        name: "urn:ogc:def:crs:EPSG::7855"
                    }
                },
                features: [
                    {
                        type: "Feature",
                        properties: {
                            "GUID": "T_5B1BF197-8B46-4F41-A1D1-F28A26A42329",
                            "fruit_type": "Apple",
                            "row": 1,
                            "plot": 1,
                            "Soil Moisture": 1,
                            "color": "red"
                        },
                        geometry: {
                            type: "Point",
                            coordinates: [344778.2279388432, 5966176.809605619, 120.8]
                        }
                    },
                    {
                        type: "Feature",
                        properties: {
                            "GUID": "T_A855AB0F-45D5-43C9-9C9B-186B51EC0340",
                            "fruit_type": "Apple",
                            "row": 1,
                            "plot": 1,
                            "Soil Moisture": 0.2,
                            "color": "blue"
                        },
                        geometry: {
                            type: "Point",
                            coordinates: [344779.2232795422, 5966176.808613814, 120.8]
                        }
                    }
                ]
            };
            // Publish the 3D POI using the platform API
            this.platformAPI.publish("3DEXPERIENCity.Add3DPOI", {
                widgetID: widget.id,
                geojson: testPoi,
                layer: {
                    id: "test_poi_layer",
                    name: "Test POI Layer",
                    attributeMapping: {
                        "STRID": "GUID",
                        "NAME": "fruit_type",
                        "OPACITY": "Soil Moisture",
                        "COLOR": "color"
                    }
                },
                // render: {
                //     anchor: true,
                //     // color: "purple",
                //     scale: [1, 1, 3],
                //     shape: "tube",
                //     switchDistance: 500,
                //     // opacity: 1
                // }
            });
        }
    }
};
</script>

<style>
.selected-item-card {
    background-color: #f9f9f9;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 16px;
}

.selected-item-info {
    font-size: 14px;
    color: #333;
}
</style>
