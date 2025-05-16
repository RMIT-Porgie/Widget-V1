<template>
    <v-app>
        <v-main>
            <v-container>
                <h2>Selected Item</h2>
                <div>
                    {{ selectedItem }}
                </div>

                <h2>Layer List Attributes</h2>
                <div>
                    {{ layerListAttributes }}
                </div>
                
                <h2>Attributes</h2>
                <div>{{ attributeValue }}</div>

                <h2>Attributes_2</h2>
                <div>{{ attributeValue2 }}</div>

                <h2>Layer Attributes</h2>
                <div>{{ layerAttributeValues }}</div>


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
            soilData: null,
            selectedItem: null,
            layerListAttributes: null,
            layerAttributeValues: null,
            attributeValue: null,
            attributeValue2: null,
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
        handleOnItemSelect(res) {
            this.platformAPI.publish("3DEXPERIENCity.GetSelectedItems", res);
            this.platformAPI.subscribe("3DEXPERIENCity.GetSelectedItemsReturn", res => {
                if (res.data && res.data.length > 0) {
                    const item = res.data[0];
                    this.selectedItem = {
                        id: item.id,
                        name: item.name,
                        className: item.className,
                        position: item.position,
                        visible: item.visible,
                        userData: item.userData
                    };
                } else {
                    this.selectedItem = null;
                }
            });

            // [ "position", "factory", "layer", "className", "boundingSphere", "strid", "geojson", "name", "instanceId", "dataSourceId", "geoItemUuid", "geoItemType", "userData", "STRID", "name", "id", "description", "tags", "selectable", "selected", "hoverable", "hovered", "PointOfView", "Credits", "loadInfo" ]
            // "geojson", "userData"
            const attribute = "geojson"
            this.platformAPI.publish("3DEXPERIENCity.Get", [this.selectedItem.id, attribute]);
            this.platformAPI.subscribe("3DEXPERIENCity.GetReturn", res => {
                if (res) {
                    this.attributeValue2 = res;
                }
            });

            this.platformAPI.publish("3DEXPERIENCity.GetListAttributes", res);
            this.platformAPI.subscribe("3DEXPERIENCity.GetListAttributesReturn", res => {
                if (res && Array.isArray(res)) {
                    this.layerListAttributes = res;
                    // res.forEach(attr => {
                    //     console.log("Layer Attribute: ", attr);
                    //     this.platformAPI.publish("3DEXPERIENCity.Get", [this.selectedItem.id, attr]);
                    //     this.platformAPI.subscribe("3DEXPERIENCity.GetReturn", res => {
                    //         console.log("Layer Attribute Value: ", res);
                    //         // Add each getRes to layerAttributeValues as an array  
                    //         if (!this.layerAttributeValues) this.layerAttributeValues = [];
                    //         this.layerAttributeValues.push(res);
                    //         this.attributeValue = res;
                    //     });
                    // });
                }
            });


            
        }
    }
};
</script>

<style></style>
