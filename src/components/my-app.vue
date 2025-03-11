<template>
    <v-app>
        <v-main>
            <v-container style="background: white; min-height: 100vh;">
                <h1>Hello World From RMIT</h1>
                <div>
                    <p>X: {{ x }}</p>
                    <p>Y: {{ y }}</p>
                    <p>Z: {{ z }}</p>
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
            world_on_click_coordinate: {
                widgetID: widget.id,
                geojson: {
                    type: "FeatureCollection",
                    name: "sensor-points",
                    crs: { type: "name", properties: { name: "urn:ogc:def:crs:EPSG::3857" } },
                    features: [
                        {
                            type: "Feature",
                            properties: { "id": 1, "Temperature": 0, "Humidity": 0, "Wind Speed": 0 },
                            geometry: { type: "Point", coordinates: [this.x, this.y, this.z] }
                        }]
                }
            },
        }
    },
    computed: {
        ...mapStores(useGlobalStore)
    },
    async mounted() {
        console.log("App mounted");
        this.platformAPI = await requirejs("DS/PlatformAPI/PlatformAPI");
        this.platformAPI.subscribe("3DEXPERIENCity.OnWorldClick", this.handleWorldClick);
    },
    methods: {
        handleWorldClick(res) {
            console.log("World Clicked", res);
            this.x = res.x;
            this.y = res.y;
            this.z = res.z;
            
            this.world_on_click_coordinate.geojson.features[0].geometry.coordinates = [this.x, this.y, this.z];
            this.platformAPI.publish("3DEXPERIENCity.Add3DPOI", this.world_on_click_coordinate);
        }
    }
};
</script>

<style>
.v-application {
    background: white !important;
}
</style>
