<template>
    <v-app>
        <v-main>
            <v-container>
                <v-btn color="primary" @click="createSoilSensor3DPOI">Soil Sensor</v-btn>
                <!-- display solar data -->
                <h2>Soil Sensor Data</h2>
                <div>{{ soilData }}</div>
                <h2>Soil Moisture Low</h2>
                <div>{{ soilMoistureLowGeoJSON }}</div>
                <h2>Soil Moisture Normal</h2>
                <div>{{ soilMoistureNormalGeoJSON }}</div>
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
import treeGeoJSON from "@/assets/sundial_orchard_object_V2.geojson";
import soilGeoJSON from "@/assets/sundial_orchard_soil_data.geojson";
import { useGlobalStore } from "@/store/global";

export default {
    name: "App",
    data() {
        return {
            mqttClient: null,
            soilData: null,
            soilMoistureLowGeoJSON: null,
            soilMoistureNormalGeoJSON: null,
            baseGeoJSON: {
                type: "FeatureCollection",
                name: "sundial_orchard_soil_data",
                crs: { type: "name", properties: { name: "urn:ogc:def:crs:EPSG::7855" } },
                features: [
                    {
                        type: "Feature",
                        properties: null,
                        geometry: { type: "Point", coordinates: null }
                    },
                ]
            },

            soilDataLayer: {
                widgetID: widget.id,
                geojson: soilGeoJSON,
                layer: {
                    id: "soil_sensor_layer",
                    name: "soil_sensor_layer",
                    attributeMapping: {
                        STRID: "GUID"
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
                get geojson() { return this.soilMoistureLowGeoJSON; },
                layer: {
                    id: "soil_moisture_low_layer",
                    name: "soil_moisture_low_layer",
                    attributeMapping: {
                        STRID: "GUID"
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
                get geojson() { return this.soilMoistureNormalGeoJSON; },
                layer: {
                    id: "soil_moisture_normal_layer",
                    name: "soil_moisture_normal_layer",
                    attributeMapping: {
                        STRID: "GUID"
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
        // this.platformAPI = await requirejs("DS/PlatformAPI/PlatformAPI");
        // this.platformAPI.subscribe("3DEXPERIENCity.OnItemSelect", this.handleOnItemSelect);

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
                this.soilData = JSON.parse(message.toString());
                // Clone baseGeoJSON for low and normal
                this.soilMoistureLowGeoJSON = JSON.parse(JSON.stringify(this.baseGeoJSON));
                this.soilMoistureLowGeoJSON.features = [];
                this.soilMoistureNormalGeoJSON = JSON.parse(JSON.stringify(this.baseGeoJSON));
                this.soilMoistureNormalGeoJSON.features = [];

                if (Array.isArray(this.soilData) && soilGeoJSON && Array.isArray(soilGeoJSON.features)) {
                    this.soilData.forEach(sensor => {
                        const guid = sensor.guid;
                        const moisture = sensor.fields?.soil_moisture_content;
                        const temperature = sensor.fields?.temperature_celsius;
                        // Find matching feature by guid
                        const feature = soilGeoJSON.features.find(f => f.properties && (f.properties.guid === guid));
                        if (feature) {
                            // Clone the feature and update soil_moisture_content
                            const updatedFeature = JSON.parse(JSON.stringify(feature));
                            if (!updatedFeature.properties) updatedFeature.properties = {};
                            updatedFeature.properties.soil_moisture_content = moisture;
                            updatedFeature.properties.temperature_celsius = temperature;
                            updatedFeature.properties.timestamp = sensor.timestamp;
                            if (moisture < 20) {
                                this.soilMoistureLowGeoJSON.features.push(updatedFeature);
                            } else {
                                this.soilMoistureNormalGeoJSON.features.push(updatedFeature);
                            }
                        }
                    });
                }
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
        createSoilSensor3DPOI() {
            this.platformAPI.publish("3DEXPERIENCity.Add3DPOI", this.soilDataLayer);
        },
        updateSensor3DPOI() {
            this.platformAPI.publish("3DEXPERIENCity.Update3DPOIContent", this.soilMoistureLowLayer);
            this.platformAPI.publish("3DEXPERIENCity.Update3DPOIContent", this.soilMoistureNormalLayer);
        },
    }
};
</script>

<style></style>
