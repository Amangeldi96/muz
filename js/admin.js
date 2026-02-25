// ================= 1. FIREBASE ЖАНА КИТЕПКАНАЛАР =================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { 
  getFirestore, collection, addDoc, getDocs, 
  deleteDoc, doc, query, orderBy, serverTimestamp, onSnapshot,
  limit // Чектөө үчүн кошулду
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import { 
  getAuth, signInWithEmailAndPassword, 
  onAuthStateChanged, signOut 
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

// Firebase Конфигурациясы
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

// ================= 2. CLOUDINARY ЖҮКТӨӨ =================
async function uploadToCloudinary(file) {
  if (!file) return "";
  const fd = new FormData();
  fd.append("file", file);
  // Сиздин скриншот боюнча "albumartist" деп өзгөртүлдү
  fd.append("upload_preset", "albumartist"); 

  try {
    const res = await fetch("https://api.cloudinary.com/v1_1/dfqx89tk6/image/upload", { 
        method: "POST", 
        body: fd 
    });
    const data = await res.json();
    
    if (data.secure_url) {
        return data.secure_url;
    } else {
        console.error("Cloudinary Error:", data);
        return "";
    }
  } catch (err) {
    console.error("Cloudinary Fetch Error:", err);
    return "";
  }
}

// ================= 3. YOUTUBE ID КЕСИП АЛУУ =================
function extractVideoId(url) {
    if (!url) return "";
    const reg = /^.*(?:youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
    const match = url.match(reg);
    return (match && match[1].length === 11) ? match[1] : url;
}

// ================= 4. ТИЗМЕНИ ЖҮКТӨӨ (ЧЕКТӨӨЛӨР МЕНЕН) =================
async function loadAllItems() {
  ALL_CATEGORIES.forEach(c => {
    const list = document.getElementById("list-" + c);
    if (!list) return;

    // Сиз сураган чектөөлөр (Limit)
    let qLimit = 20; // Калгандарына демейки чектөө
    if (c === 'top_hits') qLimit = 5; // Топ-5 ыр
    if (c === 'shorts') qLimit = 4;   // 4 Шортс

    const q = query(
        collection(db, c), 
        orderBy("created_at", "desc"),
        limit(qLimit) // Фильтрди ушул жерден колдонобуз
    );
    
    onSnapshot(q, (snap) => {
      list.innerHTML = "";
      snap.forEach(docSnap => {
        const d = docSnap.data();
        const id = docSnap.id;
        
        const coverImg = d.cover || `https://img.youtube.com/vi/${extractVideoId(d.src)}/mqdefault.jpg`;
        const imgTag = `<img src="${coverImg}" style="width:45px;height:45px;object-fit:cover;border-radius:8px;margin-right:12px;">`;

        const title = (c === "shorts") ? d.artist : `${d.artist} - ${d.name}`;
        
        list.insertAdjacentHTML("beforeend", `
          <div class="swipe-container" id="cont-${id}">
            <div class="delete-btn" onclick="askDelete('${c}','${id}')">✕</div>
            <div class="item">
                ${imgTag}
                <div style="flex:1; overflow:hidden;">
                    <b style="display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${title}</b>
                    <small style="color:#888; font-size:10px;">${d.src}</small>
                </div>
            </div>
          </div>
        `);
      });
    });
  });
}

// ================= 5. МААЛЫМАТ КОШУУ =================
window.confirmUpload = async () => {
  const cat = document.getElementById('mainCategory').value;
  const artist = document.getElementById('artistName').value.trim();
  const name = document.getElementById('itemName').value.trim();
  const url = document.getElementById('itemUrl').value.trim();
  const fileInput = document.getElementById('imgFile');
  const file = fileInput ? fileInput.files[0] : null;

  if (!artist || !url) return showMsg("Артист жана шилтеме керек!", true);

  const btn = document.getElementById('uploadBtn');
  const btnText = btn.querySelector('.btn-text');
  
  btn.disabled = true; 
  btnText.innerText = "Жүктөлүүдө...";

  try {
    let coverUrl = "";
    // Эгер файл тандалган болсо, аны жүктөйбүз (Top Hits жана Upcoming үчүн)
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

    showMsg("Ийгиликтүү кошулду!");
    window.closeUpload();
    
    // Форманы тазалоо
    document.getElementById('artistName').value = "";
    document.getElementById('itemName').value = "";
    document.getElementById('itemUrl').value = "";
    if (fileInput) fileInput.value = "";
    document.getElementById('l-imgFile').innerHTML = "Мукаба тандаңыз <span>+</span>";

  } catch (err) {
    console.error("Upload Error:", err);
    showMsg("Ката кетти: " + err.message, true);
  } finally {
    btn.disabled = false; 
    btnText.innerText = "Сайтка чыгаруу";
  }
};

// ================= 6. БАШКА ФУНКЦИЯЛАР =================
window.adjustForm = () => {
  const cat = document.getElementById('mainCategory').value;
  const divName = document.getElementById('divName');
  const divFile = document.getElementById('divFile');

  if (!divName || !divFile) return;

  divName.classList.remove('hidden-field');
  divFile.classList.remove('hidden-field');

  if (cat === "shorts") {
    divName.classList.add('hidden-field');
    divFile.classList.add('hidden-field');
  } else if (['video_clips', 'hits', 'new_hits'].includes(cat)) {
    divFile.classList.add('hidden-field');
  }
};

window.askDelete = async (cat, id) => {
  if (!confirm("Чын эле өчүрөсүзбү?")) return;
  try {
    await deleteDoc(doc(db, cat, id));
    showMsg("Өчүрүлдү!");
  } catch (err) { showMsg("Ката: " + err.message, true); }
};

window.showMsg = (txt, err = false) => {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `modern-toast ${err ? 'error' : 'success'}`;
  toast.innerHTML = txt;
  container.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => { 
    toast.classList.remove('show'); 
    setTimeout(() => toast.remove(), 400); 
  }, 3000);
};

window.login = async () => {
  const email = document.getElementById('email-in').value.trim();
  const pass = document.getElementById('pass-in').value.trim();
  try {
    await signInWithEmailAndPassword(auth, email, pass);
  } catch (err) { showMsg("Кирүү катасы: " + err.message, true); }
};

window.logout = async () => {
    await signOut(auth);
    location.reload();
};

onAuthStateChanged(auth, async user => {
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

window.openUpload = () => {
    document.getElementById('uploadModal').style.display = 'flex';
    window.adjustForm();
};

window.closeUpload = () => {
    document.getElementById('uploadModal').style.display = 'none';
};

document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll('.category-header').forEach(h => {
        h.onclick = function() {
            this.classList.toggle('active');
            this.nextElementSibling.classList.toggle('show');
        };
    });
});
