//Inisialisasi CHART.JS 
const ctx = document.getElementById('telemetryChart').getContext('2d');
const telemetryChart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: [], //label wwaktu akan diisi secara otomatis
        datasets: [
            {
                label: 'Suhu (°C)',
                data: [],
                borderColor: '#f97316',
                backgroundColor: 'rgba(249, 115, 22, 0.1)',
                tension: 0.3,
                fill: true
            },
            {
                label: "CO2 / Asap (PPM)",
                data: [],
                borderColor: "#06b6d4",
                backgroundColor: 'rgba(6, 182, 212, 0.1)',
                tension: 0.3,
                fill: true
            }
        ]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {labels: {color: "#94a3b8"}}
        },
        scales: {
            x:{ticks: {color:"#64748b" }, grid: {color: "#334155"}},
            y:{ticks: {color:"#64748b" }, grid: {color: "#334155"}}
        }
    }
});

//Fungsi kontrol/override pompa manual
async function sendOverride(action) {
    try {
        const response = await fetch('/api/control', {
            method: 'POST',
            headers: {'Content-Type' : 'application/json'},
            body: JSON.stringify({action})
        });
        const result = await response.json();

        if (result.success) {
            const badge = document.getElementById('pumpStatusBadge');
            if (action == 'PUMP_ON') {
                badge.className = 'px-3 py-1 rounded-full text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/30';
                badge.innerText = 'Status: POMPA SEDANG MENYALA';
            } else {
                badge.className = 'px-3 py-1 rounded-full text-xs font-semibold bg-slate-700 text-slate-300';
                badge.innerText = 'Status: POMPA SEDANG MATI';
            }
        }
    } catch (err) {
        console.error('Gagal menyalakan/mematikan pompa: ', err);
    }
}

//inisialisasi client supabase di front-end
const SUPABASE_URL = 'https://xaamuzsqvgiauzpmttsp.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_EhWx0tcs1cf4ZCXmoyftWw_YpDxYE3W';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

//function: memperbarui seluruh UI (card, banner, grafik, tabel)
function renderTelemetryPoint(data) {
    //update indicator card
    document.getElementById('tempValue').innerText = data.temperature ?? '0';
    document.getElementById('co2Value').innerText = data.co2 ?? '0';

    //logika teks untuk indikator flame sensor
    const flameVal = data.flame;
    const isFireDetected = (flameVal === true || flameVal === 0 || flameVal === '0' || data.ai_status === 'BERBAHAYA');
    const flameElement = document.getElementById('flameValue');

    if (isFireDetected) {
        flameElement.innerText = 'Terjadi Kebakaran';
        flameElement.className = 'text-3xl font-extrabold text-red-500 mb-2';
    } else {
        flameElement.innerText = 'Tidak ada api';
        flameElement.className = 'text-3xl font-extrabold text-white mb-2'
    }

    //update banner status AI sistem secara otomatis
    const banner = document.getElementById('aiStatusBanner');
    if (isFireDetected) {
        banner.className = 'p-5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-between transition-all';
        banner.querySelector('h2').innerText = 'STATUS BERBAHAYA (KEBAKARAN AKTIF)';
    } else {
        banner.className = 'p-5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between transition-all';
        banner.querySelector('h2').innerText = 'STATUS AMAN (TIDAK ADA KEBAKARAN)';
    }

    //memasukkan data baru kke Chart.JS
    const timeNow = new Date(data.timestamp).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit', second: '2-digit'});
    telemetryChart.data.labels.push(timeNow);
    telemetryChart.data.datasets[0].data.push(data.temperature ?? 0);
    telemetryChart.data.datasets[1].data.push(data.co2 ?? 0);

    //membatasi riwayat grafik hanya berjumlah 10 titik
    if (telemetryChart.data.labels.length > 10) {
        telemetryChart.data.labels.shift();
        telemetryChart.data.datasets[0].data.shift();
        telemetryChart.data.datasets[1].data.shift();
    }
    telemetryChart.update();

    //memasukkan baris baru ke tabel event log
    const tableBody = document.getElementById('logTableBody');
    if (tableBody) {
        const tr = document.createElement('tr');
        tr.className = 'border-b border-slate-800 hover:bg-slate-800/40 transition';
        tr.innerHTML = `
            <td class="px-5 py-3 text-xs text-slate-300">${new Date(data.timestamp || Date.now()).toLocaleString()}</td>
            <td class="px-5 py-3 text-xs text-slate-300">${data.temperature ?? 0} °C</td>
            <td class="px-5 py-3 text-xs text-slate-300">${isFireDetected ? 'Terdeteksi' : 'Aman'}</td>
            <td class="px-5 py-3 text-xs text-slate-300">${data.co2 ?? 0}</td>
            <td class="px-5 py-3 text-xs font-semibold ${isFireDetected ? 'text-red-400' : 'text-emerald-400'}">${data.ai_status || 'NORMAL'}</td>
        `;
        tableBody.insertBefore(tr, tableBody.firstChild);
        if (tableBody.children.length > 10) {
            tableBody.removeChild(tableBody.lastChild);
        }
    }
}

//mengambil 10 data terakhir
async function loadInitialData() {
    const {data, error} = await _supabase
        .from('telemetry_logs')
        .select('*')
        .order('timestamp', {ascending: false})
        .limit(10);

    if (error) {
        console.error('Gagal mengambil data dari Supabase: ', error.message);
        return;
    }

    if (data && data.length > 0) {
        data.reverse().forEach(row => renderTelemetryPoint(row)); //urutan: data lama -> data baru
    }
}

loadInitialData();

//mendengarkan data baru real-time dari tabel telemetry_logs
_supabase
    .channel('public:telemetry_logs')
    .on('postgres_changes', {event: 'INSERT', schema: 'public', table: 'telemetry_logs'}, (payload) => {
        console.log('Data real-time dari Supabase: ', payload.new);
        renderTelemetryPoint(payload.new);
    })
    .subscribe();

//function: donwload dataset dari tabel event log menjadi file CSV
function exportToCSV()  {
    const table = document.querySelector('table');
    if (!table) {
        alert('Tabel tidak ditemukan');
        return;
    }
    
    //mengambil semua baris dari header sampai body
    const rows = Array.from(table.querySelectorAll('tr'));
    //filter jika hanya ada baris header atau isi tabel kosong
    const dataRows = table.querySelectorAll('tbody tr');
    if (dataRows.length === 0) {
        alert('Belum ada data log yang diexport');
        return;
    }

    if (rows.length <= 1) {
        alert('Belum ada data log untuk diekspor');
        return;
    }

    const csvContent = rows.map(row => {
        const cols = Array.from(row.querySelectorAll('th, td'));
        return cols.map(col => `"${col.innerText.replace(/"/g, '""')}"`).join(',');
    }).join('\n');

    const blob = new Blob([csvContent], {type : 'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `AgniOT_Log_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}