<template>
    <v-app>
        <v-main>
            <v-container>
                <h1>{{ message }}</h1>
            </v-container>
        </v-main>
    </v-app>
</template>

<script>
import { widget } from "@widget-lab/3ddashboard-utils";
import { mapStores } from "pinia";
import { useGlobalStore } from "@/store/global";

console.debug(widget);

export default {
    name: "App",
    data() {
        return {
            message: "hello world from RMIT"
        };
    },
    computed: {
        ...mapStores(useGlobalStore)
    },
    methods: {
        click() {
            this.message = "hello world from RMIT";
            this.globalStore.setTitle("Widget");
        }
    }
};
</script>
