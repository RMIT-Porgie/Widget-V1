<template>
    <v-app>
        <v-main>
            <v-container>
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
            z: null
        };
    },
    computed: {
        ...mapStores(useGlobalStore)
    },
    async mounted() {
        this.platformAPI = await requirejs("DS/PlatformAPI/PlatformAPI");
        this.platformAPI.subscribe("3DEXPERIENCity.OnWorldClick", this.handleWorldClick);
    },
    methods: {
        handleWorldClick(res) {
            console.log("World Clicked", res);
            this.x = res.x;
            this.y = res.y;
            this.z = res.z;
        }
    }
};
</script>
