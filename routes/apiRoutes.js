const express = require('express');
const router = express.Router();

//memanggil telemetryController dan controlController
const telemetryController = require('../controllers/telemetryController');
const controlController = require('../controllers/controlController');

//enpdoint rest API
//mengambil riwayat log telemetry dari database
router.get('/telemetry/logs', telemetryController.getTelemetryLogs);

//route untuk export event log dalam file berformat csv
router.get('/telemetry/export', telemetryController.exportCSV);

module.exports = router;