const express = require('express');
const mqtt = require('mqtt');
const cors = require('cors');
const http = require('http');
const {Server} = require('socket.io');
require('dotenv').config();

//supabase client
const supabase = require('./config/db');

const apiRoutes = require('./routes/apiRoutes');
const webRoutes = require('./routes/webRoutes');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));
app.use(express.json());
app.use(cors());

//menggunakan rute modular
app.post('/api/control', (req, res) => {
    const {action} = req.body; // "PUMP_ON" atau "PUMP_OFF"
    mqttClient.publish('agniot/kelompok2/control', action);
    res.json({success: true, message: `Perintah ${action} dikirim ke HiveMQ`});
});

app.use('/api', apiRoutes);
app.use('/', webRoutes);

// ============ INTEGRASI HIVEMQ MQTT BROKER ============
const mqttClient = mqtt.connect(`mqtt://${process.env.MQTT_BROKER || 'broker.hivemq.com'}:${process.env.MQTT_PORT || 1883}`);
mqttClient.on('connect', () => {
    console.log('Terhubung ke HiveMQ Public Broker');
    //Subs ke topic telemetry dari ESP-12E
    mqttClient.subscribe('agniot/kelompok2/telemetry');
});

mqttClient.on('message', async (topic, message) => {
    if (topic == 'agniot/kelompok2/telemetry') {
        const payload = JSON.parse(message.toString());
        console.log('Telemetri masuk:', payload);

        //konversi flame dari ESP8266 (0 = api terdeteksi -> true, 1 = aman -> false)
        const isFire = (payload.flame === 0 || payload.flame === '0' || payload.flame === true);

        //Menyimpan data telemetry ke table telemetry_logs di supabase
        const {error} = await supabase
            .from('telemetry_logs')
            .insert([{
                temperature: payload.temperature,
                flame: isFire,
                co2: payload.co2
            }]);
        
        if (error) {
            console.error('Gagal menyimpan data ke Supabase');
        } else {
            console.log('Data berhasil disimpan ke Supabase');
        }

        io.emit('telemetryUpdate', payload);
    }
});

//================ API ENDPOINT UNTUK OVERRIDE POMPA DARI BACKEND =================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server berjalan di port ${PORT}`));
