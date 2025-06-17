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
            // selectedID: "9166378",
            selectedItem: null,

            // treeLayer: {
            //     widgetID: widget.id,
            //     geojson: treeGeoJSON,
            //     layer: {
            //         id: "treeLayer",
            //         name: "treeLayer",
            //         attributeMapping: {
            //             STRID: "guid"
            //         }
            //     },
            //     render: {
            //         anchor: true,
            //         color: "green",
            //         scale: [0.5, 0.5, 2],
            //         shape: "tube",
            //         switchDistance: 500,
            //         opacity: 0.5
            //     }
            // },

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
                    scale: [20, 20, 1],
                    shape: "disc",
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
            }
        };
    },
    async mounted() {
        this.platformAPI = await requirejs("DS/PlatformAPI/PlatformAPI");
        this.platformAPI.subscribe("3DEXPERIENCity.OnItemSelect", this.handleOnItemSelect);
    },

    methods: {
        handleOnItemSelect(res) {
            this.platformAPI.publish("3DEXPERIENCity.GetSelectedItems", res);
            this.platformAPI.subscribe("3DEXPERIENCity.GetSelectedItemsReturn", res => {
                if (res.data && res.data.length > 0) {
                    this.selectedID = res.data[0].userData.guid;
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

            // Debug: Check structure of soilGeoJSON import
            console.log('soilGeoJSON:', soilGeoJSON);
            console.log('soilGeoJSON.features:', soilGeoJSON.features);
            console.log('soilGeoJSON.default:', soilGeoJSON.default);
            console.log('soilGeoJSON.default?.features:', soilGeoJSON.default?.features);

            // Use the correct features array depending on import style
            const baseFeatures = soilGeoJSON.features || (soilGeoJSON.default && soilGeoJSON.default.features) || [];
            console.log('Available guids:', baseFeatures.map(f => f.properties.guid));

            // Clear previous features
            this.soilMoistureLowLayer.geojson.features = [];
            this.SensorsLayer.geojson.features = [];

            const allDateTimes = [...new Set(filteredData.map(d => d.dateTime))].sort();
            for (const dateTime of allDateTimes) {
                const sensorData = filteredData.filter(d => d.dateTime === dateTime);
                sensorData.forEach(d => {
                    const guid = d.sensorId;
                    console.log(`Processing sensor ${guid} at ${dateTime}`);
                    // Find the matching feature in the original geojson
                    const baseFeature = baseFeatures.find(f => String(f.properties.guid).trim() === String(guid).trim());
                    console.log('Base feature found:', baseFeature);
                    if (!baseFeature) return;
                    // Clone the feature to avoid mutating the original
                    const feature = JSON.parse(JSON.stringify(baseFeature));
                    // Find moisture and temperature values for this sensor at this time
                    const moistureObj = sensorData.find(x => x.measurementType.toLowerCase() === "moisture");
                    const tempObj = sensorData.find(x => x.measurementType.toLowerCase().includes("temp"));
                    feature.properties.moisture = moistureObj ? moistureObj.value : null;
                    feature.properties.temperature = tempObj ? tempObj.value : null;
                    console.log('Feature properties set:', feature.properties);
                    if (moistureObj && moistureObj.value < 30) {
                        this.soilMoistureLowLayer.geojson.features.push(feature);
                        console.log(`Low moisture detected for sensor ${guid} at ${dateTime}: ${moistureObj.value}`);
                    } else {
                        this.SensorsLayer.geojson.features.push(feature);
                        if (moistureObj) {
                            console.log(`Normal moisture for sensor ${guid} at ${dateTime}: ${moistureObj.value}`);
                        }
                    }
                    if (this.selectedID && String(this.selectedID).trim() === String(guid).trim()) {
                        this.selectedItem = {
                            datetime: dateTime,
                            sensorId: guid,
                            moisture: feature.properties.moisture,
                            temperature: feature.properties.temperature
                        };
                    }
                });
                this.updateSensor3DPOI();
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        },


        // async visualiseFilteredData() {
        //     const dashboard = this.$refs.dashboardRef;
        //     const filteredData = dashboard.filteredData;
        //     if (!filteredData || !filteredData.length) return;
        //     // Clear previous low moisture features
        //     this.soilMoistureLowLayer.geojson.features = [];
        //     this.SensorsLayer.geojson.features = [];
        //     const allDateTimes = [...new Set(filteredData.map(d => d.dateTime))].sort();
        //     for (const dateTime of allDateTimes) {
        //         const sensorData = filteredData.filter(d => d.dateTime === dateTime);
        //         sensorData.forEach(d => {
        //             const guid = d.sensorId;
        //             console.log(`Processing sensor ${guid} at ${dateTime}`);
        //             const baseFeature = soilGeoJSON.features.find(f => String(f.properties.guid).trim() === String(guid).trim());
        //             console.log("Looking for guid:", guid);
        //             console.log(
        //                 "Available guids:",
        //                 soilGeoJSON.features.map(f => f.properties.guid)
        //             );
        //             console.log("Base feature found:", baseFeature);
        //             if (!baseFeature) return;
        //             // Clone the feature to avoid mutating the original
        //             const feature = JSON.parse(JSON.stringify(baseFeature));

        //             // Find moisture and temperature values for this sensor at this time
        //             const moistureObj = sensorData.find(x => x.measurementType.toLowerCase() === "moisture");
        //             const tempObj = sensorData.find(x => x.measurementType.toLowerCase().includes("temp"));
        //             feature.properties.moisture = moistureObj ? moistureObj.value : null;
        //             feature.properties.temperature = tempObj ? tempObj.value : null;
        //             console.log("Feature properties set:", feature.properties);
        //             if (moistureObj && moistureObj.value < 30) {
        //                 // Add to soilMoistureLowLayer
        //                 this.soilMoistureLowLayer.geojson.features.push(feature);
        //                 console.log("Low moisture feature added:");
        //                 console.log(feature);
        //                 console.log(`Low moisture detected for sensor ${guid} at ${dateTime}: ${moistureObj.value}`);
        //             } else {
        //                 // Add to SensorsLayer
        //                 this.SensorsLayer.geojson.features.push(feature);
        //                 console.log("Normal moisture feature added:");
        //                 console.log(feature);
        //                 console.log(`Normal moisture for sensor ${guid} at ${dateTime}: ${moistureObj.value}`);
        //             }
        //             if (this.selectedID && String(this.selectedID).trim() === String(guid).trim()) {
        //                 this.selectedItem = {
        //                     datetime: dateTime,
        //                     sensorId: guid,
        //                     moisture: feature.properties.moisture,
        //                     temperature: feature.properties.temperature
        //                 };
        //             }
        //         });
        //         this.updateSensor3DPOI();
        //         await new Promise(resolve => setTimeout(resolve, 1000));
        //     }
        // }


    }
};
</script>
