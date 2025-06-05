<template>
    <v-app>
        <v-main>
            <v-container>
                <v-row justify="end">
                    <v-col cols="auto">
                        <v-tabs v-model="activeTab" align-tabs="end">
                            <v-tab value="management">Management</v-tab>
                            <v-tab value="agrivoltaic">Agrivoltaic System Design</v-tab>
                            <v-tab value="yield">Yield Estimation</v-tab>
                        </v-tabs>
                    </v-col>
                </v-row>
                <v-row>
                    <v-col cols="12">
                        <component :is="currentTabComponent" />
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
import solarPanelGeoJSON from "@/assets/solar_panel_polygon.geojson";
import soilGeoJSON from "@/assets/sundial_orchard_soil_data.geojson";
import treeGeoJSON from "@/assets/sundial_orchard_tree.geojson";
import { useGlobalStore } from "@/store/global";
import Management from "@/components/Management.vue";
import AgrivoltaicSystemDesign from "@/components/AgrivoltaicSystemDesign.vue";
import YieldEstimation from "@/components/YieldEstimation.vue";

const csvData = require("@/assets/soil_data_time_series.csv");

export default {
    name: "App",
    components: {
        Management,
        AgrivoltaicSystemDesign,
        YieldEstimation
    },
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

            solarPanelLayer: {
                widgetID: widget.id,
                geojson: solarPanelGeoJSON,
                layer: {
                    id: "solarPanelLayer",
                    name: "solarPanelLayer",
                    attributeMapping: {
                        STRID: "id"
                    }
                },
                render: {
                    color: "black",
                    extrusionHeight: 10,
                }
            },

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
            },
            activeTab: 'management',
        };
    },
    computed: {
        ...mapStores(useGlobalStore),
        currentTabComponent() {
            switch (this.activeTab) {
                case 'management':
                    return 'Management';
                case 'agrivoltaic':
                    return 'AgrivoltaicSystemDesign';
                case 'yield':
                    return 'YieldEstimation';
                default:
                    return 'Management';
            }
        }
    },

    async mounted() {
        // this.platformAPI = await requirejs("DS/PlatformAPI/PlatformAPI");

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

        createPolygonLayer() {
            this.platformAPI.publish("3DEXPERIENCity.AddPolygon", this.solarPanelLayer);
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
