<template>
    <div>
        <v-btn @click="createSensorsLayer">Show IoT Devices</v-btn>
        <v-btn @click="removeSensorsLayer">Hide IoT Devices</v-btn>
        <v-btn @click="visualiseFilteredData">Visualise Data</v-btn>
        <v-card class="mt-4 selected-item-card">
            <v-card-title>Selected Sensor Information</v-card-title>
            <v-card-text>
                <div class="selected-item-info">
                    <p><strong>Sensor ID:</strong> {{ selectedID }}</p>
                    <p v-if="selectedItem"><strong>Date/Time:</strong> {{ selectedItem.datetime }}</p>
                    <p v-if="selectedItem"><strong>Moisture:</strong> {{ selectedItem.moisture }}</p>
                    <p v-if="selectedItem"><strong>Temperature:</strong> {{ selectedItem.temperature }}</p>
                </div>
            </v-card-text>
        </v-card>
        <Dashboard ref="dashboardRef" />
    </div>
</template>

<script>
import mqtt from "mqtt";
import { widget } from "@widget-lab/3ddashboard-utils";
import soilGeoJSON from "@/assets/sundial_orchard_soil_data.geojson";
import treeGeoJSON from "@/assets/sundial_orchard_tree.geojson";
import Dashboard from "./Dashboard.vue";

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
            selectedID: null,
            selectedItem: null,

            // csvLoaded: false,
            // historicalData: [],
            // timeSliderMin: 0,
            // timeSliderMax: 0,
            // timeSliderLabels: [],
            // timeRange: [0, 0],
            // isPlaying: false,
            // playInterval: null,
            // playIndex: 0,
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
        this.platformAPI = await requirejs("DS/PlatformAPI/PlatformAPI");
        this.platformAPI.subscribe("3DEXPERIENCity.OnItemSelect", this.handleOnItemSelect);

        // const options = {
        //     protocol: "wss",
        //     hostname: "mqtt-sooft.duckdns.org",
        //     port: 443,
        //     clientId: "vue-client-" + Math.random().toString(16).substr(2, 8)
        // };
        // this.mqttClient = mqtt.connect(options);
        // this.mqttClient.on("connect", () => {});
    },
    // beforeUnmount() {
    //     if (this.mqttClient) {
    //         this.mqttClient.end();
    //     }
    //     if (this.playInterval) {
    //         clearInterval(this.playInterval);
    //     }
    // },
    methods: {
        handleOnItemSelect(res) {
            this.platformAPI.publish("3DEXPERIENCity.GetSelectedItems", res);
            this.platformAPI.subscribe("3DEXPERIENCity.GetSelectedItemsReturn", res => {
                if (res.data && res.data.length > 0) {
                    this.selectedID = res.data[0].userData.guid;
                    // const sensorId = res.data[0].userData.guid;

                    // this.selectedItem = {
                    //     sensorId: sensorId,
                    //     moisture: null,
                    //     temperature: null
                    // };
                    // } else {
                    // this.selectedItem = null;
                }
            });
        },
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
            if (Array.isArray(this.SensorsLayer.geojson.features) && this.SensorsLayer.geojson.features.length > 0) {
                this.platformAPI.publish("3DEXPERIENCity.Update3DPOIContent", {
                    widgetID: this.SensorsLayer.widgetID,
                    layerID: this.SensorsLayer.layer.id,
                    geojson: this.SensorsLayer.geojson
                });
            }
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
            const dashboard = this.$refs.dashboardRef;
            const filteredData = dashboard.filteredData;
            if (!filteredData || !filteredData.length) return;
            const allDateTimes = [...new Set(filteredData.map(d => d.dateTime))].sort();
            // console.log("All DateTimes:", allDateTimes);
            for (const dateTime of allDateTimes) {
                // delay for one second
                // await new Promise(resolve => setTimeout(resolve, 1000));
                const sensorData = filteredData.filter(d => d.dateTime === dateTime);
                sensorData.forEach(d => {
                    const guid = d.sensorId;
                    // const moisture = d.moisture;
                    // const temperature = d.temperature;
                    // console.log("selectedID:", this.selectedID, typeof this.selectedID);
                    // console.log("guid:", guid, typeof guid);

                    if (this.selectedID && String(this.selectedID).trim() === String(guid).trim()) {
                        // Find both moisture and temperature for this sensor and datetime
                        const moistureObj = sensorData.find(x => x.measurementType.toLowerCase() === "moisture");
                        const tempObj = sensorData.find(x => x.measurementType.toLowerCase().includes("temp"));
                        this.selectedItem = {
                            datetime: dateTime,
                            sensorId: guid,
                            moisture: moistureObj ? moistureObj.value : null,
                            temperature: tempObj ? tempObj.value : null
                        };
                        console.log("Selected Item:", this.selectedItem);
                    }
                });
            }

            const updatedGeoJSON = JSON.parse(JSON.stringify(this.SensorsLayer.geojson));
            updatedGeoJSON.features.forEach(feature => {
                const guid = feature.properties.guid;
                const sensorData = filteredData.filter(d => d.sensorId == guid);
                if (sensorData && sensorData.length) {
                    let moisture = null;
                    let temperature = null;
                    for (const d of sensorData) {
                        if (d.measurementType === "moisture") moisture = d.value;
                        if (d.measurementType.toLowerCase().includes("temp")) temperature = d.value;
                    }
                    feature.properties.moisture = moisture;
                    feature.properties.temperature = temperature;
                }
            });
            this.SensorsLayer.geojson = updatedGeoJSON;
            this.updateSensor3DPOI();
            await new Promise(res => setTimeout(res, 2000));
        }
    }
    // watch: {
    //     'SensorsLayer.geojson': {
    //         handler(newGeojson) {
    //             if (this.selectedItem && this.selectedItem.sensorId) {
    //                 const feature = newGeojson.features.find(f => f.properties.guid == this.selectedItem.sensorId);
    //                 if (feature) {
    //                     this.selectedItem.moisture = feature.properties.moisture;
    //                     this.selectedItem.temperature = feature.properties.temperature;
    //                 }
    //             }
    //         },
    //         deep: true
    //     }
    // }
};
</script>
