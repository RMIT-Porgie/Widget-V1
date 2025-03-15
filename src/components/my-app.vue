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
                    <v-btn color="info" class="ml-2" @click="updateTemperature" :disabled="!pointExists"> Update Temperature to 10 </v-btn>
                </div>
            </v-container>
        </v-main>
    </v-app>
</template>

<script>
import { mapStores } from "pinia";
import { widget } from "@widget-lab/3ddashboard-utils";
import geojson from "@/assets/sundial_orchard_tree_information.geojson"; // Import the geojson file
import { useGlobalStore } from "@/store/global";

// import mqtt from "mqtt";

export default {
    name: "App",
    data() {
        return {
            x: null,
            y: null,
            z: null,

            tree_coordinate: {
                widgetID: widget.id,
                geojson: geojson, // Use the imported geojson file
                folder: {
                    id: "tree-folder",
                    name: "tree folder"
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
            currentTemperature: 0,
            temperatureInterval: null
        };
    },
    computed: {
        ...mapStores(useGlobalStore)
    },

    async mounted() {
        console.log("App mounted");
        this.platformAPI = await requirejs("DS/PlatformAPI/PlatformAPI");
        this.platformAPI.subscribe("3DEXPERIENCity.OnWorldClick", this.handleWorldClick);
        this.platformAPI.subscribe("3DEXPERIENCity.OnItemSelect", this.handleOnItemSelect);
        this.platformAPI.subscribe("3DEXPERIENCity.OnItemDeselect", this.handleOnItemDeselect);
    },

    // beforeUnmount() {
    //     if (this.temperatureInterval) {
    //         clearInterval(this.temperatureInterval);
    //     }
    //     // Cleanup MQTT connection
    //     if (this.mqttClient) {
    //         this.mqttClient.end();
    //     }
    // },

    methods: {
        handleWorldClick(res) {
            console.log("World Clicked Millie Says", res);
            this.x = res.x;
            this.y = res.y;
            this.z = res.z;
        },

        handleOnItemSelect(res) {
            console.log("Item Selected Millie Says", res);
            this.getSelectedItems(res);
            this.getListAttributes(res);
            this.get(res);
        },

        handleOnItemDeselect(res) {
            console.log("Item Deselected Millie Says", res);
            // Handle item deselection if needed
        },

        getSelectedItems(res) {
            this.platformAPI.publish("3DEXPERIENCity.GetSelectedItems", res);
            this.platformAPI.subscribe("3DEXPERIENCity.GetSelectedItemsReturn", res => {
                console.log("Mille Says GetSelectedItemsReturn", res);
            });
        },

        getListAttributes(res) {
            this.platformAPI.publish("3DEXPERIENCity.GetListAttributes", res);
            this.platformAPI.subscribe("3DEXPERIENCity.GetListAttributesReturn", res => {
                console.log("Mille Says GetListAttributesReturn", res);
            });
        },


        get(res) {
            this.platformAPI.publish("3DEXPERIENCity.Get",res);
            this.platformAPI.subscribe("3DEXPERIENCity.GetReturn", res => {
                console.log("Mille Says GetReturn", res);
            });
        },

        create3DPOI() {
            console.log("Creating Point");
            this.platformAPI.publish("3DEXPERIENCity.Add3DPOI", this.tree_coordinate);
            this.platformAPI.subscribe("3DEXPERIENCity.Add3DPOIReturn", res => {
                console.log("Mille Says Add3DPOIReturn", res);
            });

            this.pointExists = true;
        },

        removePoint() {
            console.log("Removing Point");
            this.platformAPI.publish("3DEXPERIENCity.RemoveContent", "tree-layer");
            this.pointExists = false;
        },

        updateTemperature() {
            const updateContent = {
                widgetID: widget.id,
                layerID: "tree-layer",
                geojson: {
                    type: "FeatureCollection",
                    name: "tree_coordinates",
                    crs: { type: "name", properties: { name: "urn:ogc:def:crs:EPSG::7855" } },
                    features: [
                        {
                            type: "Feature",
                            properties: { "id": 0, "Temperature": 10, "Humidity": 10, "Wind Speed": 0 },
                            geometry: { type: "Point", coordinates: [344743.73853630596, 5966167.156872547, 120.72197453345325] }
                        }
                    ]
                }
            };

            this.platformAPI.publish("3DEXPERIENCity.Update3DPOIContent", updateContent);
            this.platformAPI.subscribe("3DEXPERIENCity.Update3DPOIContentReturn", res => {
                console.log("Mille Says Update3DPOIContentReturn", res);
            });
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
