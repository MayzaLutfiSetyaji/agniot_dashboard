const db = require('../config/db');

const Telemetry = {
    //menyimpan data telemetry dan status sesnor ke database
    create: (data, callback) => {
        const query = 'INSERT INTO telemetry_logs (temperature, flame, co2, timestamp) VALUES (?, ?, ?, NOW())';
        db.query(query, [data.temperature, data.flame, data.co2], callback);
    },

    //mengambil riwayat log telemetri (30 data terakhir)
    getAll: (callback) => {
        const query = 'SELECT * FROM telemetry_logs ORDER BY timestamp DESC LIMIT 30';
        db.query(query, callback);
    }
};

module.exports = Telemetry;