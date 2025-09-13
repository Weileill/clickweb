
// ================= Firebase Modules (ES Module) =================
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getFirestore, collection, addDoc, query, orderBy, limit, onSnapshot, deleteDoc, doc
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import {
  getAuth, signInAnonymously, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

// ------------------ TODO: 填入你的 Firebase config ------------------
const firebaseConfig = {
 apiKey: "AIzaSyD2EQ5DmELxioh-1TwbJr9OOi86Blb7YbY",
  authDomain: "clickweb-1e245.firebaseapp.com",
  projectId: "clickweb-1e245",
  storageBucket: "clickweb-1e245.firebasestorage.app",
  messagingSenderId: "43331920268",
  appId: "1:43331920268:web:8650db43411e167afeb6a9",
};
// -----------------------------------------------------------------

// 初始化
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// DOM
const btn = document.getElementById('knockBtn');
const countSpan = document.getElementById('count');
const nameInput = document.getElementById('nameInput');
const board = document.getElementById('board');
const audio = document.getElementById('muyuSound');
const saveBtn = document.getElementById('saveBtn');

let sessionCount = 0;
let currentUid = null;

// ---------- 匿名登入並監聽 auth 狀態 ----------
signInAnonymously(auth)
  .then(() => console.log('匿名登入開始（如果尚未登入，系統會在後台建立匿名使用者）'))
  .catch(err => {
    console.error('匿名登入失敗', err);
    alert('匿名登入失敗：' + err.message);
  });

onAuthStateChanged(auth, user => {
  if (user) {
    currentUid = user.uid;
    console.log('auth ready, uid=', currentUid);
  } else {
    currentUid = null;
    console.log('使用者已登出或尚未登入');
  }
});

// ========== 音效播放（簡單備援） ==========
function playSound() {
  if (audio && audio.src) {
    audio.currentTime = 0;
    audio.play().catch(err => {
      console.warn('audio.play failed:', err);
      // 不額外合成聲音了，僅記錄
    });
  }
}

// ========== 點擊計數 ==========
btn.addEventListener('click', () => {
  sessionCount++;
  countSpan.textContent = sessionCount;
  playSound();
});

// ========== 上榜（將本次分數寫入 Firestore） ==========
saveBtn.addEventListener('click', async () => {
  const name = (nameInput.value || '匿名').trim();
  const score = sessionCount;

  if (score <= 0) {
    alert('還沒敲木魚，不能上榜！');
    return;
  }

  if (!auth.currentUser) {
    alert('尚未登入，請稍候再試（或檢查 Firebase 設定）');
    return;
  }

  try {
    // 保存 uid，之後用來判斷是否能刪除
    await addDoc(collection(db, 'leaderboard'), {
      name,
      score,
      timestamp: Date.now(),
      uid: auth.currentUser.uid
    });
    alert('已上榜！');
    sessionCount = 0;
    countSpan.textContent = 0;
    nameInput.value = '';
  } catch (e) {
    console.error('addDoc failed:', e);
    alert('上榜失敗：' + (e.message || e));
  }
});

// ========== 即時取得排行榜並顯示（含刪除按鈕） ==========
const leaderboardQuery = query(collection(db, 'leaderboard'), orderBy('score', 'desc'), limit(50));
onSnapshot(leaderboardQuery, snapshot => {
  board.innerHTML = '';
  snapshot.docs.forEach((docSnap, i) => {
    const data = docSnap.data();
    const id = docSnap.id;

    const row = document.createElement('div');
    row.className = 'board-row';

    const left = document.createElement('div');
    left.className = 'left';
    left.innerHTML = `<div class="rank">${i+1}</div>
                      <div class="meta">
                        <div class="name">${escapeHtml(data.name)}</div>
                        <div class="score">${data.score}</div>
                      </div>`;

    const actions = document.createElement('div');
    actions.className = 'row-actions';

    // 只有上傳者本人看到刪除按鈕（更安全）
    if (data.uid && currentUid && data.uid === currentUid) {
      const delBtn = document.createElement('button');
      delBtn.textContent = '刪除';
      delBtn.onclick = async () => {
        if (!confirm('確定要刪除此筆紀錄？')) return;
        try {
          await deleteDoc(doc(db, 'leaderboard', id));
          // Firestore onSnapshot 會自動更新畫面
        } catch (err) {
          console.error('deleteDoc failed:', err);
          alert('刪除失敗：' + (err.message || err));
        }
      };
      actions.appendChild(delBtn);
    }

    row.appendChild(left);
    row.appendChild(actions);
    board.appendChild(row);
  });
}, err => {
  console.error('onSnapshot failed:', err);
});

// ========== 小工具 ==========
function escapeHtml(s = '') {
  return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}


