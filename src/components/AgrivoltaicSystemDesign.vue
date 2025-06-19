<template>
    <div>
        <v-btn color="primary" class="ma-2" @click="createSolarPanelLayer">Show Solar Panels</v-btn>
        <v-card class="mb-4 pa-4" max-width="600" style="margin:0 auto;">
            <v-row>
                <v-col cols="12" sm="6">
                    <v-text-field
                        v-model.number="lrAngleInput"
                        label="Left Right Angle"
                        type="number"
                        min="0"
                        max="180"
                        outlined
                        dense
                    ></v-text-field>
                    <v-btn color="success" class="mt-2" @click="publishAngle('LR_Angle', lrAngleInput)">Set Left Right Angle</v-btn>
                </v-col>
                <v-col cols="12" sm="6">
                    <v-text-field
                        v-model.number="udAngleInput"
                        label="Up Down Angle"
                        type="number"
                        min="0"
                        max="90"
                        outlined
                        dense
                    ></v-text-field>
                    <v-btn color="success" class="mt-2" @click="publishAngle('UD_Angle', udAngleInput)">Set Up Down Angle</v-btn>
                </v-col>
            </v-row>
        </v-card>
        <v-card v-if="showSolarData && solarData" class="mb-4" elevation="4" rounded max-width="600" style="margin:0 auto;">
            <v-card-title class="text-primary">Solar Data</v-card-title>
            <v-card-text>
                <v-row>
                    <v-col cols="6" sm="4" v-for="(value, key) in solarData" :key="key">
                        <v-sheet class="pa-2 mb-2" color="#f5f5f5" rounded>
                            <span class="font-weight-bold">{{ key }}:</span>
                            <span class="ml-2">{{ value }}</span>
                        </v-sheet>
                    </v-col>
                </v-row>
            </v-card-text>
        </v-card>
    </div>
</template>

<script>
import mqtt from "mqtt";
import solarPanelGeoJSON from "@/assets/solar_panel_polygon.geojson";
import { widget } from "@widget-lab/3ddashboard-utils";

export default {
    name: "AgrivoltaicSystemDesign",

    data() {
        return {
            mqttClient: null,
            solarData: null, // Add this to store the latest solar data
            lrAngleInput: 0, // User input for LR angle
            udAngleInput: 0, // User input for UD angle
            showSolarData: false, // Controls solar data card visibility
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
            }
        };
    },

    async mounted() {
        this.platformAPI = await requirejs("DS/PlatformAPI/PlatformAPI");
        this.platformAPI.subscribe("3DEXPERIENCity.OnItemSelect", this.handleOnItemSelect);

        const options = {
            protocol: "wss",
            hostname: "mqtt-sooft.duckdns.org",
            port: 443,
            clientId: "vue-client-" + Math.random().toString(16).substr(2, 8)
        };
        this.mqttClient = mqtt.connect(options);
        this.mqttClient.on("connect", () => {});

        // subscribe to the topic "solar"
        this.mqttClient.subscribe("solar", (err) => {
            if (!err) {
                console.log("Subscribed to solar topic");
            } else {
                console.error("Subscription error:", err);
            }
        });
        this.mqttClient.on("message", (topic, message) => {
            if (topic === "solar") {
                const data = JSON.parse(message.toString());
                this.solarData = data; // Store the received data for display
            }
        });

    },
    beforeUnmount() {
        if (this.mqttClient) {
            this.mqttClient.end();
        }
        if (this.playInterval) {
            clearInterval(this.playInterval);
        }
    },

    methods:{
        publishAngle(type, value) {
            if (this.mqttClient && (type === 'LR_Angle' || type === 'UD_Angle')) {
                let msg = '';
                if (type === 'LR_Angle') {
                    msg = `lr:${value}`;
                } else if (type === 'UD_Angle') {
                    msg = `ud:${value}`;
                }
                this.mqttClient.publish('solar/motor', msg);
            }
        },
        createSolarPanelLayer() {
            this.platformAPI.publish("3DEXPERIENCity.AddPolygon", this.solarPanelLayer);
            this.showSolarData = true; // Show solar data card when button is clicked
        },
    }
};
</script>
