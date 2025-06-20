<template>
    <v-container class="pa-4" fluid>
        <v-row justify="end">
            <v-col cols="12" md="8" lg="6">
                <div class="d-flex flex-row-reverse">
                    <v-btn color="primary" class="mb-4 ml-2" large @click="handleShowFarmAssets" aria-label="Show Farm Assets">
                        <v-icon left>mdi-tree</v-icon>
                        Show Farm Assets
                    </v-btn>
                    <v-btn color="secondary" class="mb-4 ml-2" large @click="visualiseFilteredData" aria-label="Visualise Farm Assets">
                        <v-icon left>mdi-chart-bar</v-icon>
                        Visualise Farm Assets
                    </v-btn>
                </div>

                <v-card v-if="showFarmAssets" elevation="4" rounded class="text-right">
                    <v-card-text>
                        <Dashboard ref="dashboardRef" />
                        <v-row dense>
                            <v-col cols="12" sm="6" class="d-flex justify-end">
                                <v-sheet class="pa-3 flex-grow-1 text-right" color="grey lighten-4" rounded>
                                    <div class="d-flex justify-space-between flex-row-reverse">
                                        <span class="font-weight-medium">Sensor ID</span>
                                        <span>{{ selectedItem && selectedItem.sensorId ? selectedItem.sensorId : "-" }}</span>
                                    </div>
                                </v-sheet>
                            </v-col>
                            <v-col cols="12" sm="6" class="d-flex justify-end">
                                <v-sheet class="pa-3 flex-grow-1 text-right" color="grey lighten-4" rounded>
                                    <div class="d-flex justify-space-between flex-row-reverse">
                                        <span class="font-weight-medium">Date/Time</span>
                                        <span>{{ selectedItem && selectedItem.datetime ? selectedItem.datetime : "-" }}</span>
                                    </div>
                                </v-sheet>
                            </v-col>
                            <v-col cols="12" sm="6" class="d-flex justify-end">
                                <v-sheet class="pa-3 flex-grow-1 text-right" color="grey lighten-4" rounded>
                                    <div class="d-flex justify-space-between flex-row-reverse">
                                        <span class="font-weight-medium">Moisture</span>
                                        <span>{{
                                            selectedItem && selectedItem.moisture !== undefined && selectedItem.moisture !== null ? selectedItem.moisture : "-"
                                        }}</span>
                                    </div>
                                </v-sheet>
                            </v-col>
                            <v-col cols="12" sm="6" class="d-flex justify-end">
                                <v-sheet class="pa-3 flex-grow-1 text-right" color="grey lighten-4" rounded>
                                    <div class="d-flex justify-space-between flex-row-reverse">
                                        <span class="font-weight-medium">Temperature</span>
                                        <span>{{
                                            selectedItem && selectedItem.temperature !== undefined && selectedItem.temperature !== null
                                                ? selectedItem.temperature
                                                : "-"
                                        }}</span>
                                    </div>
                                </v-sheet>
                            </v-col>
                        </v-row>
                    </v-card-text>
                </v-card>
            </v-col>
        </v-row>
    </v-container>
</template>

<script>
import { widget } from "@widget-lab/3ddashboard-utils";
import solarPanelGeoJSON from "@/assets/solar_panel_polygon.geojson";
import soilGeoJSON from "@/assets/sundial_orchard_soil_data.geojson";
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
            showFarmAssets: false,

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
                    geometricMode: "extruded",
                    color: "black",
                    opacity: 0.8,
                    extrusionHeight: 0.2
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
                    color: "white",
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
                    scale: [20, 20, 1],
                    shape: "disc",
                    switchDistance: 500,
                    opacity: 0.5
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
                    scale: [20, 20, 1],
                    shape: "disc",
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

            const baseFeatures = soilGeoJSON.features || (soilGeoJSON.default && soilGeoJSON.default.features) || [];
            this.SensorsLayer.geojson.features = [];
            this.soilMoistureLowLayer.geojson.features = [];
            this.soilMoistureNormalLayer.geojson.features = [];

            const allDateTimes = [...new Set(filteredData.map(d => d.dateTime))].sort();
            for (const dateTime of allDateTimes) {
                const sensorData = filteredData.filter(d => d.dateTime === dateTime);
                sensorData.forEach(d => {
                    const guid = d.sensorId;
                    const baseFeature = baseFeatures.find(f => String(f.properties.guid).trim() === String(guid).trim());
                    if (!baseFeature) return;
                    // Clone the feature to avoid mutating the original
                    const feature = JSON.parse(JSON.stringify(baseFeature));
                    const moistureObj = sensorData.find(x => x.measurementType.toLowerCase() === "moisture");
                    const tempObj = sensorData.find(x => x.measurementType.toLowerCase().includes("temp"));
                    feature.properties.moisture = moistureObj ? moistureObj.value : null;
                    feature.properties.temperature = tempObj ? tempObj.value : null;
                    console.log("Feature properties set:", feature.properties);
                    if (moistureObj && moistureObj.value < 25) {
                        this.soilMoistureLowLayer.geojson.features.push(feature);
                        console.log(`Low moisture detected for sensor ${guid} at ${dateTime}: ${moistureObj.value}`);
                    } else {
                        this.soilMoistureNormalLayer.geojson.features.push(feature);
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
        handleShowFarmAssets() {
            this.showFarmAssets = !this.showFarmAssets;
            if (this.showFarmAssets) {
                this.createSensorsLayer();
            } else {
                this.removeSensorsLayer && this.removeSensorsLayer();
            }
        }
    }
};
</script>
