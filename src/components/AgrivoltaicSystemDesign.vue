<template>
  <div>
    <h2>Agrivoltaic System Design</h2>
    <v-btn @click="$emit('create-polygon-layer')">Create SolarPanel</v-btn>
  </div>
</template>

<script>
import solarPanelGeoJSON from "@/assets/solar_panel_polygon.geojson";

export default {
  name: "AgrivoltaicSystemDesign",

  data() {
    return {
    solarPanelLayer: {
        widgetID: widget.id,
        geojson: solarPanelGeoJSON,
        layer: {
          id: "solarPanelLayer",
          name: "solarPanelLayer",
          attributeMapping: {
            STRID: "id"
          }
        },
        render: {
          color: "black",
          extrusionHeight: 10,
        }
      },    };
  },
};
</script>
