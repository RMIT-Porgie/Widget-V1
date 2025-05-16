<template>
    <v-app>
        <v-main>
            <v-container>
                <h2>Selected Item</h2>
                <div>
                    {{ selectedItem }}
                </div>

                <h2>GeoJSON Attributes</h2>
                <div>{{ selectedItemGeoJSON }}</div>

                <h2>Updated GeoJSON Attributes</h2>
                <div>{{ updatedSelectedItemGeoJSON }}</div>

                <v-btn color="success" @click="UpdateGeoJSON">Set GeoJSON fruit_type to Banana</v-btn>
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
            selectedItemGeoJSON: null,
            updatedSelectedItemGeoJSON: null
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

            this.platformAPI.publish("3DEXPERIENCity.GetListAttributes", res);
            this.platformAPI.subscribe("3DEXPERIENCity.GetListAttributesReturn", res => {
                if (res && Array.isArray(res)) {
                    this.layerListAttributes = res;
                }
            });

            // layerListAttributes = [ "position", "factory", "layer", "className", "boundingSphere", "strid", "geojson", "name", "instanceId", "dataSourceId", "geoItemUuid", "geoItemType", "userData", "STRID", "name", "id", "description", "tags", "selectable", "selected", "hoverable", "hovered", "PointOfView", "Credits", "loadInfo" ]
            // "geojson", "userData"

            const attribute = "geosjson";
            this.platformAPI.publish("3DEXPERIENCity.Get", [this.selectedItem.id, attribute]);
            this.platformAPI.subscribe("3DEXPERIENCity.GetReturn", res => {
                console.log("Get Return: ", res);
                if (res) {
                    this.selectedItemGeoJSON = res;
                }
            });

            // geojson = { "type": "FeatureCollection", "features": [ { "type": "Feature", "geometry": { "type": "Point", "coordinates": [ 344809.226423, 5966176.809116, 120.8 ] }, "properties": { "geoItemUuid": "5156da3b-e997-4bc4-b90c-e085e6b24c61", "sourceFilename": "sundial_orchard_object_V2.geojson", "geoItemType": "SimpleFeature", "TRANS": "344809.226423 5966176.809116 0.0", "NAME": null, "readerVersion": null, "ORIENT": "0.0 0.0 0.0", "fruit_type": "Apple", "referentialUuid": "010d0b08-d31b-4df0-9f07-2af66917c369", "STRID": "T_0169ADE4-ECFF-488D-A6B5-67FC10C72BB5", "plot": "3", "row": "1", "SCALE": "1.0 1.0 1.0", "datasetUuid": "099487bd-e9ba-415a-b956-d594b941dfa2", "Soil Moisture": "0" } } ] }

            // userData = { "Soil Moisture": "0", "datasetUuid": "099487bd-e9ba-415a-b956-d594b941dfa2", "SCALE": "1.0 1.0 1.0", "row": "1", "plot": "3", "STRID": "T_5185530F-D4C4-422F-AA77-CCB618E1F308", "referentialUuid": "010d0b08-d31b-4df0-9f07-2af66917c369", "StreamPriority": 1, "fruit_type": "Apple", "ORIENT": "0.0 0.0 0.0", "readerVersion": null, "NAME": null, "TRANS": "344806.222514 5966176.809561 0.0", "geoItemType": "SimpleFeature", "sourceFilename": "sundial_orchard_object_V2.geojson", "geoItemUuid": "b15099be-0feb-4f0f-8250-e43626d80345", "LifespanStart": null, "LifespanEnd": null }
        }

        //     if (this.selectedItemGeoJSON) {
        //     this.updatedSelectedItemGeoJSON = structuredClone(this.selectedItemGeoJSON);
        //     this.updatedSelectedItemGeoJSON.features[0].properties.fruit_type = "Banana";
        //     console.log("Selected Item GeoJSON: ", this.selectedItemGeoJSON);
        // }
        // UpdateGeoJSON() {
        //     this.platformAPI.publish("3DEXPERIENCity.Set", [this.selectedItem.id, "geojson", this.updatedSelectedItemGeoJSON]);
        // }
    }
};
</script>

<style></style>
