// ================= 1. FIREBASE ЖАНА КИТЕПКАНАЛАР =================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { 
  getFirestore, collection, addDoc, getDocs, 
  deleteDoc, doc, query, orderBy, serverTimestamp, onSnapshot, limit 
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import { 
  getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut 
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAneBm46gs6L73E5O0GWFHKz9twnTmFIeo",
  authDomain: "music-edcd3.firebaseapp.com",
  projectId: "music-edcd3",
  storageBucket: "music-edcd3.firebasestorage.app",
  messagingSenderId: "514206966226",
  appId: "1:514206966226:web:b588818706c4c0d901680b"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const ALL_CATEGORIES = ['video_clips','shorts','top_hits','hits','new_hits','upcoming'];
let isLoaded = false;

// ================= 2. СТИЛДҮҮ CUSTOM CONFIRM (MODAL) =================
const showConfirmModal = (message) => {
  return new Promise((resolve) => {
    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'custom-modal-overlay';
    modalOverlay.innerHTML = `
      <div class="custom-modal-card">
        <div class="custom-modal-icon">🗑️</div>
        <h3>Ырастоо</h3>
        <p>${message}</p>
        <div class="custom-modal-actions">
          <button id="modal-btn-cancel">Жок</button>
          <button id="modal-btn-confirm">Өчүрүү</button>
        </div>
      </div>
    `;
    document.body.appendChild(modalOverlay);

    document.getElementById('modal-btn-cancel').onclick = () => {
      modalOverlay.remove();
      resolve(false);
    };
    document.getElementById('modal-btn-confirm').onclick = () => {
      modalOverlay.remove();
      resolve(true);
    };
  });
};

// ================= 3. ЖАКШЫРТЫЛГАН TOAST БИЛДИРҮҮЛӨРҮ =================
window.showMsg = (txt, type = "success") => {
  let container = document.getElementById('music-toast-box');
  if (!container) {
    container = document.createElement('div');
    container.id = 'music-toast-box';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `music-toast-item ${type}`;
  
  const icons = { success: "✅", error: "❌", warning: "⚠️", info: "🗑️" };
  toast.innerHTML = `<span>${icons[type] || "✨"}</span> <span>${txt}</span>`;
  
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('hide');
    setTimeout(() => toast.remove(), 400);
  }, 3000);
};

// ================= 4. МААЛЫМАТ КОШУУ (ЛИМИТ МЕНЕН) =================
window.confirmUpload = async () => {
  const cat = document.getElementById('mainCategory').value;
  const artist = document.getElementById('artistName').value.trim();
  const name = document.getElementById('itemName').value.trim();
  const url = document.getElementById('itemUrl').value.trim();
  const fileInput = document.getElementById('imgFile');
  const file = fileInput ? fileInput.files[0] : null;

  if (!artist || !url) return showMsg("Маалыматты толук толтуруңуз!", "error");

  const btn = document.getElementById('uploadBtn');
  const btnText = btn.querySelector('.btn-text');
  btn.disabled = true; 
  btnText.innerText = "Текшерилүүдө...";

  try {
    if (cat === 'top_hits' || cat === 'shorts') {
        const checkSnap = await getDocs(collection(db, cat));
        const limitNum = (cat === 'top_hits') ? 5 : 4;

        if (checkSnap.size >= limitNum) {
            showMsg(`${cat === 'top_hits' ? 'Топ 5' : 'Шортс'} толуп калды!`, "warning");
            btn.disabled = false;
            btnText.innerText = "Сайтка чыгаруу";
            return;
        }
    }

    let coverUrl = "";
    if (file && (cat === "top_hits" || cat === "upcoming")) {
      coverUrl = await uploadToCloudinary(file);
    }

    await addDoc(collection(db, cat), {
      artist: artist,
      name: (cat === "shorts" ? "" : name),
      src: url,
      cover: coverUrl,
      created_at: serverTimestamp()
    });

    showMsg("Ийгиликтүү кошулду! ✨");
    window.closeUpload();
    document.getElementById('artistName').value = "";
    document.getElementById('itemName').value = "";
    document.getElementById('itemUrl').value = "";
  } catch (err) {
    showMsg("Ката кетти!", "error");
  } finally {
    btn.disabled = false; 
    btnText.innerText = "Сайтка чыгаруу";
  }
};

// ================= 5. ӨЧҮРҮҮ (CUSTOM MODAL МЕНЕН) =================
window.askDelete = async (cat, id) => {
  const confirmed = await showConfirmModal("Бул маалыматты өчүрүүнү каалайсызбы?");
  if (confirmed) {
    try {
      await deleteDoc(doc(db, cat, id));
      showMsg("Маалымат өчүрүлдү", "info");
    } catch (err) { 
      showMsg("Өчүрүүдө ката кетти!", "error"); 
    }
  }
};

// ================= 6. БАШКА ФУНКЦИЯЛАР (Өзгөрүүсүз) =================
async function uploadToCloudinary(file) {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", "albumartist"); 
  const res = await fetch("https://api.cloudinary.com/v1_1/dfqx89tk6/image/upload", { method: "POST", body: fd });
  const data = await res.json();
  return data.secure_url || "";
}

function extractVideoId(url) {
    const reg = /^.*(?:youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
    const match = url.match(reg);
    return (match && match[1].length === 11) ? match[1] : url;
}

async function loadAllItems() {
  ALL_CATEGORIES.forEach(c => {
    const list = document.getElementById("list-" + c);
    if (!list) return;
    let qLimit = (c === 'top_hits') ? 5 : (c === 'shorts' ? 4 : 20);
    const q = query(collection(db, c), orderBy("created_at", "desc"), limit(qLimit));
    
    onSnapshot(q, (snap) => {
      list.innerHTML = "";
      snap.forEach(docSnap => {
        const d = docSnap.data();
        const id = docSnap.id;
        const coverImg = d.cover || `https://img.youtube.com/vi/${extractVideoId(d.src)}/mqdefault.jpg`;
        
        list.insertAdjacentHTML("beforeend", `
          <div class="swipe-container" id="cont-${id}">
            <div class="delete-btn" onclick="askDelete('${c}','${id}')">✕</div>
            <div class="item">
                <img src="${coverImg}" style="width:50px;height:50px;object-fit:cover;border-radius:10px;margin-right:12px; border: 1px solid #30363d;">
                <div style="flex:1; overflow:hidden;">
                    <b style="color:white; display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${d.artist} ${d.name ? '- '+d.name : ''}</b>
                    <small style="color:#8b949e; font-size:11px;">${d.src}</small>
                </div>
            </div>
          </div>
        `);
      });
    });
  });
}

onAuthStateChanged(auth, user => {
  const loginScreen = document.getElementById('authWrapper');
  const adminMain = document.getElementById('admin-main');
  if (user) {
    loginScreen.style.display = "none";
    adminMain.style.display = "block";
    if (!isLoaded) { loadAllItems(); isLoaded = true; }
  } else {
    loginScreen.style.display = "flex";
    adminMain.style.display = "none";
  }
});

window.login = async () => {
    const email = document.getElementById('email-in').value;
    const pass = document.getElementById('pass-in').value;
    try { await signInWithEmailAndPassword(auth, email, pass); } catch(e) { showMsg("Кирүү катасы!", "error"); }
};

window.openUpload = () => { document.getElementById('uploadModal').style.display = 'flex'; };
window.closeUpload = () => { document.getElementById('uploadModal').style.display = 'none'; };
  
