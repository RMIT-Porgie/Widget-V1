<template>
    <v-app id="inspire">
        <v-app-bar color="indigo">
            <v-toolbar-title>{{ globalStore.title }}</v-toolbar-title>
        </v-app-bar>

        <v-main>
            <v-container class="fill-height" fluid>
                <v-row align="center" justify="center">
                    <v-col class="text-center">
                        <span>{{ message }}</span>
                        <br />
                        <v-btn class="ma-2" variant="text" icon color="pink-lighten-1" @click="click">
                            <v-icon>mdi-heart</v-icon>
                        </v-btn>
                    </v-col>
                </v-row>
            </v-container>
        </v-main>
        <v-footer color="indigo" app>
            <span class="text-white">&copy; {{ new Date().getFullYear() }}</span>
        </v-footer>
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
            message: "hello"
        };
    },
    computed: {
        ...mapStores(useGlobalStore)
    },
    methods: {
        click() {
            this.message = "hello from widget";
            this.globalStore.setTitle("Widget");
        }
    }
};
</script>
