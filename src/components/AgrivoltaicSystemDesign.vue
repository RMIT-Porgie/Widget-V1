<template>
  <v-container class="pa-4" fluid>
    <v-row justify="center">
      <v-col cols="12" md="8" lg="6">
        <v-btn
          color="primary"
          class="mb-4"
          large
          @click="createSolarPanelLayer"
          aria-label="Show Solar Panels"
        >
          <v-icon left>mdi-weather-sunny</v-icon>
          Show Solar Panels
        </v-btn>

        <v-card
          v-if="showSolarData && solarData"
          elevation="4"
          rounded
        >
          <v-card-title class="text-h6 text--primary">
            Solar Data Overview
          </v-card-title>

          <v-card-text>
            <v-row dense>
              <v-col
                v-for="(value, key) in solarData"
                :key="key"
                cols="12"
                sm="6"
                class="d-flex"
              >
                <v-sheet
                  class="pa-3 flex-grow-1"
                  color="grey lighten-4"
                  rounded
                >
                  <div class="d-flex justify-space-between">
                    <span class="font-weight-medium">{{ getLabelWithUnit(key) }}</span>
                    <span>{{ value }}</span>
                  </div>
                </v-sheet>
              </v-col>
            </v-row>
          </v-card-text>

          <v-divider></v-divider>

          <v-card-actions class="pa-4">
            <v-row no-gutters>
              <v-col cols="12" sm="6" class="pr-2">
                <v-text-field
                  v-model.number="azimuthInput"
                  label="Azimuth Angle (°)"
                  type="number"
                  min="0"
                  max="180"
                  outlined
                  dense
                  :disabled="!showSolarData"
                  required
                ></v-text-field>
                <v-btn
                  color="success"
                  class="mt-2"
                  block
                  :disabled="azimuthInput === null"
                  @click="publishAngle('Azimuth', azimuthInput)"
                >
                  <v-icon left>mdi-sine-wave</v-icon>
                  Set Azimuth
                </v-btn>
              </v-col>

              <v-col cols="12" sm="6" class="pl-2">
                <v-text-field
                  v-model.number="tiltInput"
                  label="Tilt Angle (°)"
                  type="number"
                  min="0"
                  max="90"
                  outlined
                  dense
                  :disabled="!showSolarData"
                  required
                ></v-text-field>
                <v-btn
                  color="success"
                  class="mt-2"
                  block
                  :disabled="tiltInput === null"
                  @click="publishAngle('Tilt', tiltInput)"
                >
                  <v-icon left>mdi-angle-acute</v-icon>
                  Set Tilt
                </v-btn>
              </v-col>
            </v-row>
          </v-card-actions>
        </v-card>

        <v-alert
          v-else-if="showSolarData && !solarData"
          type="warning"
          border="left"
          colored-border
          elevation="2"
        >
          No solar data available at this moment.
        </v-alert>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import mqtt from "mqtt";
import { widget } from "@widget-lab/3ddashboard-utils";
import solarPanelGeoJSON from "@/assets/solar_panel_polygon.geojson";

export default {
    name: "AgrivoltaicSystemDesign",

    data() {
        return {
            mqttClient: null,
            solarData: null, // Add this to store the latest solar data
            azimuthInput: 0, // User input for Azimuth angle
            tiltInput: 0, // User input for Tilt angle
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
        this.mqttClient.subscribe("solar", err => {
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

    methods: {
        publishAngle(type, value) {
            if (this.mqttClient && (type === "Azimuth" || type === "Tilt")) {
                let msg = "";
                if (type === "Azimuth") {
                    msg = `lr:${value}`;
                } else if (type === "Tilt") {
                    msg = `ud:${value}`;
                }
                this.mqttClient.publish("solar/motor", msg);
            }
        },
        createSolarPanelLayer() {
            this.platformAPI.publish("3DEXPERIENCity.AddPolygon", this.solarPanelLayer);
            this.showSolarData = true; // Show solar data card when button is clicked
        },
        getLabelWithUnit(key) {
            const labelMap = {
                L: 'Left Light Sensor', // unitless
                R: 'Right Light Sensor', // unitless
                U: 'Up Light Sensor', // unitless
                D: 'Down Light Sensor', // unitless
                Temp: 'Temperature (°C)',
                Humidity: 'Relative Humidity (%)',
                Light: 'Light Intensity (lux)',
                LR_Angle: 'Azimuth Angle (°)',
                UD_Angle: 'Tilt Angle (°)',
            };
            return labelMap[key] || key;
        },
    }
};
</script>
