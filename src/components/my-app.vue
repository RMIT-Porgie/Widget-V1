<template>
    <v-app>
        <v-main>
            <v-container>
                <v-btn color="primary" @click="createSoilSensor3DPOI">Soil Sensor</v-btn>
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

            soilDataLayer: {
                widgetID: widget.id,
                geojson: soilGeoJSON,
                layer: {
                    id: "soil_sensor_layer",
                    name: "soil_sensor_layer",
                    attributeMapping: {
                        "STRID": "GUID",
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
                geojson: null,
                layer: {
                    id: "soil_moisture_low_layer",
                    name: "soil_moisture_low_layer",
                    attributeMapping: {
                        "STRID": "GUID",
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
                geojson: null,
                layer: {
                    id: "soil_moisture_normal_layer",
                    name: "soil_moisture_normal_layer",
                    attributeMapping: {
                        "STRID": "GUID",
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
            },
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
                this.soilData = JSON.parse(message.toString());
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
        }

    }
};
</script>

<style></style>
