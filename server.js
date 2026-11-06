const express = require('express');
const mqtt = require('mqtt');
const cors = require('cors');
const mysql = require('mysql2');
require('dotenv').config();

const app = express();
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
        const values = [payload.temperature, payload.flame, payload.co2];

        db.query(query, values, (err, result) => {
            if (err) {
                console.error('Gagal menyimpan ke db: ', err);
            } else {
                console.log('Data telemetri berhasil disimpan ke db ID: ', result.insertId);
            }
        });
    }
});

//================ API ENDPOINT UNTUK OVERRIDE POMPA DARI BACKEND =================
app.post('/api/control', (req, res) => {
    const {action} = req.body; // "PUMP_ON" atau "PUMP_OFF"
    mqttClient.publish('agniot/kelompok2/control', action);
    res.json({success: true, message: `Perintah ${action} dikirim ke HiveMQ`});
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server berjalan di port ${PORT}`));
