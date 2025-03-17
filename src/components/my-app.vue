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
import mqtt from "mqtt"; // Import mqtt

export default {
    name: "App",
    data() {
        return {
            x: null,
            y: null,
            z: null,

            tree_coordinate: {
                widgetID: widget.id,
                // geojson: geojson, // Use the imported geojson file
                geojson: {
                    type: "FeatureCollection",
                    name: "tree_coordinates",
                    crs: { type: "name", properties: { name: "urn:ogc:def:crs:EPSG::7855" } },
                    features: [
                        {
                            type: "Feature",
                            properties: { "id": 0, "Temperature": 0, "Humidity": 0, "Wind Speed": 0 },
                            geometry: { type: "Point", coordinates: [344743.73853630596, 5966167.156872547, 120.72197453345325] }
                        }
                    ]
                },
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

        // Connect to MQTT broker
        this.mqttClient = mqtt.connect('ws://54.206.8.77:9001');
        this.mqttClient.on('connect', () => {
            console.log('Connected to MQTT broker');
            this.mqttClient.subscribe('sensor/temperature', (err) => {
                if (!err) {
                    console.log('Subscribed to sensor/temperature');
                }
            });
        });

        this.mqttClient.on('message', (topic, message) => {
            if (topic === 'sensor/temperature') {
                // console.log(`Message: ${message.toString()}`);
                console.log(message.toString());
                // {"measurement":"temperature_sensor","fields":{"temperature":22.69},"timestamp":"2025-03-17T03:57:08.465Z"}
                const data = JSON.parse(message.toString());
                console.log(data.fields.temperature);
                this.currentTemperature = data.fields.temperature;
                this.updateTemperature();

                // const temperature = parseFloat(message.toString());
                // console.log(`Received temperature: ${temperature}`);
                // this.currentTemperature = temperature;
                // this.updateTemperature();
            }
        });

        // Start the temperature update interval
        this.temperatureInterval = setInterval(this.incrementTemperature, 5000);
    },

    beforeUnmount() {
        if (this.temperatureInterval) {
            clearInterval(this.temperatureInterval);
        }
        if (this.mqttClient) {
            this.mqttClient.end();
        }
    },

    methods: {
        handleWorldClick(res) {
            // console.log("World Clicked Millie Says", res);
            this.x = res.x;
            this.y = res.y;
            this.z = res.z;
        },

        handleOnItemSelect(res) {
            console.log("Item Selected Millie Says WOWOWOOWOWOWO", res);
            this.GetSelectedItems(res);
            this.GetListAttributes(res);
            this.GetAttribute(res);
        },

        GetSelectedItems(res) {
            this.platformAPI.publish("3DEXPERIENCity.GetSelectedItems", res);
            this.platformAPI.subscribe("3DEXPERIENCity.GetSelectedItemsReturn", res => {
                console.log("Mille SAys GetSelectedItemsReturn\n\n\n\n");

                const id = res.data[0].id;
                const geoItemUuid = res.data[0].userData.geoItemUuid;
                const datasetUuid = res.data[0].userData.datasetUuid;
                const referentialUuid = res.data[0].userData.referentialUuid;

                // create a constant array with the values

                const attributeValue = [referentialUuid, "selectable", "false"];
                this.SetAttribute(attributeValue);
                console.log("Mille Says SET ATTRIBUTE VALUE !!!\n\n\n" );

                const newGeoJSON = {
                    type: "FeatureCollection",
                    name: "sundial_orchard_tree_information",
                    crs: { type: "name", properties: { name: "urn:ogc:def:crs:EPSG::7855" } },
                    features: [
                        {
                            type: "Feature",
                            properties: { GUID: "T_5B1BF197-8B46-4F41-A1D1-F28A26A42329", soil_moisture_content: 1, fruit_type: "Apple", row: 1, plot: 1 },
                            geometry: { type: "Point", coordinates: [344778.227938843192533, 5966176.809605618938804] }
                        }
                    ]
                };

                const attributeValue2 = [referentialUuid, "geojson", JSON.stringify(newGeoJSON)];
                this.SetAttribute(attributeValue2);
                console.log("Mille Says SET ATTRIBUTE VALUE 2222222222!!!\n\n\n" );


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

        incrementTemperature() {
            if (this.pointExists) {
                this.currentTemperature += 1;
                this.updateTemperature();
            }
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
                            properties: { "id": 0, "Temperature": this.currentTemperature, "Humidity": 10, "Wind Speed": 0 },
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
