const express = require('express');
const mqtt = require('mqtt');
const cors = require('cors');
const mysql = require('mysql2');
const http = require('http');
const {Server} = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));
app.use(express.json());
app.use(cors());

// ============== KONEKSI DATABASE MYSQL ==================
const db = mysql.createConnection({
    host: 'localhost',  
    user: 'root',
    password: '',
    database: 'agniot_db' //Pastikan db sudah dibuat terlebih dahulu
});

db.connect((err) => {
    if (err) {
        console.error('Koneksi MySQL gagal:',err);
        return
    }
    console.log('Terhubung ke database');
});

// ============ INTEGRASI HIVEMQ MQTT BROKER ============
const mqttClient = mqtt.connect('mqtt://broker.hivemq.com:1883');
mqttClient.on('connect', () => {
    console.log('Terhubung ke HiveMQ Public Broker');
    //Subs ke topic telemetry dari ESP-12E
    mqttClient.subscribe('agniot/kelompok2/telemetry');
});

mqttClient.on('message', (topic, message) => {
    if (topic == 'agniot/kelompok2/telemetry') {
        const payload = JSON.parse(message.toString());
        console.log('Telemetri masuk:', payload);

        // Simpan ke database MySQL di sini
        const query = 'INSERT INTO telemetry_logs (temperature, flame, co2, timestamp) VALUES (?, ?, ?, NOW())';
        db.query(query, [payload.temperature, payload.flame, payload.co2]);
        io.emit('telemetryUpdate', payload);
    }
});

//================ API ENDPOINT UNTUK OVERRIDE POMPA DARI BACKEND =================
app.post('/api/control', (req, res) => {
    const {action} = req.body; // "PUMP_ON" atau "PUMP_OFF"
    mqttClient.publish('agniot/kelompok2/control', action);
    res.json({success: true, message: `Perintah ${action} dikirim ke HiveMQ`});
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server berjalan di port ${PORT}`));
