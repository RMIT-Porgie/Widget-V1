<template>
    <v-row justify="center">
      <v-col cols="12">
        <v-card class="pa-4" elevation="4" rounded>
          <v-card-text>
            <v-row class="mb-2" no-gutters align="center">
              <v-col cols="12" sm="4" xs="4">
                <v-select
                  :items="availableDates"
                  v-model="startDate"
                  label="Start Date"
                  outlined
                  dense
                  :menu-props="{ maxHeight: '300' }"
                />
              </v-col>
              <v-col cols="12" sm="4" xs="4">
                <v-select
                  :items="availableDates"
                  v-model="endDate"
                  label="End Date"
                  outlined
                  dense
                  :menu-props="{ maxHeight: '300' }"
                  :item-disabled="date => date < startDate"
                />
              </v-col>
              <v-col cols="12" sm="4" xs="4">
                <v-select
                  :items="['all', ...sensorIds]"
                  v-model="selectedSensorId"
                  label="Sensor ID"
                  outlined
                  dense
                  :menu-props="{ maxHeight: '300' }"
                />
              </v-col>
            </v-row>
            <v-divider class="my-4" />
            <v-row no-gutters align="stretch">
              <v-col v-if="moistureChartData.labels.length" cols="12" sm="6">
                <v-sheet class="pa-3" rounded>
                  <h3 class="text-h6 mb-2">Soil Moisture</h3>
                  <LineChart :chart-data="moistureChartData" :chart-options="chartOptions" />
                </v-sheet>
              </v-col>
              <v-col v-if="tempChartData.labels.length" cols="12" sm="6">
                <v-sheet class="pa-3" rounded>
                  <h3 class="text-h6 mb-2">Soil Temperature</h3>
                  <LineChart :chart-data="tempChartData" :chart-options="chartOptions" />
                </v-sheet>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
</template>

<script>
import { h } from "vue";
import { CategoryScale, Chart, Legend, LinearScale, LineElement, PointElement, Title, Tooltip } from "chart.js";
import { Line } from "vue-chartjs";

Chart.register(LineElement, PointElement, LinearScale, Title, CategoryScale, Tooltip, Legend);

const soilDataCSV = require("@/assets/soil_data_cleaned.csv");

export default {
    name: "Dashboard",
    components: {
        LineChart: {
            extends: Line,
            props: ["chartData", "chartOptions"],
            mounted() {
                this.chartInstance = new Chart(this.$refs.canvas.getContext("2d"), {
                    type: "line",
                    data: this.chartData,
                    options: this.chartOptions
                });
            },
            watch: {
                chartData(newData) {
                    if (this.chartInstance) {
                        this.chartInstance.data = newData;
                        this.chartInstance.update();
                    }
                }
            },
            beforeUnmount() {
                if (this.chartInstance) {
                    this.chartInstance.destroy();
                }
            },
            render() {
                return h("canvas", { ref: "canvas" });
            }
        }
    },
    data() {
        return {
            soilData: [],
            availableDates: [],
            startDate: "",
            endDate: "",
            measurementTypes: [],
            sensorIds: [],
            selectedSensorId: "all"
        };
    },
    computed: {
        filteredData() {
            if (!this.startDate || !this.endDate) return [];
            // Return all data for selected sensor and date range, regardless of measurement type
            return this.soilData
                .filter(d => this.selectedSensorId === "all" || d.sensorId == this.selectedSensorId)
                .filter(d => {
                    const date = d.dateTime.split(" ")[0];
                    return date >= this.startDate && date <= this.endDate;
                });
        },
        moistureChartData() {
            const filtered = this.soilData
                .filter(d => d.measurementType === "moisture")
                .filter(d => this.selectedSensorId === "all" || d.sensorId == this.selectedSensorId)
                .filter(d => {
                    const date = d.dateTime.split(" ")[0];
                    return date >= this.startDate && date <= this.endDate;
                });
            const grouped = {};
            filtered.forEach(d => {
                if (!grouped[d.sensorId]) grouped[d.sensorId] = [];
                grouped[d.sensorId].push(d);
            });
            const allLabels = [...new Set(filtered.map(d => d.dateTime))];
            return {
                labels: allLabels,
                datasets: Object.keys(grouped).map((sensorId, idx) => {
                    const dataMap = new Map(grouped[sensorId].map(d => [d.dateTime, d.value]));
                    const data = allLabels.map(label => dataMap.get(label) ?? null);
                    return {
                        label: `Sensor ${sensorId}`,
                        data,
                        fill: false,
                        borderColor: this.getColor(idx),
                        backgroundColor: this.getColor(idx),
                        tension: 0.2,
                        pointRadius: 2
                    };
                })
            };
        },
        tempChartData() {
            // Filter for Temp (case-insensitive)
            const filtered = this.soilData
                .filter(d => d.measurementType.toLowerCase().includes("temp"))
                .filter(d => this.selectedSensorId === "all" || d.sensorId == this.selectedSensorId)
                .filter(d => {
                    const date = d.dateTime.split(" ")[0];
                    return date >= this.startDate && date <= this.endDate;
                });
            const grouped = {};
            filtered.forEach(d => {
                if (!grouped[d.sensorId]) grouped[d.sensorId] = [];
                grouped[d.sensorId].push(d);
            });
            const allLabels = [...new Set(filtered.map(d => d.dateTime))];
            return {
                labels: allLabels,
                datasets: Object.keys(grouped).map((sensorId, idx) => {
                    const dataMap = new Map(grouped[sensorId].map(d => [d.dateTime, d.value]));
                    const data = allLabels.map(label => dataMap.get(label) ?? null);
                    return {
                        label: `Sensor ${sensorId}`,
                        data,
                        fill: false,
                        borderColor: this.getColor(idx),
                        backgroundColor: this.getColor(idx),
                        tension: 0.2,
                        pointRadius: 2
                    };
                })
            };
        },
        chartData() {
            // Always group by sensorId for legend, even if only one sensor is selected
            const grouped = {};
            this.filteredData.forEach(d => {
                if (!grouped[d.sensorId]) grouped[d.sensorId] = [];
                grouped[d.sensorId].push(d);
            });
            // Get all unique datetimes for x-axis
            const allLabels = [...new Set(this.filteredData.map(d => d.dateTime))];
            return {
                labels: allLabels,
                datasets: Object.keys(grouped).map((sensorId, idx) => {
                    // Map data to the correct label order, fill missing with null
                    const dataMap = new Map(grouped[sensorId].map(d => [d.dateTime, d.value]));
                    const data = allLabels.map(label => dataMap.get(label) ?? null);
                    return {
                        label: `Sensor ${sensorId}`,
                        data,
                        fill: false,
                        borderColor: this.getColor(idx),
                        backgroundColor: this.getColor(idx),
                        tension: 0.2,
                        pointRadius: 2
                    };
                })
            };
        },
        chartOptions() {
            return {
                responsive: true,
                plugins: {
                    legend: { display: false }, // Hide the legend
                    tooltip: {
                        enabled: true,
                        mode: "index",
                        intersect: false,
                        callbacks: {
                            label: function (context) {
                                // Show sensor, value, and date
                                const label = context.dataset.label || "";
                                const value = context.parsed.y;
                                const date = context.label;
                                return `${label}: ${value} at ${date}`;
                            }
                        }
                    }
                },
                hover: {
                    mode: "index",
                    intersect: false
                },
                scales: {
                    x: {
                        // Hide x axis ticks
                        display: false
                    },
                    y: {
                        title: { display: true, text: "Value" },
                        beginAtZero: true,

                        max: 50
                    }
                }
            };
        }
    },
    mounted() {
        this.loadCSV();
    },
    methods: {
        loadCSV() {
            this.soilData = soilDataCSV.map(row => {
                return {
                    sensorId: row.sensor_id,
                    date: row.date,
                    dateTime: row.date_time,
                    measurementType: row.measurement_type,
                    value: parseFloat(row.value)
                };
            });
            // Get unique measurement types
            this.measurementTypes = [...new Set(this.soilData.map(d => d.measurementType))];
            // Get unique sensor IDs
            this.sensorIds = [...new Set(this.soilData.map(d => d.sensorId))];
            // Set default to 'all'
            this.selectedSensorId = "all";
            // Sort by dateTime ascending
            this.soilData.sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));
            // Find min and max date
            const dates = this.soilData.map(d => d.dateTime.split(" ")[0]);
            const jsDates = dates.map(d => new Date(d));
            this.availableDates = [...new Set(jsDates.map(d => d.toISOString().slice(0, 10)))];
            this.availableDates.sort();
            this.startDate = this.availableDates[this.availableDates.length - 2] || "";
            this.endDate = this.availableDates[this.availableDates.length - 1] || "";
        },
        getColor(idx) {
            // Simple color palette, can be expanded
            const palette = ["#1976d2", "#e53935", "#43a047", "#fbc02d", "#8e24aa", "#00897b", "#6d4c41", "#d81b60", "#757575", "#039be5"];
            return palette[idx % palette.length];
        }
    }
};
</script>
