<template>
    <v-app>
        <v-main>
            <v-container>
                <h2>Selected Item</h2>
                <div v-if="selectedItem">
                    <pre>{{ selectedItem }}</pre>
                </div>
                <div v-else>
                    <em>No item selected.</em>
                </div>
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
            this.selectedItem = res;
        },

    },
};
</script>

<style>

</style>
