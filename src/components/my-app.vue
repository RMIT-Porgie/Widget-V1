<template>
    <v-app>
        <v-main>
            <v-container style="background: white; min-height: 100vh">
                <h1>Hello World From RMIT</h1>
                <div class="temperature-display mb-4">
                    <h2>Current Temperature</h2>
                    <v-card elevation="2" class="pa-4 text-center">
                        <span class="text-h3">{{ currentTemperature }}°C</span>
                    </v-card>
                </div>
                <div>
                    <p>X: {{ x }}</p>
                    <p>Y: {{ y }}</p>
                    <p>Z: {{ z }}</p>
                    <v-btn color="primary" class="mr-2" @click="createPoint"> Create Point </v-btn>
                    <v-btn color="error" class="ml-2" @click="removePoint" :disabled="!pointExists"> Remove Point </v-btn>
                    <v-btn color="warning" class="ml-2" @click="setTemperature" :disabled="!pointExists"> Set Temperature to 10 </v-btn>
                    <v-btn color="info" class="ml-2" @click="updateTemperature" :disabled="!pointExists"> Update Temperature to 10 </v-btn>
                </div>
            </v-container>
        </v-main>
    </v-app>
</template>

<script>
import { widget } from "@widget-lab/3ddashboard-utils";
import { mapStores } from "pinia";
import { useGlobalStore } from "@/store/global";
import mqtt from "mqtt";

export default {
    name: "App",
    data() {
        return {
            x: null,
            y: null,
            z: null,

            tree_coordinate: {
                widgetID: widget.id,
                geojson: {
                    type: "FeatureCollection",
                    name: "tree_coordinates",
                    crs: { type: "name", properties: { name: "urn:ogc:def:crs:EPSG::7855" } },

                    features: [
                        {
                            type: "Feature",
                            properties: { "id": 0, "Temperature": 0, "Humidity": 0, "Wind Speed": 0 },
                            geometry: { type: "Point", coordinates: [344743.73853630596, 5966167.156872547, 120.72197453345325] }
                        }
                    ]
                },
                layer: {
                    id: "tree-layer",
                    name: "tree POI",
                    attributeMapping: {
                        "STRID": "id",
                        "Temperature": "currentTemperature",
                        "Humidity": "currentHumidity",
                        "Wind Speed": "currentWindSpeed"
                    }
                },
                render: {
                    anchor: true,
                    color: "blue",
                    scale: [5, 5, 20],
                    shape: "tube",
                    switchDistance: 500,
                    opacity: 1
                }
            },
            pointExists: false,
            mqttClient: null,
            currentTemperature: 0
        };
    },
    computed: {
        ...mapStores(useGlobalStore)
    },

    async mounted() {
        console.log("App mounted");
        // this.platformAPI = await requirejs("DS/PlatformAPI/PlatformAPI");
        // this.platformAPI.subscribe("3DEXPERIENCity.OnWorldClick", this.handleWorldClick);

        // Update with your EC2 Public IP or domain
        const MQTT_BROKER = "wss://54.206.8.77:8081"; // Secure WebSocket MQTT
        const MQTT_TOPIC = "sensor/temperature";

        // Create MQTT client
        this.mqttClient = mqtt.connect(MQTT_BROKER, {
            protocol: 'wss',
            protocolVersion: 4,
            reconnectPeriod: 1000,
            keepalive: 60,
            rejectUnauthorized: false // Only use this in development
        });

        this.mqttClient.on("connect", () => {
            console.log("✅ Connected to MQTT Broker!");
            this.mqttClient.subscribe(MQTT_TOPIC);
        });

        this.mqttClient.on("message", (topic, message) => {
            if (topic === MQTT_TOPIC) {
                const temperature = parseFloat(message.toString());
                console.log('Received temperature:', temperature);
                this.currentTemperature = temperature;
                
                if (this.pointExists) {
                    this.updateTemperature(temperature);
                }
            }
        });

        this.mqttClient.on("error", err => {
            console.error("❌ Connection error:", err);
        });

        this.mqttClient.on("close", () => {
            console.log("🔌 Disconnected from MQTT Broker");
        });
    },

    methods: {
        handleWorldClick(res) {
            console.log("World Clicked Millie Says", res);
            this.x = res.x;
            this.y = res.y;
            this.z = res.z;
        },

        createPoint() {
            console.log("Creating Point");
            this.platformAPI.publish("3DEXPERIENCity.Add3DPOISet", this.tree_coordinate);
            this.platformAPI.subscribe("3DEXPERIENCity.Add3DPOISetReturn", res => {
                console.log("MIlle Says Add3DPOISetReturn", res);
            });

            this.pointExists = true;
        },

        removePoint() {
            console.log("Removing Point");
            this.platformAPI.publish("3DEXPERIENCity.RemoveContent", "tree-layer");
            this.pointExists = false;
        },

        setTemperature() {
            console.log("Setting temperature to 10");
            const setArray = ["tree-layer", "currentTemperature", 10];
            this.platformAPI.publish("3DEXPERIENCity.Set", setArray);

            // Update local state to match
            this.tree_coordinate.geojson.features[0].properties.Temperature = 10;
        },

        updateTemperature(temp = 10) {
            console.log(`Updating temperature to ${temp} using Update3DPOIContent`);

            // Update local state
            this.tree_coordinate.geojson.features[0].properties.Temperature = temp;

            const updateContent = {
                widgetID: widget.id,
                layerID: "tree-layer",
                geojson: {
                    type: "FeatureCollection",
                    features: [
                        {
                            type: "Feature",
                            properties: { ...this.tree_coordinate.geojson.features[0].properties },
                            geometry: this.tree_coordinate.geojson.features[0].geometry
                        }
                    ]
                }
            };

            this.platformAPI.publish("3DEXPERIENCity.Update3DPOIContent", updateContent);
        }
    },

    beforeDestroy() {
        if (this.mqttClient) {
            this.mqttClient.end();
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
</style>
