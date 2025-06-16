<template>
    <div>
        <h2 class="title">Agrivoltaic System Design</h2>
        <v-btn color="primary" class="mb-4" @click="$emit('create-polygon-layer')">Create SolarPanel</v-btn>
        <!-- Angle Controls -->
        <v-card class="mb-4 pa-4" max-width="600" style="margin:0 auto;">
            <v-row>
                <v-col cols="12" sm="6">
                    <v-text-field
                        v-model.number="lrAngleInput"
                        label="Set LR Angle"
                        type="number"
                        min="0"
                        max="180"
                        outlined
                        dense
                    ></v-text-field>
                    <v-btn color="success" @click="publishAngle('LR_Angle', lrAngleInput)">Set LR Angle</v-btn>
                </v-col>
                <v-col cols="12" sm="6">
                    <v-text-field
                        v-model.number="udAngleInput"
                        label="Set UD Angle"
                        type="number"
                        min="0"
                        max="90"
                        outlined
                        dense
                    ></v-text-field>
                    <v-btn color="success" @click="publishAngle('UD_Angle', udAngleInput)">Set UD Angle</v-btn>
                </v-col>
            </v-row>
        </v-card>
        <!-- Display solar data if available -->
        <v-card v-if="solarData" class="solar-data-display" elevation="4">
            <v-card-title class="headline">Solar Data</v-card-title>
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

export default {
    name: "AgrivoltaicSystemDesign",

    data() {
        return {
            mqttClient: null,
            solarData: null, // Add this to store the latest solar data
            lrAngleInput: 0, // User input for LR angle
            udAngleInput: 0, // User input for UD angle
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
                    extrusionHeight: 10
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
    }
};
</script>

<style scoped>
.title {
    font-family: 'Segoe UI', Arial, sans-serif;
    font-weight: 600;
    color: #1976d2;
    margin-bottom: 16px;
}
.solar-data-display {
    max-width: 600px;
    margin: 0 auto;
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 2px 12px rgba(25, 118, 210, 0.08);
    padding: 24px 16px 8px 16px;
}
.headline {
    color: #1976d2;
    font-weight: 500;
    margin-bottom: 12px;
}
</style>
