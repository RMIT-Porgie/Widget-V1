<template>
    <v-app>
        <v-main>
            <v-container>
                                
                <!-- create a button to create layer -->
                <v-btn @click="createLayers">Create Layers</v-btn>
                <!-- create a button to update layer -->
                <v-btn @click="updateSensor3DPOI">Update Layers</v-btn>
                <!-- soil Data -->
                <h2>Soil Sensor Data</h2>
                <div>{{ soilData }}</div>
                <h2>Soil Moisture Low</h2>
                <div>{{ soilMoistureLowLayer }}</div>
                <h2>Soil Moisture Normal</h2>
                <div>{{ soilMoistureNormalLayer }}</div>

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
import soilGeoJSON from "@/assets/sundial_orchard_soil_data.geojson";
import treeGeoJSON from "@/assets/sundial_orchard_tree.geojson";
import { useGlobalStore } from "@/store/global";

export default {
    name: "App",
    data() {
        return {
            mqttClient: null,
            soilData: null,

            treeLayer: {
                widgetID: widget.id,
                geojson: treeGeoJSON,
                layer: {
                    id: "treeLayer",
                    name: "treeLayer",
                    attributeMapping: {
                        STRID: "guid"
                    }
                },
                render: {
                    anchor: true,
                    color: "green",
                    scale: [0.5, 0.5, 2],
                    shape: "tube",
                    switchDistance: 500,
                    opacity: 0.5
                }
            },

             soilLayer: {
                widgetID: widget.id,
                geojson: soilGeoJSON,
                layer: {
                    id: "soilLayer",
                    name: "soilLayer",
                    attributeMapping: {
                        STRID: "guid"
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

            soilMoistureLowLayer: {
                widgetID: widget.id,
                geojson: {
                    type: "FeatureCollection",
                    name: "soil_moisture_low_data",
                    crs: { type: "name", properties: { name: "urn:ogc:def:crs:EPSG::7855" } },
                    features: []
                },
                layer: {
                    id: "soilMoistureLowLayer",
                    name: "soilMoistureLowLayer",
                    attributeMapping: {
                        STRID: "guid"
                    }
                },
                render: {
                    anchor: true,
                    color: "red",
                    scale: [1, 1, 1],
                    shape: "tube",
                    switchDistance: 500,
                    opacity: 1
                }
            },

            soilMoistureNormalLayer: {
                widgetID: widget.id,
                geojson: {
                    type: "FeatureCollection",
                    name: "soilMoistureNormalData",
                    crs: { type: "name", properties: { name: "urn:ogc:def:crs:EPSG::7855" } },
                    features: []
                },
                layer: {
                    id: "soilMoistureNormalLayer",
                    name: "soilMoistureNormalLayer",
                    attributeMapping: {
                        STRID: "guid"
                    }
                },
                render: {
                    anchor: true,
                    color: "green",
                    scale: [1, 1, 1],
                    shape: "tube",
                    switchDistance: 500,
                    opacity: 1
                }
            }
        };
    },
    computed: {
        ...mapStores(useGlobalStore)
    },

    async mounted() {
        this.platformAPI = await requirejs("DS/PlatformAPI/PlatformAPI");
        this.platformAPI.subscribe("3DEXPERIENCity.OnItemSelect", this.handleOnItemSelect);

        // this.createLayers();

        const options = {
            protocol: "wss",
            hostname: "mqtt-sooft.duckdns.org",
            port: 443,
            clientId: "vue-client-" + Math.random().toString(16).substr(2, 8)
        };

        this.mqttClient = mqtt.connect(options);

        this.mqttClient.on("connect", () => {
            console.log("✅ Connected to MQTT broker");
            this.mqttClient.subscribe("sensor/soil", err => {
                if (!err) {
                    console.log("✅ Subscribed ");
                }
            });
        });

        this.mqttClient.on("message", (topic, message) => {
            if (topic === "sensor/soil") {
                this.soilMoistureLowLayer.geojson.features = [];
                this.soilMoistureNormalLayer.geojson.features = [];

                this.soilData = JSON.parse(message.toString());
                this.soilData.forEach(data => {
                    const soilMoistureContent = data.fields.soil_moisture_content;
                    const temperature = data.fields.temperature_celsius;
                    const matchingFeature = soilGeoJSON.features.find(feature => feature.properties && feature.properties.guid === data.guid);
                    if (matchingFeature) {
                        // Clone the feature to avoid mutating the original
                        const featureCopy = JSON.parse(JSON.stringify(matchingFeature));
                        // Always add or update soilMoisture and soilTemperature keys in properties
                        // featureCopy.properties = featureCopy.properties || {};
                        featureCopy.properties.soilMoisture = soilMoistureContent;
                        featureCopy.properties.soilTemperature = temperature;

                        if (soilMoistureContent < 20) {
                            this.soilMoistureLowLayer.geojson.features.push(featureCopy);
                        } else {
                            this.soilMoistureNormalLayer.geojson.features.push(featureCopy);
                        }
                    }
                });
                // this.updateSensor3DPOI();
            }
        });
    },

    beforeUnmount() {
        if (this.mqttClient) {
            this.mqttClient.end();
        }
    },

    methods: {
        createLayers() {
            // this.platformAPI.publish("3DEXPERIENCity.Add3DPOI", this.treeLayer);
            this.platformAPI.publish("3DEXPERIENCity.Add3DPOI", this.soilLayer);
            this.platformAPI.publish("3DEXPERIENCity.Add3DPOI", this.soilMoistureLowLayer);
            this.platformAPI.publish("3DEXPERIENCity.Add3DPOI", this.soilMoistureNormalLayer);
        },

        updateSensor3DPOI() {
            if (Array.isArray(this.soilMoistureLowLayer.geojson.features) && this.soilMoistureLowLayer.geojson.features.length > 0) {
                this.platformAPI.publish("3DEXPERIENCity.Update3DPOIContent", {
                    widgetID: this.soilMoistureLowLayer.widgetID,
                    layerID: this.soilMoistureLowLayer.layer.id,
                    geojson: this.soilMoistureLowLayer.geojson
                });
            }
            if (Array.isArray(this.soilMoistureNormalLayer.geojson.features) && this.soilMoistureNormalLayer.geojson.features.length > 0) {
                this.platformAPI.publish("3DEXPERIENCity.Update3DPOIContent", {
                    widgetID: this.soilMoistureNormalLayer.widgetID,
                    layerID: this.soilMoistureNormalLayer.layer.id,
                    geojson: this.soilMoistureNormalLayer.geojson
                });
            }
        }
    }
};
</script>

<style></style>
