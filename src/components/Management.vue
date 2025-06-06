<template>
    <div>
        <h2>Management</h2>
        <v-btn @click="createSensorsLayer">Show IoT Devices</v-btn>
        <v-btn @click="removeSensorsLayer">Hide IoT Devices</v-btn>
        <v-btn @click="visualiseFilteredData">Visualise Data</v-btn>
        <Dashboard ref="dashboardRef" />
    </div>
</template>

<script>
import mqtt from "mqtt";
import { widget } from "@widget-lab/3ddashboard-utils";
import soilGeoJSON from "@/assets/sundial_orchard_soil_data.geojson";
import treeGeoJSON from "@/assets/sundial_orchard_tree.geojson";
import Dashboard from "./Dashboard.vue";

// const csvData = require("@/assets/soil_data_time_series.csv");

export default {
    name: "Management",
    components: {
        Dashboard
    },
    data() {
        return {
            mqttClient: null,
            platformAPI: null,
            soilData: null,
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

            SensorsLayer: {
                widgetID: widget.id,
                geojson: soilGeoJSON,
                layer: {
                    id: "IoTSensorsLayer",
                    name: "IoTSensorsLayer",
                    attributeMapping: {
                        STRID: "guid"
                    }
                },
                render: {
                    anchor: true,
                    color: "orange",
                    scale: [5, 5, 5],
                    shape: "sphere",
                    switchDistance: 500,
                    opacity: 1
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
                    scale: [10, 10, 0.5],
                    shape: "sphere",
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
                    color: "blue",
                    scale: [10, 10, 0.5],
                    shape: "sphere",
                    switchDistance: 500,
                    opacity: 0.5
                }
            }
        };
    },
    async mounted() {
        // this.platformAPI = await requirejs("DS/PlatformAPI/PlatformAPI");
        // this.loadHistoricalCSV();
        const options = {
            protocol: "wss",
            hostname: "mqtt-sooft.duckdns.org",
            port: 443,
            clientId: "vue-client-" + Math.random().toString(16).substr(2, 8)
        };
        this.mqttClient = mqtt.connect(options);
        this.mqttClient.on("connect", () => {});
    },
    beforeUnmount() {
        if (this.mqttClient) {
            this.mqttClient.end();
        }
        if (this.playInterval) {
            clearInterval(this.playInterval);
        }
    },
    methods: {
        createSensorsLayer() {
            this.platformAPI.publish("3DEXPERIENCity.Add3DPOI", this.SensorsLayer);
            this.platformAPI.publish("3DEXPERIENCity.Add3DPOI", this.soilMoistureLowLayer);
            this.platformAPI.publish("3DEXPERIENCity.Add3DPOI", this.soilMoistureNormalLayer);
        },

        removeSensorsLayer() {
            this.platformAPI.publish("3DEXPERIENCity.RemoveContent", this.SensorsLayer.layer.id);
            this.platformAPI.publish("3DEXPERIENCity.RemoveContent", this.soilMoistureLowLayer.layer.id);
            this.platformAPI.publish("3DEXPERIENCity.RemoveContent", this.soilMoistureNormalLayer.layer.id);
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
        async visualiseFilteredData() {
            // Get filteredData from Dashboard via ref
            const dashboard = this.$refs.dashboardRef;
            if (!dashboard) return;
            const filteredData = dashboard.filteredData;
            if (!filteredData || !filteredData.length) return;

            // Clone geojson to avoid mutating import
            const updatedGeoJSON = JSON.parse(JSON.stringify(this.SensorsLayer.geojson));

            // Group filteredData by sensorId
            const grouped = {};
            filteredData.forEach(d => {
                if (!grouped[d.sensorId]) grouped[d.sensorId] = [];
                grouped[d.sensorId].push(d);
            });

            // For each feature, update properties if guid matches sensorId
            updatedGeoJSON.features.forEach(feature => {
                const guid = feature.properties.guid;
                const sensorData = grouped[guid];
                if (sensorData) {
                    // Get latest moisture and temperature values
                    let latestMoisture = null;
                    let latestTemp = null;
                    // Sort by dateTime descending
                    const sorted = [...sensorData].sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));
                    for (const d of sorted) {
                        if (d.measurementType === "moisture" && latestMoisture === null) {
                            latestMoisture = d.value;
                        }
                        if (d.measurementType.toLowerCase().includes("temp") && latestTemp === null) {
                            latestTemp = d.value;
                        }
                        if (latestMoisture !== null && latestTemp !== null) break;
                    }
                    feature.properties.moisture = latestMoisture;
                    feature.properties.temperature = latestTemp;
                }
            });

            // Update SensorsLayer geojson and visualise
            this.SensorsLayer.geojson = updatedGeoJSON;
            this.updateSensor3DPOI();
        },
    }
};
</script>
