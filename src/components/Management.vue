<template>
    <div>
        <v-btn @click="createSensorsLayer">Show IoT Devices</v-btn>
        <!-- <v-btn @click="removeSensorsLayer">Hide IoT Devices</v-btn> -->
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
import solarPanelGeoJSON from "@/assets/solar_panel_polygon.geojson";
// import treeGeoJSON from "@/assets/sundial_orchard_tree.geojson";
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
                    geometricMode:"extruded",
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
            // if (Array.isArray(this.SensorsLayer.geojson.features) && this.SensorsLayer.geojson.features.length > 0) {
            //     this.platformAPI.publish("3DEXPERIENCity.Update3DPOIContent", {
            //         widgetID: this.SensorsLayer.widgetID,
            //         layerID: this.SensorsLayer.layer.id,
            //         geojson: this.SensorsLayer.geojson
            //     });
            // }
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
        }
    }
};
</script>

<style scoped>
:root {
    --primary-color: #1976d2;
    --secondary-color: #f5f5f5;
    --card-radius: 12px;
    --card-shadow: 0 2px 12px rgba(25, 118, 210, 0.08);
    --card-padding: 24px 16px 8px 16px;
}

.v-btn {
    font-weight: 500;
    border-radius: 8px;
    margin: 8px 8px 8px 0;
    min-width: 140px;
    letter-spacing: 0.5px;
}

.selected-item-card, .solar-data-display {
    max-width: 600px;
    margin: 24px auto 0 auto;
    background: #fff;
    border-radius: var(--card-radius);
    box-shadow: var(--card-shadow);
    padding: var(--card-padding);
}

.selected-item-info p {
    margin: 8px 0;
    font-size: 1.05rem;
    color: #333;
}

.v-card-title, .headline {
    color: var(--primary-color);
    font-weight: 600;
    margin-bottom: 12px;
    font-size: 1.2rem;
}

.v-card-text {
    padding-top: 0;
}

.solar-data-display .v-sheet {
    background: var(--secondary-color);
    border-radius: 8px;
    font-size: 1rem;
    color: #222;
}

.solar-data-display .font-weight-bold {
    color: var(--primary-color);
}

@media (max-width: 700px) {
    .selected-item-card, .solar-data-display {
        max-width: 98vw;
        padding: 16px 4px 8px 4px;
    }
}
</style>
