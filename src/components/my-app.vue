<template>
    <v-app>
        <v-main>
            <v-container style="background: white; min-height: 100vh;">
                <h1>Hello World From RMIT</h1>
                <div>
                    <p>X: {{ x }}</p>
                    <p>Y: {{ y }}</p>
                    <p>Z: {{ z }}</p>
                    <v-btn 
                        color="primary" 
                        class="mr-2"
                        @click="createPoint"
                    >
                        Create Point
                    </v-btn>
                    <v-btn 
                        color="error" 
                        class="ml-2"
                        @click="removePoint"
                        :disabled="!pointExists"
                    >
                        Remove Point
                    </v-btn>
                </div>
            </v-container>
        </v-main>
    </v-app>
</template>

<script>
import { widget } from "@widget-lab/3ddashboard-utils";
import { mapStores } from "pinia";
import { useGlobalStore } from "@/store/global";

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
                        }]
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
                    scale: [0.5, 0.5, 0.5],
                    shape: "sphere",
                    switchDistance: 500,
                    opacity: 1
                }
            },
            pointExists: false,
        }
    },
    computed: {
        ...mapStores(useGlobalStore)
    },

    async mounted() {
        console.log("App mounted");
        this.platformAPI = await requirejs("DS/PlatformAPI/PlatformAPI");
        this.platformAPI.subscribe("3DEXPERIENCity.OnWorldClick", this.handleWorldClick);
        this.startTemperatureUpdate();
    },
    beforeUnmount() {
        if (this.temperatureInterval) {
            clearInterval(this.temperatureInterval);
        }
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
            this.platformAPI.subscribe("3DEXPERIENCity.Add3DPOISetReturn", (res) => {
                console.log("MIlle Says Add3DPOISetReturn", res);
            });

            this.pointExists = true;
        },

        removePoint() {
            console.log("Removing Point");
            this.platformAPI.publish("3DEXPERIENCity.RemoveContent", "tree-layer");
            this.pointExists = false;
        }
    }
};
</script>

<style>
.v-application {
    background: white !important;
}
</style>
