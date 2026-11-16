const mqtt = require('mqtt');

const mqttClient = mqtt.connect('mqtt://broker.hivemq.com:1883');

mqttClient.on('connect', () => {
    console.log('Terhubung ke HiveMQ');
});

module.exports = mqttClient;