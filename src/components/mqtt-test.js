const mqtt = require('mqtt');

const client = mqtt.connect('ws://mqtt-sooft.duckdns.org:9001');

client.on('connect', () => {
    console.log('✅ Connected to MQTT WebSocket');
    client.subscribe('sensor/temperature', (err) => {
        if (!err) {
            console.log('✅ Subscribed to sensor/temperature');
        } else {
            console.error('❌ Subscription error:', err);
        }
    });
});

client.on('message', (topic, message) => {
    console.log(`📩 Message received on ${topic}: ${message.toString()}`);
});

client.on('error', (err) => {
    console.error('❌ Connection error:', err);
});
