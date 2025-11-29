// ============================================================
// E-LEARNING KELAS C MANAJEMEN PENDIDIKAN
// Firebase Integration Script
// ============================================================
// 
// CATATAN: File ini TIDAK PERLU DIGANTI APAPUN!
// Config Firebase ada di file index.html
//
// ============================================================

console.log("🚀 Loading firebase-script.js...");

// ============================================================
// DATA STRUKTUR
// ============================================================

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

// Global variables
let currentUser = "";
let currentUserRole = "";
let currentMatkulIndex = -1;
let db = null;
let firestoreModules = null;

// ============================================================
// WAIT FOR FIREBASE TO BE READY
// ============================================================

function waitForFirebase() {
    return new Promise((resolve, reject) => {
        console.log("⏳ Waiting for Firebase to initialize...");
        
        let attempts = 0;
        const maxAttempts = 100; // 10 detik (100 x 100ms)
        
        const checkFirebase = setInterval(() => {
            attempts++;
            
            if (window.db && window.firestoreModules) {
                db = window.db;
                firestoreModules = window.firestoreModules;
                clearInterval(checkFirebase);
                console.log("✅ Firebase is ready!");
                console.log("📊 Database:", db);
                resolve();
            }
            
            if (attempts >= maxAttempts) {
                clearInterval(checkFirebase);
                console.error("❌ Firebase initialization timeout!");
                reject(new Error("Firebase gagal diinisialisasi"));
            }
        }, 100);
    });
}

// ============================================================
// LOGIN FUNCTION
// ============================================================

async function login() {
    console.log("🔐 Login attempt started...");
    
    const nim = document.getElementById('nim').value;
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('errorMessage');
    const loginBtn = document.getElementById('loginBtn');

    // Reset error message
    errorMessage.style.display = "none";

    // Validasi input
    if (!nim) {
        errorMessage.textContent = "❌ Silakan pilih NIM terlebih dahulu!";
        errorMessage.style.display = "block";
        console.warn("⚠️ NIM kosong");
        return;
    }

    if (!password) {
        errorMessage.textContent = "❌ Silakan masukkan password!";
        errorMessage.style.display = "block";
        console.warn("⚠️ Password kosong");
        return;
    }

    if (password !== "12345678") {
        errorMessage.textContent = "❌ Password salah!";
        errorMessage.style.display = "block";
        console.warn("⚠️ Password tidak cocok");
        return;
    }

    try {
        // Disable button
        loginBtn.disabled = true;
        loginBtn.textContent = "⏳ Memproses...";
        console.log("🔄 Processing login for NIM:", nim);

        // Wait for Firebase
        await waitForFirebase();

        // Get Firestore modules
        const { doc, getDoc, setDoc } = firestoreModules;
        
        console.log("📡 Connecting to Firestore...");
        
        // Check if user exists
        const userRef = doc(db, "users", nim);
        console.log("🔍 Checking user document:", nim);
        
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            console.log("👤 User not found, creating new user...");
            
            // Create new user
            const role = nim === "131424090" ? "admin" : "student";
            const newUser = {
                nim: nim,
                role: role,
                readStatus: {},
                createdAt: new Date(),
                lastLogin: new Date()
            };
            
            await setDoc(userRef, newUser);
            currentUserRole = role;
            
            console.log("✅ New user created:", newUser);
        } else {
            // User exists, update last login
            currentUserRole = userSnap.data().role;
            
            await setDoc(userRef, {
                lastLogin: new Date()
            }, { merge: true });
            
            console.log("✅ User login:", nim, "| Role:", currentUserRole);
        }

        // Set current user
        currentUser = nim;
        errorMessage.style.display = "none";
        
        // Show dashboard
        await showDashboard();
        
        console.log("🎉 Login successful!");

    } catch (error) {
        console.error("❌ Error during login:", error);
        errorMessage.textContent = "❌ Terjadi kesalahan: " + error.message;
        errorMessage.style.display = "block";
        
        // Show detailed error in console
        console.error("Error details:", {
            message: error.message,
            code: error.code,
            stack: error.stack
        });
    } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = "Masuk";
    }
}

// ============================================================
// SHOW DASHBOARD
// ============================================================

async function showDashboard() {
    console.log("📊 Showing dashboard...");
    
    // Hide login page
    document.getElementById('loginPage').style.display = "none";
    document.getElementById('dashboardPage').style.display = "block";
    
    // Set user info
    document.getElementById('userNim').textContent = currentUser;

    // Check if admin
    if (currentUserRole === "admin") {
        document.getElementById('adminPanel').style.display = "block";
        document.getElementById('adminBadge').innerHTML = '<span class="badge-admin">👑 ADMIN</span>';
        console.log("✅ Admin panel enabled");
    } else {
        document.getElementById('adminPanel').style.display = "none";
        document.getElementById('adminBadge').innerHTML = '';
        console.log("✅ Student mode");
    }

    // Load materials
    await loadMaterials();
}

// ============================================================
// LOAD MATERIALS FROM FIRESTORE
// ============================================================

async function loadMaterials() {
    console.log("📚 Loading materials...");
    
    try {
        // Show loading
        document.getElementById('loadingTable').style.display = "block";
        document.getElementById('materiTableContainer').style.display = "none";

        const { doc, getDoc } = firestoreModules;
        const tbody = document.getElementById('materiTable');
        tbody.innerHTML = '';

        // Get user's read status
        const userRef = doc(db, "users", currentUser);
        const userSnap = await getDoc(userRef);
        const readStatus = userSnap.exists() ? (userSnap.data().readStatus || {}) : {};

        console.log("📖 Read status loaded:", readStatus);

        // Load each material
        for (let index = 0; index < mataKuliah.length; index++) {
            const matkulRef = doc(db, "materials", index.toString());
            const matkulSnap = await getDoc(matkulRef);
            
            const data = matkulSnap.exists() ? matkulSnap.data() : {
                materi: "",
                tugas: "",
                deadline: null
            };
            
            const isRead = readStatus[index.toString()] === true;
            const readClass = isRead ? 'read' : '';

            // Create table row
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

        // Hide loading
        document.getElementById('loadingTable').style.display = "none";
        document.getElementById('materiTableContainer').style.display = "table";
        
        console.log("✅ Materials loaded successfully");

    } catch (error) {
        console.error("❌ Error loading materials:", error);
        alert("Gagal memuat data: " + error.message);
        document.getElementById('loadingTable').style.display = "none";
    }
}

// ============================================================
// FORMAT DATE
// ============================================================

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
        
        // Check if date is valid
        if (isNaN(date.getTime())) {
            return '-';
        }
        
        const options = { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit',
            timeZone: 'Asia/Jakarta'
        };
        
        return date.toLocaleDateString('id-ID', options);
    } catch (error) {
        console.error("Error formatting date:", error);
        return '-';
    }
}

// ============================================================
// SAVE MATERIAL (ADMIN ONLY)
// ============================================================

async function saveMateri() {
    console.log("💾 Saving material...");
    
    if (currentUserRole !== "admin") {
        alert("❌ Anda tidak memiliki akses admin!");
        console.warn("⚠️ Non-admin tried to save material");
        return;
    }

    const matkulIndex = document.getElementById('selectMatkul').value;
    const materi = document.getElementById('materiContent').value.trim();
    const tugas = document.getElementById('tugasContent').value.trim();
    const deadlineInput = document.getElementById('deadline').value;
    const saveBtn = document.getElementById('saveBtn');

    // Validation
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
        saveBtn.textContent = "⏳ Menyimpan...";
        
        console.log("📝 Saving to Firestore...", {
            matkulIndex,
            materi: materi.substring(0, 50) + "...",
            tugas: tugas.substring(0, 50) + "...",
            deadline: deadlineInput
        });

        const { doc, setDoc, getDoc } = firestoreModules;
        const matkulRef = doc(db, "materials", matkulIndex);
        
        // Get existing data
        const matkulSnap = await getDoc(matkulRef);
        const existingData = matkulSnap.exists() ? matkulSnap.data() : {};

        // Prepare update data
        const updateData = {
            matkulName: mataKuliah[parseInt(matkulIndex)],
            materi: materi || existingData.materi || "",
            tugas: tugas || existingData.tugas || "",
            deadline: deadlineInput ? new Date(deadlineInput) : (existingData.deadline || null),
            updatedAt: new Date(),
            updatedBy: currentUser
        };

        // Save to Firestore
        await setDoc(matkulRef, updateData, { merge: true });

        console.log("✅ Data saved successfully:", updateData);

        // Reset form
        document.getElementById('materiContent').value = '';
        document.getElementById('tugasContent').value = '';
        document.getElementById('deadline').value = '';
        document.getElementById('selectMatkul').value = '';

        alert('✅ Data berhasil disimpan!');
        
        // Reload materials
        await loadMaterials();

    } catch (error) {
        console.error("❌ Error saving material:", error);
        alert("❌ Gagal menyimpan data: " + error.message);
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = "💾 Simpan Materi & Tugas";
    }
}

// ============================================================
// VIEW MATERIAL
// ============================================================

async function viewMateri(index) {
    console.log("👁️ Viewing material:", mataKuliah[index]);
    
    try {
        const { doc, getDoc } = firestoreModules;
        const matkulRef = doc(db, "materials", index.toString());
        const matkulSnap = await getDoc(matkulRef);

        if (!matkulSnap.exists() || !matkulSnap.data().materi) {
            alert('❌ Materi belum tersedia');
            console.warn("⚠️ Material not found for index:", index);
            return;
        }

        const data = matkulSnap.data();
        
        // Set modal content
        document.getElementById('modalTitle').textContent = mataKuliah[index];
        
        const materiContent = data.materi.replace(/\n/g, '<br>');
        document.getElementById('modalContent').innerHTML = `
            <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; border-left: 4px solid #667eea;">
                ${materiContent}
            </div>
        `;
        
        // Show modal
        document.getElementById('materiModal').style.display = 'block';

        console.log("✅ Material displayed");

        // Mark as read
        await markAsRead(index);

    } catch (error) {
        console.error("❌ Error viewing material:", error);
        alert("❌ Gagal membuka materi: " + error.message);
    }
}

// ============================================================
// MARK MATERIAL AS READ
// ============================================================

async function markAsRead(index) {
    console.log("✓ Marking as read:", index);
    
    try {
        const { doc, updateDoc, getDoc } = firestoreModules;
        const userRef = doc(db, "users", currentUser);
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

        console.log("✅ Marked as read successfully");
        
        // Reload materials to update UI
        await loadMaterials();

    } catch (error) {
        console.error("❌ Error marking as read:", error);
    }
}

// ============================================================
// CLOSE MATERIAL MODAL
// ============================================================

function closeMateriModal() {
    document.getElementById('materiModal').style.display = 'none';
    console.log("✖️ Material modal closed");
}

// ============================================================
// UPLOAD TUGAS MODAL
// ============================================================

function uploadTugasModal(index) {
    console.log("📤 Opening upload modal for:", mataKuliah[index]);
    
    currentMatkulIndex = index;
    document.getElementById('tugasModal').style.display = 'block';
    document.getElementById('fileName').textContent = '';
    document.getElementById('tugasNote').value = '';
    document.getElementById('successMsg').style.display = 'none';
    document.getElementById('fileInput').value = '';
}

// ============================================================
// HANDLE FILE SELECT
// ============================================================

function handleFileSelect(event) {
    const file = event.target.files[0];
    
    if (file) {
        const maxSize = 10 * 1024 * 1024; // 10MB
        
        if (file.size > maxSize) {
            alert('❌ Ukuran file terlalu besar! Maksimal 10MB');
            event.target.value = '';
            console.warn("⚠️ File too large:", file.size);
            return;
        }
        
        const fileSizeKB = (file.size / 1024).toFixed(2);
        document.getElementById('fileName').textContent = `✓ ${file.name} (${fileSizeKB} KB)`;
        console.log("✅ File selected:", file.name, fileSizeKB, "KB");
    }
}

// ============================================================
// UPLOAD TUGAS
// ============================================================

async function uploadTugas() {
    console.log("📤 Uploading assignment...");
    
    const file = document.getElementById('fileInput').files[0];
    const note = document.getElementById('tugasNote').value.trim();
    const uploadBtn = document.getElementById('uploadBtn');

    if (!file) {
        alert('❌ Silakan pilih file terlebih dahulu!');
        return;
    }

    try {
        uploadBtn.disabled = true;
        uploadBtn.textContent = "⏳ Mengupload...";

        const { doc, setDoc } = firestoreModules;
        
        // Create submission document
        const timestamp = Date.now();
        const submissionId = `${currentUser}_${currentMatkulIndex}_${timestamp}`;
        const submissionRef = doc(db, "submissions", submissionId);

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

        // Show success message
        document.getElementById('successMsg').style.display = 'block';
        document.getElementById('fileName').textContent = `✅ ${file.name} (Berhasil diupload!)`;

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

// ============================================================
// CLOSE TUGAS MODAL
// ============================================================

function closeTugasModal() {
    document.getElementById('tugasModal').style.display = 'none';
    document.getElementById('fileInput').value = '';
    document.getElementById('fileName').textContent = '';
    document.getElementById('tugasNote').value = '';
    document.getElementById('successMsg').style.display = 'none';
    console.log("✖️ Upload modal closed");
}

// ============================================================
// LOGOUT
// ============================================================

function logout() {
    if (confirm("Apakah Anda yakin ingin keluar?")) {
        console.log("👋 Logging out...");
        
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

// ============================================================
// INITIALIZE ON PAGE LOAD
// ============================================================

document.addEventListener('DOMContentLoaded', async function() {
    console.log("🚀 Page loaded, initializing application...");
    
    try {
        // Wait for Firebase
        await waitForFirebase();
        console.log("✅ Firebase connection established");
        
        // Enter key for login
        const passwordInput = document.getElementById('password');
        if (passwordInput) {
            passwordInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    login();
                }
            });
            console.log("✅ Enter key listener added");
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
        console.log("🎉 Application ready!");
        
    } catch (error) {
        console.error("❌ Initialization error:", error);
        alert("Gagal menginisialisasi aplikasi. Cek console untuk detail.");
    }
});

// ============================================================
// MAKE FUNCTIONS AVAILABLE GLOBALLY
// ============================================================

window.login = login;
window.logout = logout;
window.saveMateri = saveMateri;
window.viewMateri = viewMateri;
window.closeMateriModal = closeMateriModal;
window.uploadTugasModal = uploadTugasModal;
window.handleFileSelect = handleFileSelect;
window.uploadTugas = uploadTugas;
window.closeTugasModal = closeTugasModal;

console.log("✅ firebase-script.js loaded successfully!");
console.log("📝 All functions registered globally");