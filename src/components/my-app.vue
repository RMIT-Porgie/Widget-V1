<template>
    <v-app>
        <v-main>
            <v-container>
                <v-row justify="end">
                    <v-col cols="auto">
                        <v-tabs v-model="activeTab" align-tabs="end">
                            <v-tab value="agrivoltaic">Agrivoltaic Digital Twin</v-tab>
                            <v-tab value="management">Farm Management</v-tab>
                            <v-tab value="yield">Yield Estimation</v-tab>
                        </v-tabs>
                    </v-col>
                </v-row>
                <v-row>
                    <v-col cols="12">
                        <component :is="currentTabComponent" />
                    </v-col>
                </v-row>
            </v-container>
        </v-main>
    </v-app>
</template>

<script>
import { mapStores } from "pinia";
import { useGlobalStore } from "@/store/global";
import Management from "@/components/Management.vue";
import AgrivoltaicSystemDesign from "@/components/AgrivoltaicSystemDesign.vue";
import YieldEstimation from "@/components/YieldEstimation.vue";
import Dashboard from "@/components/Dashboard.vue";

export default {
    name: "App",
    components: {
        Management,
        AgrivoltaicSystemDesign,
        YieldEstimation,
        Dashboard
    },
    data() {
        return {
            activeTab: 'management',
        };
    },
    computed: {
        ...mapStores(useGlobalStore),
        currentTabComponent() {
            switch (this.activeTab) {
                case 'management':
                    return 'Management';
                case 'agrivoltaic':
                    return 'AgrivoltaicSystemDesign';
                case 'yield':
                    return 'YieldEstimation';
                default:
                    return 'Management';
            }
        }
    }
};
</script>

<style></style>
