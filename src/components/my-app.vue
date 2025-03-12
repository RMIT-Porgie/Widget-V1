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
                        color="secondary" 
                        @click="changeColor"
                    >
                        Change Color
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
            pointCreated: false,
            colorIndex: 0,
            colors: ['rgb(255,0,0)', 'rgb(0,0,255)', 'rgb(0,255,0)'],
            tree_coordinate: {
                widgetID: widget.id,
                geojson: {
                    type: "FeatureCollection",
                    name: "tree_coordinates",
                    crs: { type: "name", properties: { name: "urn:ogc:def:crs:EPSG::7855" } },
                    features: [
                        {
                            type: "Feature",
                            geometry: { type: "Point", coordinates: [344743.73853630596, 5966167.156872547, 120.72197453345325] }
                        }]
                },
                layer: {
                    id: "tree-layer",
                    name: "tree POI",
                },
                render: {
                    anchor: true,
                    color: "rgb(0,255,0)",
                    scale: [1, 1, 1],
                    shape: "sphere",
                    switchDistance: 500,
                    opacity: 1
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
            console.log("World Clicked Millie Says", res);
            this.x = res.x;
            this.y = res.y;
            this.z = res.z;
        },
        createPoint() {
            console.log("Creating Point");
            this.platformAPI.publish("3DEXPERIENCity.Add3DPOISet", this.tree_coordinate);
            this.pointCreated = true;
        },
        changeColor() {
            this.colorIndex = (this.colorIndex + 1) % 3;
            const currentColor = this.colors[this.colorIndex];
            console.log("Changing color to:", currentColor);
            
            const updateContent = {
                widgetID: widget.id,
                layerID: "tree-layer",
                geojson: {
                    type: "FeatureCollection",
                    features: this.tree_coordinate.geojson.features,
                    render: {
                        ...this.tree_coordinate.render,
                        color: currentColor
                    }
                }
            };
            
            this.platformAPI.publish("3DEXPERIENCity.Update3DPOIContent", updateContent);
        }
    }
};
</script>

<style>
.v-application {
    background: white !important;
}
</style>
