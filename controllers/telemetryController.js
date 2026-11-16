const Telemetry = require('../models/telemetryModel');

//controller untuk mengambil riwayat log telemetry
const getTelemetryLogs = (req, res) => {
    Telemetry.getAll((err, results) => {
        if (err) {
            console.error('Gagal mendapatkan data telemetry: ', err);
            return res.status(500).json({
                success : false,
                message : 'Terjadi kesalahan ketika mengambil data log'
            });
        }

        res.status(200).json({
            success : true,
            message : results
        });
    });
};

module.exports = {
    getTelemetryLogs
};