<template>
    <div class="dashboard-container">
        <h2 class="dashboard-title">Soil Data Dashboard</h2>
        <div class="dashboard-grid">
            <div class="dashboard-row">
                <div class="dashboard-col">
                    <label for="startDatePicker">Start Date:</label>
                    <select id="startDatePicker" v-model="startDate" class="date-select">
                        <option v-for="date in availableDates" :key="date" :value="date">{{ date }}</option>
                    </select>
                </div>
                <div class="dashboard-col">
                    <label for="endDatePicker">End Date:</label>
                    <select id="endDatePicker" v-model="endDate" class="date-select">
                        <option v-for="date in availableDates" :key="date" :value="date" :disabled="date < startDate">{{ date }}</option>
                    </select>
                </div>
            </div>
            <div class="dashboard-row">
                <div class="dashboard-col">
                    <label for="sensorIdSelect">Sensor ID:</label>
                    <select id="sensorIdSelect" v-model="selectedSensorId" class="type-select">
                        <option value="all">All</option>
                        <option v-for="id in sensorIds" :key="id" :value="id">{{ id }}</option>
                    </select>
                </div>
            </div>
        </div>
        <div class="chart-container" v-if="moistureChartData.labels.length">
            <h3>Moisture</h3>
            <LineChart :chart-data="moistureChartData" :chart-options="chartOptions" />
        </div>
        <div class="chart-container" v-if="tempChartData.labels.length">
            <h3>Temperature</h3>
            <LineChart :chart-data="tempChartData" :chart-options="chartOptions" />
        </div>
    </div>
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
        //
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
                    legend: { display: true },
                    title: {
                        display: true,
                        text: "Soil Data Over Time",
                        font: { size: 18 }
                    },
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

<style scoped>
.dashboard-container {
    max-width: 1000px;
    margin: 40px auto;
    padding: 32px 24px;
    background: #fff;
    border-radius: 18px;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.1);
    font-family: "Segoe UI", Arial, sans-serif;
}

.dashboard-title {
    text-align: center;
    font-size: 2rem;
    margin-bottom: 28px;
    color: #2a3d4d;
    letter-spacing: 1px;
}

.dashboard-grid {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-bottom: 18px;
}

.dashboard-row {
    display: flex;
    flex-direction: row;
    gap: 24px;
}

.dashboard-col {
    flex: 1;
    display: flex;
    flex-direction: column;
}

.dashboard-col label {
    margin-bottom: 6px;
    font-weight: 500;
    color: #3a4a5a;
}

.type-select,
.date-select {
    padding: 8px 10px;
    border-radius: 6px;
    border: 1px solid #b0bec5;
    font-size: 1rem;
    background: #f7fafc;
    transition: border 0.2s;
}

.type-select:focus,
.date-select:focus {
    border: 1.5px solid #1976d2;
    outline: none;
}

.selected-range {
    text-align: center;
    margin-top: 18px;
    font-size: 1.1rem;
    color: #1976d2;
}

.chart-container {
    margin-top: 32px;
    background: #f7fafc;
    border-radius: 12px;
    box-shadow: 0 2px 12px rgba(25, 118, 210, 0.08);
    padding: 18px 12px 12px 12px;
}

.chart-container canvas {
    /* Let Chart.js handle the height naturally */
    min-height: unset;
    height: unset !important;
    max-height: unset;
    width: 100% !important;
    display: block;
}
</style>
