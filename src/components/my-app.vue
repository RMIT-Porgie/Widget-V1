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
            selectedItem: null,
            layerListAttributes: null,
            attributeValue: null,
            updatedAttributeValue: null
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
                this.soil_data = JSON.parse(message.toString());
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
            const soil_data_layer = {
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
            };
            this.platformAPI.publish("3DEXPERIENCity.Add3DPOI", soil_data_layer);
        }

        // handleOnItemSelect(res) {
        //     this.platformAPI.publish("3DEXPERIENCity.GetSelectedItems", res);
        //     this.platformAPI.subscribe("3DEXPERIENCity.GetSelectedItemsReturn", res => {
        //         if (res.data && res.data.length > 0) {
        //             const item = res.data[0];
        //             this.selectedItem = {
        //                 id: item.id,
        //                 name: item.name,
        //                 className: item.className,
        //                 position: item.position,
        //                 visible: item.visible,
        //                 userData: item.userData
        //             };
        //         } else {
        //             this.selectedItem = null;
        //         }
        //     });

        //     this.platformAPI.publish("3DEXPERIENCity.GetListAttributes", res);
        //     this.platformAPI.subscribe("3DEXPERIENCity.GetListAttributesReturn", res => {
        //         if (res && Array.isArray(res)) {
        //             this.layerListAttributes = res;
        //         }
        //     });

        //     const attribute = "userData";
        //     this.platformAPI.publish("3DEXPERIENCity.Get", [this.selectedItem.id, attribute]);
        //     this.platformAPI.subscribe("3DEXPERIENCity.GetReturn", res => {
        //         console.log("Get Return: ", res);
        //         if (res) {
        //             this.attributeValue = res;
        //             this.updatedAttributeValue = JSON.parse(JSON.stringify(this.attributeValue));
        //             // this.updatedAttributeValue.features[0].properties.fruit_type = "Kiwi";
        //             this.updatedAttributeValue.fruit_type = "Kiwi";
        //         }
        //     });

        // },
        // updateGeoJSONFruitTypeBanana() {
        //     // this.updatedAttributeValue.features[0].properties.fruit_type = "Banana";
        //     this.updatedAttributeValue.fruit_type = "Banana";
        //     this.platformAPI.publish("3DEXPERIENCity.Set", [this.selectedItem.id, "geojson", this.updatedAttributeValue]);
        // }
    }
};
</script>

<style></style>
