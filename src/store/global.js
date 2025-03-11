import { defineStore } from "pinia";

export const useGlobalStore = defineStore("global", {
    state: () => ({
        title: "Application"
    }),
    actions: {
        setTitle(title) {
            this.title = title;
        }
    }
});
