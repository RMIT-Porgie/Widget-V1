<template>
    <v-app>
        <v-main>
            <v-container style="background: white; min-height: 100vh">
                <h1>Hello World From RMIT</h1>
                <div>
                    <p>X: {{ x }}</p>
                    <p>Y: {{ y }}</p>
                    <p>Z: {{ z }}</p>
                    <v-btn color="primary" class="mr-2" @click="create3DPOI"> Create Point </v-btn>

                    <v-btn color="error" class="ml-2" @click="removePoint" :disabled="!pointExists"> Remove Point </v-btn>
                    <v-btn color="info" class="ml-2" @click="updateAttribute" :disabled="!pointExists"> Update Temperature to 10 </v-btn>
                </div>
                <div class="temperature-display">
                    <p>Current Moisture: {{ currentMoisture }}%</p>
                    <div v-if="selectedItem" class="selected-item-info">
                        <h3>Selected Item</h3>
                        <p>ID: {{ selectedItem.id }}</p>
                        <p>Moisture: {{ selectedItem.moisture }}%</p>
                    </div>
                </div>
            </v-container>
        </v-main>
    </v-app>
</template>

<script>
import { mapStores } from "pinia";
import mqtt from "mqtt";
import { widget } from "@widget-lab/3ddashboard-utils";
import geojson from "@/assets/sundial_orchard_tree_object_test.geojson";
import { useGlobalStore } from "@/store/global";

export default {
    name: "App",
    data() {
        return {
            mqttClient: null,
            selectedItem: null,
            pointExists: false,
            currentMoisture: null,
            mqttClient: null,
            currentMoisture: 0,

            x: null,
            y: null,
            z: null,

            tree_objects: {
                widgetID: widget.id,
                geojson: geojson, // Use the imported geojson file
                layer: {
                    id: "tree-layer",
                    name: "tree POI",
                    attributeMapping: {
                        "STRID": "GUID",
                        "Soil Moisture": "Soil Moisture"
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
            updateInterval: null,
        };
    },
    computed: {
        ...mapStores(useGlobalStore),
        geojsonFeatures() {
            return this.tree_objects.geojson.features;
        }
    },

    async mounted() {
        console.log("App mounted");
        this.platformAPI = await requirejs("DS/PlatformAPI/PlatformAPI");
        this.platformAPI.subscribe("3DEXPERIENCity.OnWorldClick", this.handleWorldClick);
        this.platformAPI.subscribe("3DEXPERIENCity.OnItemSelect", this.handleOnItemSelect);

        // Connect to MQTT broker
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
                const data = JSON.parse(message.toString());
                console.log(`📩 MQTT Message Received:`, data);
                this.currentMoisture = data.fields.soil_moisture_content;
            }
        });

        this.mqttClient.on("error", error => {
            console.error("❌ MQTT Error:", error);
        });

        // Start automatic updates every 5 seconds
        this.updateInterval = setInterval(() => {
            if (this.pointExists) {
                this.autoUpdateAttribute();
            }
        }, 5000);
    },

    beforeUnmount() {
        if (this.mqttClient) {
            this.mqttClient.end();
        }
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
    },

    methods: {
        handleWorldClick(res) {
            this.x = res.x;
            this.y = res.y;
            this.z = res.z;
        },

        handleOnItemSelect(res) {
            this.GetSelectedItems(res);
        },

        GetSelectedItems(res) {
            this.platformAPI.publish("3DEXPERIENCity.GetSelectedItems", res);
            this.platformAPI.subscribe("3DEXPERIENCity.GetSelectedItemsReturn", res => {
                if (res.data && res.data.length > 0) {
                    const item = res.data[0];
                    this.selectedItem = {
                        id: item.id,
                        geoItemUuid: item.userData.geoItemUuid,
                        moisture: this.currentMoisture
                    };
                } else {
                    this.selectedItem = null;
                }
            });
        },

        GetListAttributes(res) {
            this.platformAPI.publish("3DEXPERIENCity.GetListAttributes", res);
            this.platformAPI.subscribe("3DEXPERIENCity.GetListAttributesReturn", res => {
                console.log("MIlle Says GetListAttributesReturn", res);
            });
        },

        GetAttribute(res) {
            this.platformAPI.publish("3DEXPERIENCity.Get", res);
            this.platformAPI.subscribe("3DEXPERIENCity.GetReturn", res => {
                console.log("MIlle Says GetReturn", res);
            });
        },

        SetAttribute(res) {
            this.platformAPI.publish("3DEXPERIENCity.Set", res);
        },

        create3DPOI() {
            console.log("Creating Point");
            this.platformAPI.publish("3DEXPERIENCity.Add3DPOI", this.tree_objects);
            this.platformAPI.subscribe("3DEXPERIENCity.Add3DPOIReturn", res => {
                console.log("MIlle Says Add3DPOIReturn", res);
            });

            this.pointExists = true;
        },

        removePoint() {
            console.log("Removing Point");
            this.platformAPI.publish("3DEXPERIENCity.RemoveContent", "tree-layer");
            this.pointExists = false;
        },

        updateAttribute() {
            this.tree_objects.geojson.features[0].properties["Soil Moisture"] = this.currentMoisture;
            this.platformAPI.publish("3DEXPERIENCity.Update3DPOIContent", this.tree_objects);
            this.platformAPI.subscribe("3DEXPERIENCity.Update3DPOIContentReturn", res => {
                console.log("Mille Says Update3DPOIContentReturn", res);
            });
        },

        autoUpdateAttribute() {
            this.tree_objects.geojson.features[0].properties["Soil Moisture"] = this.currentMoisture;
            this.platformAPI.publish("3DEXPERIENCity.Update3DPOIContent", this.tree_objects);
        },

        formatCoordinates(coords) {
            return coords.map(c => Number(c).toFixed(2)).join(", ");
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

.selected-item-info {
    margin-top: 15px;
    padding: 10px;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    background-color: #f5f5f5;
}
</style>
