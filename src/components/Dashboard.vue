<template>
    <div class="dashboard-container">
        <h2 class="dashboard-title">Soil Data Dashboard</h2>
        <div class="date-picker-row">
            <div class="date-picker-group">
                <label for="startDatePicker">Start Date:</label>
                <select id="startDatePicker" v-model="startDate" class="date-select">
                    <option v-for="date in availableDates" :key="date" :value="date">{{ date }}</option>
                </select>
            </div>
            <div class="date-picker-group">
                <label for="endDatePicker">End Date:</label>
                <select id="endDatePicker" v-model="endDate" class="date-select">
                    <option v-for="date in availableDates" :key="date" :value="date" :disabled="date < startDate">{{ date }}</option>
                </select>
            </div>
        </div>
        <div class="selected-range" v-if="startDate && endDate">
            <span>Selected Range: <strong>{{ startDate }}</strong> to <strong>{{ endDate }}</strong></span>
        </div>
        <div class="chart-container" v-if="filteredChartData.length">
            <LineChart :chart-data="chartData" :chart-options="chartOptions" />
        </div>
    </div>
</template>

<script>
import { Line } from 'vue-chartjs';
import {
    Chart,
    LineElement,
    PointElement,
    LinearScale,
    Title,
    CategoryScale,
    Tooltip,
    Legend
} from 'chart.js';
import { h } from 'vue';

Chart.register(LineElement, PointElement, LinearScale, Title, CategoryScale, Tooltip, Legend);

const csvData = require("@/assets/soil_data_cleaned.csv");

export default {
    name: "Dashboard",
    components: {
        LineChart: {
            extends: Line,
            props: ['chartData', 'chartOptions'],
            mounted() {
                // For Vue 3 and vue-chartjs 5+, use this.$refs.canvas and Chart.js directly
                this.chartInstance = new Chart(this.$refs.canvas.getContext('2d'), {
                    type: 'line',
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
                // Use Vue 3 render function (h) instead of this.$createElement
                return h('canvas', { ref: 'canvas' });
            }
        }
    },
    data() {
        return {
            soilData: [],
            availableDates: [],
            startDate: "",
            endDate: ""
        };
    },
    computed: {
        filteredChartData() {
            if (!this.startDate || !this.endDate) return [];
            return this.soilData.filter(d => {
                const date = d.dateTime.split(' ')[0];
                return date >= this.startDate && date <= this.endDate;
            });
        },
        chartData() {
            return {
                labels: this.filteredChartData.map(d => d.dateTime),
                datasets: [
                    {
                        label: 'Soil Value',
                        data: this.filteredChartData.map(d => d.value),
                        fill: false,
                        borderColor: '#1976d2',
                        backgroundColor: '#1976d2',
                        tension: 0.2,
                        pointRadius: 2
                    }
                ]
            };
        },
        chartOptions() {
            return {
                responsive: true,
                plugins: {
                    legend: { display: true },
                    title: {
                        display: true,
                        text: 'Soil Data Over Time',
                        font: { size: 18 }
                    },
                    tooltip: { enabled: true }
                },
                scales: {
                    x: {
                        title: { display: true, text: 'Date Time' },
                        ticks: { autoSkip: true, maxTicksLimit: 12 }
                    },
                    y: {
                        title: { display: true, text: 'Value' },
                        beginAtZero: false
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
            this.soilData = csvData.map(row => {
                return {
                    sensorId: row.sensor_id,
                    date: row.date,
                    dateTime: row.date_time,
                    measurementType: row.measurement_type,
                    value: parseFloat(row.value)
                };
            });
            // Find min and max date
            const dates = this.soilData.map(d => d.dateTime.split(" ")[0]);
            const jsDates = dates.map(d => new Date(d));
            this.availableDates = [...new Set(jsDates.map(d => d.toISOString().slice(0, 10)))];
            this.availableDates.sort();
            this.startDate = this.availableDates[0] || "";
            this.endDate = this.availableDates[this.availableDates.length - 1] || "";
        }
    }
};
</script>

<style scoped>
.dashboard-container {
    max-width: 500px;
    margin: 40px auto;
    padding: 32px 24px;
    background: #fff;
    border-radius: 18px;
    box-shadow: 0 4px 24px rgba(0,0,0,0.10);
    font-family: 'Segoe UI', Arial, sans-serif;
}

.dashboard-title {
    text-align: center;
    font-size: 2rem;
    margin-bottom: 28px;
    color: #2a3d4d;
    letter-spacing: 1px;
}

.date-picker-row {
    display: flex;
    justify-content: space-between;
    gap: 24px;
    margin-bottom: 18px;
}

.date-picker-group {
    display: flex;
    flex-direction: column;
    flex: 1;
}

.date-picker-group label {
    margin-bottom: 6px;
    font-weight: 500;
    color: #3a4a5a;
}

.date-select {
    padding: 8px 10px;
    border-radius: 6px;
    border: 1px solid #b0bec5;
    font-size: 1rem;
    background: #f7fafc;
    transition: border 0.2s;
}

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
    padding: 18px 12px 12px 12px;
    box-shadow: 0 2px 12px rgba(25, 118, 210, 0.08);
}
</style>
