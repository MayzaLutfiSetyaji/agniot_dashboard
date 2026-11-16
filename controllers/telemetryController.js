const Telemetry = require('../models/telemetryModel');
const supabase = require('../config/db');

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

//controller untuk export event log menjadi file berformat CSV
const exportCSV = async(req, res) => {
    try {
        //mengambil data dari tabel telemetry_logs
        const {data, error} = await supabase
            .from('telemetry_logs')
            .select('*')
            .order('timestamp',  {ascending: false});

        if (error) throw error;

        //format data menjadi CSV string
        let csvString = "ID,Timestamp,Temperature,Flame,CO2,Status AI\n";
        data.forEach(row => {
            csvString += `${row.id},"${row.timestamp}",${row.temperature},${row.flame},${row.co2},"${row.ai_status || 'Normal'}"\n`;
        });

        //set header agar browser mendeteksi sebagai file unduhan csv
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=agniot_telemetry_logs.csv');
        res.status(200).send(csvString);
    } catch (err) {
        console.error('Gagal mengeksport CSV: ', err.message);
        res.status(500).json({success: false, message: 'Gagal mengeksport data CSV'});
    }
}

module.exports = {
    getTelemetryLogs,
    exportCSV
};