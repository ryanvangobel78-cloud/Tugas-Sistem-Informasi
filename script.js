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
let currentUserRole = "";
let currentMatkulIndex = -1;

// Wait for Firebase to be ready
function waitForFirebase() {
    return new Promise((resolve) => {
        const checkFirebase = setInterval(() => {
            if (window.db && window.firestoreModules) {
                clearInterval(checkFirebase);
                resolve();
            }
        }, 100);
    });
}

// Login Function
async function login() {
    const nim = document.getElementById('nim').value;
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('errorMessage');
    const loginBtn = document.getElementById('loginBtn');

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

    if (password !== "12345678") {
        errorMessage.textContent = "Password salah!";
        errorMessage.style.display = "block";
        return;
    }

    try {
        loginBtn.disabled = true;
        loginBtn.textContent = "Memproses...";

        // Wait for Firebase to be ready
        await waitForFirebase();

        // Get Firestore modules
        const { doc, getDoc, setDoc } = window.firestoreModules;
        const userRef = doc(window.db, "users", nim);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            // Create new user
            const role = nim === "131424090" ? "admin" : "student";
            await setDoc(userRef, {
                nim: nim,
                role: role,
                readStatus: {},
                createdAt: new Date()
            });
            currentUserRole = role;
            console.log("✅ User baru dibuat:", nim, "Role:", role);
        } else {
            currentUserRole = userSnap.data().role;
            console.log("✅ User login:", nim, "Role:", currentUserRole);
        }

        currentUser = nim;
        errorMessage.style.display = "none";
        await showDashboard();

    } catch (error) {
        console.error("❌ Error login:", error);
        errorMessage.textContent = "Terjadi kesalahan! " + error.message;
        errorMessage.style.display = "block";
    } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = "Masuk";
    }
}

// Show Dashboard
async function showDashboard() {
    document.getElementById('loginPage').style.display = "none";
    document.getElementById('dashboardPage').style.display = "block";
    document.getElementById('userNim').textContent = currentUser;

    // Check if admin
    if (currentUserRole === "admin") {
        document.getElementById('adminPanel').style.display = "block";
        document.getElementById('adminBadge').innerHTML = '<span class="badge-admin">👑 ADMIN</span>';
        console.log("✅ Panel admin ditampilkan");
    } else {
        document.getElementById('adminPanel').style.display = "none";
        document.getElementById('adminBadge').innerHTML = '';
        console.log("✅ Login sebagai student");
    }

    await loadMaterials();
}

// Load Materials from Firestore
async function loadMaterials() {
    try {
        document.getElementById('loadingTable').style.display = "block";
        document.getElementById('materiTableContainer').style.display = "none";

        const { doc, getDoc } = window.firestoreModules;
        const tbody = document.getElementById('materiTable');
        tbody.innerHTML = '';

        // Get user's read status
        const userRef = doc(window.db, "users", currentUser);
        const userSnap = await getDoc(userRef);
        const readStatus = userSnap.exists() ? (userSnap.data().readStatus || {}) : {};

        console.log("📖 Read status:", readStatus);

        // Load all materials
        for (let index = 0; index < mataKuliah.length; index++) {
            const matkulRef = doc(window.db, "materials", index.toString());
            const matkulSnap = await getDoc(matkulRef);
            
            const data = matkulSnap.exists() ? matkulSnap.data() : { materi: "", tugas: "", deadline: null };
            const isRead = readStatus[index] === true;
            const readClass = isRead ? 'read' : '';

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td><strong>${mataKuliah[index]}</strong></td>
                <td>
                    ${data.materi ? 
                        `<a href="javascript:void(0)" class="materi-link ${readClass}" onclick="viewMateri(${index})">
                            ${isRead ? '✓ Sudah Dibaca' : '📖 Lihat Materi'}
                        </a>` : 
                        '<span class="no-data">Belum ada materi</span>'}
                </td>
                <td>
                    ${data.tugas ? 
                        `<a href="javascript:void(0)" class="tugas-link" onclick="uploadTugasModal(${index})">
                            📝 ${data.tugas.substring(0, 30)}${data.tugas.length > 30 ? '...' : ''}
                        </a>` : 
                        '<span class="no-data">Belum ada tugas</span>'}
                </td>
                <td>
                    ${data.deadline ? 
                        `<span class="deadline">⏰ ${formatDate(data.deadline)}</span>` : 
                        '<span class="no-data">-</span>'}
                </td>
            `;
            tbody.appendChild(row);
        }

        document.getElementById('loadingTable').style.display = "none";
        document.getElementById('materiTableContainer').style.display = "table";
        console.log("✅ Materials loaded successfully");

    } catch (error) {
        console.error("❌ Error loading materials:", error);
        alert("Gagal memuat data: " + error.message);
        document.getElementById('loadingTable').style.display = "none";
    }
}

// Format Date
function formatDate(timestamp) {
    if (!timestamp) return '-';
    
    try {
        let date;
        
        // Handle Firestore Timestamp
        if (timestamp && typeof timestamp.toDate === 'function') {
            date = timestamp.toDate();
        } 
        // Handle Date object
        else if (timestamp instanceof Date) {
            date = timestamp;
        } 
        // Handle string or number
        else {
            date = new Date(timestamp);
        }
        
        const options = { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit' 
        };
        return date.toLocaleDateString('id-ID', options);
    } catch (error) {
        console.error("Error formatting date:", error);
        return '-';
    }
}

// Save Material (Admin Only)
async function saveMateri() {
    if (currentUserRole !== "admin") {
        alert("❌ Anda tidak memiliki akses admin!");
        return;
    }

    const matkulIndex = document.getElementById('selectMatkul').value;
    const materi = document.getElementById('materiContent').value.trim();
    const tugas = document.getElementById('tugasContent').value.trim();
    const deadlineInput = document.getElementById('deadline').value;
    const saveBtn = document.getElementById('saveBtn');

    if (matkulIndex === "") {
        alert('❌ Silakan pilih mata kuliah terlebih dahulu!');
        return;
    }

    if (!materi && !tugas && !deadlineInput) {
        alert('❌ Minimal isi salah satu field!');
        return;
    }

    try {
        saveBtn.disabled = true;
        saveBtn.textContent = "Menyimpan...";

        const { doc, setDoc, getDoc } = window.firestoreModules;
        const matkulRef = doc(window.db, "materials", matkulIndex);
        
        // Get existing data
        const matkulSnap = await getDoc(matkulRef);
        const existingData = matkulSnap.exists() ? matkulSnap.data() : {};

        // Prepare update data
        const updateData = {
            matkulName: mataKuliah[parseInt(matkulIndex)],
            materi: materi || existingData.materi || "",
            tugas: tugas || existingData.tugas || "",
            deadline: deadlineInput ? new Date(deadlineInput) : (existingData.deadline || null),
            updatedAt: new Date()
        };

        // Save to Firestore
        await setDoc(matkulRef, updateData, { merge: true });

        console.log("✅ Data saved:", updateData);

        // Reset form
        document.getElementById('materiContent').value = '';
        document.getElementById('tugasContent').value = '';
        document.getElementById('deadline').value = '';
        document.getElementById('selectMatkul').value = '';

        alert('✅ Data berhasil disimpan!');
        await loadMaterials();

    } catch (error) {
        console.error("❌ Error saving material:", error);
        alert("❌ Gagal menyimpan data: " + error.message);
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = "💾 Simpan Materi & Tugas";
    }
}

// View Material
async function viewMateri(index) {
    try {
        const { doc, getDoc, updateDoc } = window.firestoreModules;
        const matkulRef = doc(window.db, "materials", index.toString());
        const matkulSnap = await getDoc(matkulRef);

        if (!matkulSnap.exists() || !matkulSnap.data().materi) {
            alert('❌ Materi belum tersedia');
            return;
        }

        const data = matkulSnap.data();
        document.getElementById('modalTitle').textContent = mataKuliah[index];
        
        // Display material content
        const materiContent = data.materi.replace(/\n/g, '<br>');
        document.getElementById('modalContent').innerHTML = `
            <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; border-left: 4px solid #667eea;">
                ${materiContent}
            </div>
        `;
        document.getElementById('materiModal').style.display = 'block';

        console.log("✅ Viewing material:", mataKuliah[index]);

        // Mark as read in Firestore
        await markAsRead(index);

    } catch (error) {
        console.error("❌ Error viewing material:", error);
        alert("❌ Gagal membuka materi: " + error.message);
    }
}

// Mark Material as Read
async function markAsRead(index) {
    try {
        const { doc, updateDoc, getDoc, setDoc } = window.firestoreModules;
        const userRef = doc(window.db, "users", currentUser);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
            console.error("❌ User document not found");
            return;
        }

        const userData = userSnap.data();
        const currentReadStatus = userData.readStatus || {};
        currentReadStatus[index.toString()] = true;

        await updateDoc(userRef, {
            readStatus: currentReadStatus
        });

        console.log("✅ Marked as read:", index);
        await loadMaterials();

    } catch (error) {
        console.error("❌ Error marking as read:", error);
    }
}

// Close Material Modal
function closeMateriModal() {
    document.getElementById('materiModal').style.display = 'none';
}

// Upload Tugas Modal
function uploadTugasModal(index) {
    currentMatkulIndex = index;
    document.getElementById('tugasModal').style.display = 'block';
    document.getElementById('fileName').textContent = '';
    document.getElementById('tugasNote').value = '';
    document.getElementById('successMsg').style.display = 'none';
    document.getElementById('fileInput').value = '';
    console.log("📤 Upload modal opened for:", mataKuliah[index]);
}

// Handle File Select
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            alert('❌ Ukuran file terlalu besar! Maksimal 10MB');
            event.target.value = '';
            return;
        }
        document.getElementById('fileName').textContent = '✓ ' + file.name + ' (' + (file.size / 1024).toFixed(2) + ' KB)';
        console.log("✅ File selected:", file.name);
    }
}

// Upload Tugas
async function uploadTugas() {
    const file = document.getElementById('fileInput').files[0];
    const note = document.getElementById('tugasNote').value.trim();
    const uploadBtn = document.getElementById('uploadBtn');

    if (!file) {
        alert('❌ Silakan pilih file terlebih dahulu!');
        return;
    }

    try {
        uploadBtn.disabled = true;
        uploadBtn.textContent = "Mengupload...";

        const { collection, doc, setDoc } = window.firestoreModules;
        
        // Create submission document
        const timestamp = Date.now();
        const submissionId = `${currentUser}_${currentMatkulIndex}_${timestamp}`;
        const submissionRef = doc(window.db, "submissions", submissionId);

        const submissionData = {
            nim: currentUser,
            matkulId: currentMatkulIndex.toString(),
            matkulName: mataKuliah[currentMatkulIndex],
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            note: note || "",
            submittedAt: new Date(),
            status: "submitted"
        };

        await setDoc(submissionRef, submissionData);

        console.log("✅ Submission saved:", submissionData);

        document.getElementById('successMsg').style.display = 'block';
        document.getElementById('fileName').textContent = '✅ ' + file.name + ' (Berhasil diupload!)';

        setTimeout(() => {
            closeTugasModal();
        }, 2000);

    } catch (error) {
        console.error("❌ Error uploading:", error);
        alert("❌ Gagal mengupload: " + error.message);
    } finally {
        uploadBtn.disabled = false;
        uploadBtn.textContent = "📤 Upload";
    }
}

// Close Tugas Modal
function closeTugasModal() {
    document.getElementById('tugasModal').style.display = 'none';
    document.getElementById('fileInput').value = '';
    document.getElementById('fileName').textContent = '';
    document.getElementById('tugasNote').value = '';
    document.getElementById('successMsg').style.display = 'none';
}

// Logout
function logout() {
    if (confirm("Apakah Anda yakin ingin keluar?")) {
        currentUser = "";
        currentUserRole = "";
        currentMatkulIndex = -1;
        document.getElementById('loginPage').style.display = "block";
        document.getElementById('dashboardPage').style.display = "none";
        document.getElementById('nim').value = "";
        document.getElementById('password').value = "";
        document.getElementById('errorMessage').style.display = "none";
        console.log("✅ Logged out successfully");
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', async function() {
    console.log("🚀 Page loaded, initializing...");
    
    // Wait for Firebase to be ready
    await waitForFirebase();
    console.log("✅ Firebase ready!");

    // Enter key for login
    const passwordInput = document.getElementById('password');
    if (passwordInput) {
        passwordInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                login();
            }
        });
    }

    // Close modal when clicking outside
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

    console.log("✅ Event listeners initialized");
});

// Make functions available globally
window.login = login;
window.logout = logout;
window.saveMateri = saveMateri;
window.viewMateri = viewMateri;
window.closeMateriModal = closeMateriModal;
window.uploadTugasModal = uploadTugasModal;
window.handleFileSelect = handleFileSelect;
window.uploadTugas = uploadTugas;
window.closeTugasModal = closeTugasModal;

console.log("✅ firebase-script.js loaded successfully");
