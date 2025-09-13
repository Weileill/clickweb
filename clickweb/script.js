
// ===================== Firebase 初始化 =====================
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, collection, addDoc, query, orderBy, limit, onSnapshot } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

// --------- 填入你的 Firebase config ----------
const firebaseConfig = {
 apiKey: "AIzaSyD2EQ5DmELxioh-1TwbJr9OOi86Blb7YbY",
  authDomain: "clickweb-1e245.firebaseapp.com",
  projectId: "clickweb-1e245",
  storageBucket: "clickweb-1e245.firebasestorage.app",
  messagingSenderId: "43331920268",
  appId: "1:43331920268:web:8650db43411e167afeb6a9",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth();

// 匿名登入
signInAnonymously(auth)
  .then(() => console.log('匿名登入成功'))
  .catch(err => console.error('匿名登入失敗', err));

// ===================== DOM 元素 =====================
const btn = document.getElementById('knockBtn');
const countSpan = document.getElementById('count');
const nameInput = document.getElementById('nameInput');
const board = document.getElementById('board');
const audio = document.getElementById('muyuSound');
const saveBtn = document.getElementById('saveBtn');

let sessionCount = 0;

// ===================== 播放音效 =====================
function playSound() {
  if (audio && audio.src) {
    audio.currentTime = 0;
    audio.play().catch(()=>{}); // 避免瀏覽器阻擋播放
  }
}

// ===================== 點擊木魚 =====================
btn.addEventListener('click', () => {
  sessionCount++;
  countSpan.textContent = sessionCount;
  playSound();
});

// ===================== 上榜功能 =====================
saveBtn.addEventListener('click', async () => {
  const name = nameInput.value.trim() || '匿名';
  const score = sessionCount;

  if(score === 0) {
    alert('還沒敲木魚，不能上榜！');
    return;
  }

  try {
    await addDoc(collection(db, 'leaderboard'), {
      name,
      score,
      timestamp: Date.now()
    });
    alert('已上榜！');
    sessionCount = 0;
    countSpan.textContent = 0;
    nameInput.value = '';
  } catch(e) {
    console.error(e);
    alert('上榜失敗，請稍後再試');
  }
});

// ===================== 即時排行榜 =====================
const leaderboardQuery = query(collection(db, 'leaderboard'), orderBy('score','desc'), limit(10));

onSnapshot(leaderboardQuery, snapshot => {
  board.innerHTML = ''; // 清空原排行榜
  snapshot.docs.forEach((doc, i) => {
    const data = doc.data();
    const div = document.createElement('div');
    div.className = 'board-row';
    div.innerHTML = `
      <div class="rank">${i+1}</div>
      <div class="meta">
        <div class="name">${data.name}</div>
        <div class="score">${data.score}</div>
      </div>
    `;
    board.appendChild(div);
  });
});



