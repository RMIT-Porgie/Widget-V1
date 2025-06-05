<template>
  <div>
    <h2>Management</h2>
    <!-- Management content goes here -->
    <!-- create a button to create layer -->
    <v-btn @click="$emit('create-polygon-layer')">Create SolarPanel</v-btn>
    <v-btn @click="$emit('create-layers')">Create Layers</v-btn>
    <!-- create a button to update layer -->
    <v-btn @click="$emit('update-sensor-3d-poi')">Update Layers</v-btn>
    <!-- Time slider for historical visualization -->
    <v-row class="mt-4">
      <v-col cols="12">
        <v-range-slider
          v-model="timeRangeProxy"
          :min="timeSliderMin"
          :max="timeSliderMax"
          :step="1"
          ticks
          :tick-labels="timeSliderLabels"
          label="Time Range"
          thumb-label
          :disabled="!csvLoaded"
        ></v-range-slider>
        <div v-if="csvLoaded">
          <span>Start: {{ formatTimestamp(timeRangeProxy[0]) }}</span>
          <span class="ml-4">End: {{ formatTimestamp(timeRangeProxy[1]) }}</span>
        </div>
      </v-col>
    </v-row>
    <v-row>
      <v-col cols="12">
        <v-btn :disabled="!csvLoaded || isPlaying" @click="$emit('start-historical-visualization')">Start Historical Visualization</v-btn>
        <v-btn :disabled="!isPlaying" @click="$emit('stop-historical-visualization')">Stop Visualization</v-btn>
      </v-col>
    </v-row>

    <!-- Display current historical data -->
    <v-row v-if="isPlaying && csvLoaded" class="mb-4">
      <v-col cols="12">
        <v-card outlined>
          <v-card-title>Historical Data at {{ formatTimestamp(timeSliderLabels[playIndex]) }}</v-card-title>
          <v-card-text>
            <div v-for="data in historicalData.filter(d => d.timestamp === timeSliderLabels[playIndex])" :key="data.guid">
              <strong>Sensor:</strong> {{ data.guid }} | <strong>Soil Moisture:</strong> {{ data.soil_moisture_content }} |
              <strong>Temperature:</strong> {{ data.temperature_celsius }}
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script>
export default {
  name: "Management",
  props: {
    timeRange: Array,
    timeSliderMin: Number,
    timeSliderMax: Number,
    timeSliderLabels: Array,
    csvLoaded: Boolean,
    isPlaying: Boolean,
    playIndex: Number,
    historicalData: Array,
    formatTimestamp: Function
  },
  emits: [
    'create-polygon-layer',
    'create-layers',
    'update-sensor-3d-poi',
    'start-historical-visualization',
    'stop-historical-visualization',
    'update:timeRange'
  ],
  computed: {
    timeRangeProxy: {
      get() {
        return this.timeRange;
      },
      set(val) {
        this.$emit('update:timeRange', val);
      }
    }
  }
};
</script>