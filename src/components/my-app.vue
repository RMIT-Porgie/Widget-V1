<template>
    <v-app>
        <v-main>
            <v-container style="background: white; min-height: 100vh">
                <h1>Hello World From RMIT</h1>

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
                    opacity: .5
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
                    color: "blue",
                    scale: [1, 1, 3],
                    shape: "tube",
                    switchDistance: 500,
                    opacity: .5
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
                    color: "blue",
                    scale: [1, 1, 5],
                    shape: "tube",
                    switchDistance: 500,
                    opacity: .5
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

                if (this.layerExists) {
                    this.UpdateLayerWith3DPOI();
                    console.log("Layer Exists, updating content");
                }

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
                        guid: selectedGuid
                    };
                } else {
                    this.selectedItem = null;
                }
            });
        }
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
