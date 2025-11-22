// Data struktur
const mataKuliah = [
    "Penelitian Kuantitatif",
    "Manajemen Berbasis Sekolah",
    "Manajemen Peserta Didik",
    "Manajemen Sarana & Prasarana",
    "Sistem Informasi dan Pengambilan Keputusan",
    "Kemaritiman",
    "Psikologi Manajemen Pendidikan",
    "Manajemen Kearsipan"
];

let currentUser = "";
let materiData = {};
let readStatus = {};
let currentMatkulIndex = -1;

// Inisialisasi data
function initData() {
    mataKuliah.forEach((mk, index) => {
        materiData[index] = {
            materi: "",
            tugas: "",
            deadline: ""
        };
    });
}

// Login
function login() {
    const nim = document.getElementById('nim').value;
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('errorMessage');

    if (!nim) {
        errorMessage.textContent = "Silakan pilih NIM terlebih dahulu!";
        errorMessage.style.display = "block";
        return;
    }

    if (!password) {
        errorMessage.textContent = "Silakan masukkan password!";
        errorMessage.style.display = "block";
        return;
    }

    if (password === "12345678") {
        currentUser = nim;
        loadReadStatus();
        showDashboard();
    } else {
        errorMessage.textContent = "NIM atau Password salah!";
        errorMessage.style.display = "block";
    }
}

// Tampilkan Dashboard
function showDashboard() {
    document.getElementById('loginPage').style.display = "none";
    document.getElementById('dashboardPage').style.display = "block";
    document.getElementById('userNim').textContent = currentUser;

    // Cek apakah admin
    if (currentUser === "131424090") {
        document.getElementById('adminPanel').style.display = "block";
        document.getElementById('adminBadge').innerHTML = '<span class="badge-admin">👑 ADMIN</span>';
    } else {
        document.getElementById('adminPanel').style.display = "none";
        document.getElementById('adminBadge').innerHTML = '';
    }

    renderTable();
}

// Render Tabel
function renderTable() {
    const tbody = document.getElementById('materiTable');
    tbody.innerHTML = '';

    mataKuliah.forEach((mk, index) => {
        const data = materiData[index] || { materi: "", tugas: "", deadline: "" };
        const isRead = readStatus[currentUser] && readStatus[currentUser][index];
        const readClass = isRead ? 'read' : '';

        const row = `
            <tr>
                <td>${index + 1}</td>
                <td><strong>${mk}</strong></td>
                <td>
                    ${data.materi ? 
                        `<a href="#" class="materi-link ${readClass}" onclick="viewMateri(${index}); return false;">
                            ${isRead ? '✓ Sudah Dibaca' : '📖 Lihat Materi'}
                        </a>` : 
                        '<span class="no-data">Belum ada materi</span>'}
                </td>
                <td>
                    ${data.tugas ? 
                        `<a href="#" class="tugas-link" onclick="${currentUser === '131424090' ? `uploadTugasModal(${index})` : 'alert(\'Fitur upload tugas untuk mahasiswa dalam pengembangan\')'};return false;">
                            📝 ${data.tugas.substring(0, 30)}${data.tugas.length > 30 ? '...' : ''}
                        </a>` : 
                        '<span class="no-data">Belum ada tugas</span>'}
                </td>
                <td>
                    ${data.deadline ? 
                        `<span class="deadline">⏰ ${formatDate(data.deadline)}</span>` : 
                        '<span class="no-data">-</span>'}
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

// Format tanggal
function formatDate(datetime) {
    if (!datetime) return '-';
    const date = new Date(datetime);
    const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
    };
    return date.toLocaleDateString('id-ID', options);
}

// Simpan Materi (Admin)
function saveMateri() {
    const matkulIndex = document.getElementById('selectMatkul').value;
    const materi = document.getElementById('materiContent').value;
    const tugas = document.getElementById('tugasContent').value;
    const deadline = document.getElementById('deadline').value;

    if (!matkulIndex && matkulIndex !== "0") {
        alert('Silakan pilih mata kuliah terlebih dahulu!');
        return;
    }

    if (!materi && !tugas && !deadline) {
        alert('Minimal isi salah satu field!');
        return;
    }

    materiData[matkulIndex] = {
        materi: materi || materiData[matkulIndex].materi,
        tugas: tugas || materiData[matkulIndex].tugas,
        deadline: deadline || materiData[matkulIndex].deadline
    };

    // Reset form
    document.getElementById('materiContent').value = '';
    document.getElementById('tugasContent').value = '';
    document.getElementById('deadline').value = '';
    document.getElementById('selectMatkul').value = '';

    alert('✅ Data berhasil disimpan!');
    renderTable();
}

// Lihat Materi
function viewMateri(index) {
    const data = materiData[index];
    if (!data || !data.materi) {
        alert('Materi belum tersedia');
        return;
    }

    document.getElementById('modalTitle').textContent = mataKuliah[index];
    document.getElementById('modalContent').innerHTML = `
        <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; border-left: 4px solid #667eea;">
            ${data.materi.replace(/\n/g, '<br>')}
        </div>
    `;
    document.getElementById('materiModal').style.display = 'block';

    // Tandai sebagai sudah dibaca
    markAsRead(index);
}

// Tandai materi sebagai sudah dibaca
function markAsRead(index) {
    if (!readStatus[currentUser]) {
        readStatus[currentUser] = {};
    }
    readStatus[currentUser][index] = true;
    saveReadStatus();
    renderTable();
}

// Simpan status baca
function saveReadStatus() {
    const key = 'readStatus_' + currentUser;
    const data = JSON.stringify(readStatus[currentUser] || {});
    document.cookie = key + '=' + data + ';path=/;max-age=31536000';
}

// Load status baca
function loadReadStatus() {
    const key = 'readStatus_' + currentUser;
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === key) {
            try {
                readStatus[currentUser] = JSON.parse(value);
            } catch (e) {
                readStatus[currentUser] = {};
            }
            return;
        }
    }
    readStatus[currentUser] = {};
}

// Close Modal Materi
function closeMateriModal() {
    document.getElementById('materiModal').style.display = 'none';
}

// Upload Tugas Modal (Admin)
function uploadTugasModal(index) {
    currentMatkulIndex = index;
    document.getElementById('tugasModal').style.display = 'block';
    document.getElementById('fileName').textContent = '';
    document.getElementById('tugasNote').value = '';
    document.getElementById('successMsg').style.display = 'none';
}

// Handle File Select
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        document.getElementById('fileName').textContent = '✓ ' + file.name;
    }
}

// Upload Tugas
function uploadTugas() {
    const file = document.getElementById('fileInput').files[0];
    const note = document.getElementById('tugasNote').value;

    if (!file) {
        alert('Silakan pilih file terlebih dahulu!');
        return;
    }

    // Simulasi upload
    document.getElementById('successMsg').style.display = 'block';
    document.getElementById('fileName').textContent = '✓ ' + file.name + ' (Berhasil diupload)';

    setTimeout(() => {
        closeTugasModal();
    }, 2000);
}

// Close Modal Tugas
function closeTugasModal() {
    document.getElementById('tugasModal').style.display = 'none';
    document.getElementById('fileInput').value = '';
}

// Logout
function logout() {
    currentUser = "";
    document.getElementById('loginPage').style.display = "block";
    document.getElementById('dashboardPage').style.display = "none";
    document.getElementById('nim').value = "";
    document.getElementById('password').value = "";
    document.getElementById('errorMessage').style.display = "none";
}

// Inisialisasi saat halaman dimuat
document.addEventListener('DOMContentLoaded', function() {
    initData();
    
    // Enter key untuk login
    document.getElementById('password').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            login();
        }
    });

    // Close modal ketika klik di luar
    window.onclick = function(event) {
        const materiModal = document.getElementById('materiModal');
        const tugasModal = document.getElementById('tugasModal');
        if (event.target === materiModal) {
            closeMateriModal();
        }
        if (event.target === tugasModal) {
            closeTugasModal();
        }
    }
});

