import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, setDoc, onSnapshot, collection, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAneBm46gs6L73E5O0GWFHKz9twnTmFIeo",
    authDomain: "music-edcd3.firebaseapp.com",
    projectId: "music-edcd3",
    storageBucket: "music-edcd3.firebasestorage.app",
    messagingSenderId: "514206966226",
    appId: "1:514206966226:web:b588818706c4c0d901680b",
    measurementId: "G-RXEF4KSNH6"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Ар бир браузер үчүн уникалдуу ID түзүү (бир адам бир эле жолу добуш бериши үчүн)
const userId = localStorage.getItem('app_user_id') || ('user_' + Math.random().toString(36).substr(2, 9));
localStorage.setItem('app_user_id', userId);

const artists = [
    { id: 'nurlan', name: 'Нурлан Насип', career: 'Ырчы', loc: 'Токтогул', age: '33' },
    { id: 'nurila', name: 'Нурила', career: 'Ырчы', loc: 'Өзгөн', age: '24' },
    { id: 'mirbek', name: 'Мирбек Атабеков', career: 'Актер', loc: 'Талас', age: '38' },
    { id: 'ulukmanapo', name: 'Ulukmanapo', career: 'Репер', loc: 'Бишкек', age: '31' },
    { id: 'jax', name: 'Jax 02.14', career: 'Ырчы', loc: 'Сокулук', age: '33' }
];

const container = document.getElementById('artistDetailContainer');

// Базадан маалыматтарды реалдуу убакытта алуу
onSnapshot(collection(db, "artist_ratings"), (snapshot) => {
    const allRatings = {};
    snapshot.forEach((doc) => {
        const data = doc.data();
        const votes = Object.values(data.users || {});
        // Орточо рейтингди эсептөө: (Баардык упайлар / Добуш бергендердин саны)
        const avg = votes.length > 0 ? (votes.reduce((a, b) => a + b, 0) / votes.length).toFixed(1) : 0;
        allRatings[doc.id] = {
            avg: avg,
            userVal: data.users ? data.users[userId] || 0 : 0
        };
    });
    renderArtists(allRatings);
});

function renderArtists(allRatings) {
    if (!container) return;
    container.innerHTML = '';

    artists.forEach(artist => {
        const ratingData = allRatings[artist.id] || { avg: 0, userVal: 0 };
        const card = document.createElement('div');
        card.className = 'artist-card';
        card.innerHTML = `
            <div class="h-content">
                <h1 class="f-block">${artist.name}</h1>
                <div class="info-row">
                    <p>${artist.career} • ${artist.loc}</p>
                    <p>${artist.age} жашта</p>
                </div>
                <div class="rating-bar">
                    <div class="stars" data-id="${artist.id}" data-user-val="${ratingData.userVal}">
                        ${[1, 2, 3, 4, 5].map(n => `
                            <span class="star ${n <= ratingData.userVal ? 'active' : ''}" data-v="${n}">★</span>
                        `).join('')}
                    </div>
                    <span class="rei-num">${ratingData.avg}</span>
                </div>
            </div>
        `;
        container.appendChild(card);
    });

    // Жылдызды басуу логикасы
    document.querySelectorAll('.star').forEach(s => {
        s.onclick = async function() {
            const artistId = this.parentElement.dataset.id;
            const oldVal = parseInt(this.parentElement.dataset.userVal);
            const newVal = parseInt(this.dataset.v);
            
            // Эгер ошол эле жылдызды кайра басса - 0 кылуу, болбосо жаңы маанини коюу
            const finalVal = (oldVal === newVal) ? 0 : newVal;

            try {
                const docRef = doc(db, "artist_ratings", artistId);
                const docSnap = await getDoc(docRef);
                let usersData = {};

                if (docSnap.exists()) {
                    usersData = docSnap.data().users || {};
                }

                if (finalVal === 0) {
                    delete usersData[userId]; // 0 болсо өчүрүү
                } else {
                    usersData[userId] = finalVal; // Жаңы добуш кошуу
                }

                await setDoc(docRef, { users: usersData }, { merge: true });
            } catch (e) {
                console.error("Firebase Error: ", e);
            }
        };
    });
}
