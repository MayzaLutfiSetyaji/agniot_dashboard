const sendPumpControl = (mqttClient) => {
    return (req, res) => {
        const {action} = req.body; //berisi PUMP_ON atau PUMP_OFF

        if (!action || (action !== 'PUMP_ON' && action !== 'PUMP_OFF')) {
            return res.status(400).json({
                success : false,
                message : 'Pilih PUMP_ON atau PUMP_OFF'
            });
        }

        //publish perintah ke HiveMQ
        mqttClient.publish('agniot/kelompok2control', action, (err) =>  {
            if (err) {
                console.error('Gagal mengirim perintah ke HiveMQ: ', err);
                return res.status(500).json({
                    success : false,
                    message : 'Gagal mengirim perintah ke broker MQTT'
                });
            }

            console.log(`Perintah manual override terkirim: ${action}`);
            res.status(200).json({
                success : true,
                message : `Perintah ${action} berhasil terkirim ke broker MQTT`
            });
        });
    };
};

module.exports = {
    sendPumpControl
};