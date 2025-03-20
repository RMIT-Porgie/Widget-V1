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
                </div>

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
import { mapStores } from "pinia";
import geojson from "@/assets/sundial_orchard_object_V2.geojson";
import mqtt from "mqtt";
import { widget } from "@widget-lab/3ddashboard-utils";
import { useGlobalStore } from "@/store/global";
import { th } from "vuetify/locale";

export default {
    name: "App",
    data() {
        return {
            selectedID: null,
            mqttClient: null,
            pointExists: false,
            mqttClient: null,
            currentMoisture: 0,
            selectedItem: null,
            mqtt_data: null,
            x: null,
            y: null,
            z: null,

            tree_coordinate: {
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
                    color: "green",
                    scale: [1, 1, 3],
                    shape: "tube",
                    switchDistance: 500,
                    opacity: 1
                }
            },
        };
    },
    computed: {
        ...mapStores(useGlobalStore),
        geojsonFeatures() {
            return this.tree_coordinate.geojson.features;
        }
    },

    async mounted() {
        console.log("App mounted");
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
                this.mqtt_data = JSON.parse(message.toString());
                
                // Update selected item moisture if it exists
                if (this.selectedItem) {
                    const matchingMoistureData = this.mqtt_data.find(
                        sensor => sensor.guid === this.selectedItem.guid
                    );
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
    },

    methods: {
        handleOnItemSelect(res) {
            // this.GetSelectedItemsGUID(res);
            this.GetUpdateSelectedItemsAttribute(res);
        },

        GetUpdateSelectedItemsAttribute(res){
            this.platformAPI.publish("3DEXPERIENCity.GetSelectedItems", res);
            this.platformAPI.subscribe("3DEXPERIENCity.GetSelectedItemsReturn", res => {
                // const selectedGuid = res.data[0].userData.GUID;
                this.selectedID = res.data[0].id;
                // console.log("Selected GUID:", selectedGuid);
                console.log("Selected ID:", this.selectedID);
            });

       
            this.platformAPI.publish("3DEXPERIENCity.Get", [this.selectedID, "Content"]);
            console.log("Published Get\n\n");
            this.platformAPI.subscribe("3DEXPERIENCity.GetReturn", res => {
                console.log("MIlle Says GetReturn", res);
            });
            console.log("Subscribed Get\n\n");

        },

        GetSelectedItemsGUID(res) {
            this.platformAPI.publish("3DEXPERIENCity.GetSelectedItems", res);
            this.platformAPI.subscribe("3DEXPERIENCity.GetSelectedItemsReturn", res => {
                if (res.data && res.data.length > 0) {
                    const selectedGuid = res.data[0].userData.GUID;
                    console.log("Selected GUID:", selectedGuid);

                    // Find matching moisture data from MQTT data
                    const matchingMoistureData = this.mqtt_data?.find(
                        sensor => sensor.guid === selectedGuid
                    );

                    this.selectedItem = {
                        id: res.data[0].id,
                        guid: selectedGuid,
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

        create3DPOI() {
            console.log("Creating Point");
            this.platformAPI.publish("3DEXPERIENCity.Add3DPOI", this.tree_coordinate);
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
            this.tree_coordinate.geojson.features[0].properties["Soil Moisture"] = this.currentMoisture;
            this.platformAPI.publish("3DEXPERIENCity.Update3DPOIContent", this.tree_coordinate);
            this.platformAPI.subscribe("3DEXPERIENCity.Update3DPOIContentReturn", res => {
                console.log("Mille Says Update3DPOIContentReturn", res);
            });
        },
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
    color: #2196F3;
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
