<template>
    <v-app>
        <v-main>
            <v-container>
                <!-- create a button to create layer -->
                <v-btn @click="createLayers">Create Layers</v-btn>
                <!-- create a button to update layer -->
                <v-btn @click="updateSensor3DPOI">Update Layers</v-btn>
                <!-- Time slider for historical visualization -->
                <v-row class="mt-4">
                    <v-col cols="12">
                        <v-range-slider
                            v-model="timeRange"
                            :min="timeSliderMin"
                            :max="timeSliderMax"
                            :step="1"
                            ticks
                            :tick-labels="timeSliderLabels"
                            label="Time Range"
                            thumb-label
                            :disabled="!csvLoaded"
                        ></v-range-slider>
                        <div v-if="csvLoaded">
                            <span>Start: {{ formatTimestamp(timeRange[0]) }}</span>
                            <span class="ml-4">End: {{ formatTimestamp(timeRange[1]) }}</span>
                        </div>
                    </v-col>
                </v-row>
                <v-row>
                    <v-col cols="12">
                        <v-btn :disabled="!csvLoaded || isPlaying" @click="startHistoricalVisualization">Start Historical Visualization</v-btn>
                        <v-btn :disabled="!isPlaying" @click="stopHistoricalVisualization">Stop Visualization</v-btn>
                    </v-col>
                </v-row>

                <!-- Display current historical data -->
                <v-row v-if="isPlaying && csvLoaded" class="mb-4">
                    <v-col cols="12">
                        <v-card outlined>
                            <v-card-title>Historical Data at {{ formatTimestamp(timeSliderLabels[playIndex]) }}</v-card-title>
                            <v-card-text>
                                <div v-for="data in historicalData.filter(d => d.timestamp === timeSliderLabels[playIndex])" :key="data.guid">
                                    <strong>Sensor:</strong> {{ data.guid }} | <strong>Soil Moisture:</strong> {{ data.soil_moisture_content }} |
                                    <strong>Temperature:</strong> {{ data.temperature_celsius }}
                                </div>
                            </v-card-text>
                        </v-card>
                    </v-col>
                </v-row>
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
const csvData = require('@/assets/soil_data_time_series.csv');

export default {
    name: "App",
    data() {
        return {
            mqttClient: null,
            selectedItem: null,
            soilData: null,

            // historical csv data
            csvLoaded: false,
            historicalData: [],
            timeSliderMin: 0,
            timeSliderMax: 0,
            timeSliderLabels: [],
            timeRange: [0, 0],
            isPlaying: false,
            playInterval: null,
            playIndex: 0,

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
                    scale: [10, 10, .5],
                    shape: "sphere",
                    switchDistance: 500,
                    type: "text",
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
                    color: "blue",
                    scale: [10, 10, .5],
                    shape: "sphere",
                    switchDistance: 500,
                    opacity: .5
                }
            },

        };
    },
    computed: {
        ...mapStores(useGlobalStore)
    },

    async mounted() {
        this.platformAPI = await requirejs("DS/PlatformAPI/PlatformAPI");
        // this.platformAPI.subscribe("3DEXPERIENCity.OnItemSelect", this.handleOnItemSelect);

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
                        const featureCopy = JSON.parse(JSON.stringify(matchingFeature));
                        featureCopy.properties.soilMoisture = soilMoistureContent;
                        featureCopy.properties.soilTemperature = temperature;

                        if (soilMoistureContent < 20) {
                            this.soilMoistureLowLayer.geojson.features.push(featureCopy);
                        } else {
                            this.soilMoistureNormalLayer.geojson.features.push(featureCopy);
                        }
                    }
                });
                if (!this.isPlaying) {
                    this.updateSensor3DPOI();
                }
            }
        });

        // Load and parse CSV
        this.loadHistoricalCSV();
    },

    beforeUnmount() {
        if (this.mqttClient) {
            this.mqttClient.end();
        }
    },

    methods: {
        handleOnItemSelect(res) {
            console.log("Selected item:", res);
        },

        createLayers() {
            this.platformAPI.publish("3DEXPERIENCity.Add3DPOI", this.treeLayer);
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
        },

        async loadHistoricalCSV() {
            // csvData is already an array of objects from csv-loader
            this.historicalData = csvData.map(row => ({
                timestamp: row.timestamp,
                guid: row.guid,
                soil_moisture_content: parseFloat(row.soil_moisture_content),
                temperature_celsius: parseFloat(row.temperature_celsius)
            }));
            // Get unique sorted timestamps
            const timestamps = [...new Set(this.historicalData.map(d => d.timestamp))].sort();
            this.timeSliderLabels = timestamps;
            this.timeSliderMin = 0;
            this.timeSliderMax = timestamps.length - 1;
            this.timeRange = [0, timestamps.length - 1];
            this.csvLoaded = true;
        },
        formatTimestamp(idx) {
            if (!this.timeSliderLabels[idx]) return "";
            return this.timeSliderLabels[idx].replace("T", " ");
        },
        startHistoricalVisualization() {
            this.isPlaying = true;
            // Do NOT stop MQTT, just start historical playback
            this.playIndex = this.timeRange[0];
            if (this.playInterval) clearInterval(this.playInterval);
            this.playInterval = setInterval(this.updateHistoricalPOI, 1000);
        },
        stopHistoricalVisualization() {
            this.isPlaying = false;
            if (this.playInterval) clearInterval(this.playInterval);
        },

        updateHistoricalPOI() {
            if (!this.isPlaying) return;
            const timestamps = this.timeSliderLabels;
            const currentTimestamp = timestamps[this.playIndex];
            // Filter data for current timestamp
            const dataSlice = this.historicalData.filter(d => d.timestamp === currentTimestamp);
            this.soilMoistureLowLayer.geojson.features = [];
            this.soilMoistureNormalLayer.geojson.features = [];
            dataSlice.forEach(data => {
                const soilMoistureContent = data.soil_moisture_content;
                const temperature = data.temperature_celsius;
                const matchingFeature = soilGeoJSON.features.find(feature => feature.properties && feature.properties.guid === data.guid);
                if (matchingFeature) {
                    const featureCopy = JSON.parse(JSON.stringify(matchingFeature));
                    featureCopy.properties.soilMoisture = soilMoistureContent;
                    featureCopy.properties.soilTemperature = temperature;
                    if (soilMoistureContent < 20) {
                        this.soilMoistureLowLayer.geojson.features.push(featureCopy);
                    } else {
                        this.soilMoistureNormalLayer.geojson.features.push(featureCopy);
                    }
                }
            });
            this.updateSensor3DPOI();
            if (this.playIndex < this.timeRange[1]) {
                this.playIndex++;
            } else {
                this.stopHistoricalVisualization();
            }
        }
    }
};
</script>

<style></style>
