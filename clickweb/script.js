
// script.js (整檔貼上覆蓋)
// ================= Firebase Modules (ES Module) =================
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  deleteDoc,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged
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

// 初始化 Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ========== DOM ==========
const btn = document.getElementById('knockBtn');
const countSpan = document.getElementById('count');
const nameInput = document.getElementById('nameInput');
const board = document.getElementById('board');
const audio = document.getElementById('muyuSound');
const saveBtn = document.getElementById('saveBtn');

// ========== state ==========
let sessionCount = 0;
let currentUid = null;
let isAdmin = false;
let latestDocs = []; // 快取 onSnapshot 的 docs（用來重新 render）
let unsubSnapshot = null;

// ========== Auth: 匿名登入並監聽狀態 ==========
signInAnonymously(auth)
  .then(() => console.log('匿名登入嘗試已發起'))
  .catch(err => {
    console.error('匿名登入失敗', err);
    alert('匿名登入失敗：' + err.message);
  });

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    currentUid = null;
    isAdmin = false;
    console.log('[auth] 未登入');
    renderBoard(); // 重新 render（會隱藏刪除按鈕）
    return;
  }

  currentUid = user.uid;
  console.log('[auth] 已登入 uid=', currentUid);

  // 檢查 admins collection (admins/{uid}.isAdmin === true)
  try {
    const adminSnap = await getDoc(doc(db, 'admins', currentUid));
    isAdmin = adminSnap.exists() && adminSnap.data().isAdmin === true;
  } catch (err) {
    console.error('[auth] 檢查 admin 失敗', err);
    isAdmin = false;
  }

  console.log('[auth] isAdmin =', isAdmin);

  // 重新 render（如果有 snapshot 快取資料）
  renderBoard();
});

// ========== 音效播放 ==========
function playSound() {
  if (!audio) return;
  try {
    audio.currentTime = 0;
    audio.play().catch(err => {
      // 自動播放有時會被瀏覽器阻擋，僅記錄
      console.warn('audio.play failed:', err);
    });
  } catch (e) {
    console.warn('playSound err', e);
  }
}

// ========== 點擊木魚（計數） ==========
btn.addEventListener('click', () => {
  sessionCount++;
  countSpan.textContent = sessionCount;
  playSound();
});

// ========== 上榜功能（寫入 Firestore，包含 uid） ==========
saveBtn.addEventListener('click', async () => {
  const name = (nameInput.value || '匿名').trim();
  const score = sessionCount;

  if (score <= 0) {
    alert('還沒敲木魚，不能上榜！');
    return;
  }

  if (!auth.currentUser) {
    alert('尚未登入（Auth 尚未就緒），請稍候再試');
    return;
  }

  try {
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

// ========== 監聽排行榜（onSnapshot）並快取 docs ==========
function startSnapshot() {
  const q = query(collection(db, 'leaderboard'), orderBy('score', 'desc'), limit(50));
  if (unsubSnapshot) unsubSnapshot(); // 取消舊的（保險）
  unsubSnapshot = onSnapshot(q, (snapshot) => {
    latestDocs = snapshot.docs; // array of QueryDocumentSnapshot
    renderBoard(); // 用快取渲染
  }, (err) => {
    console.error('onSnapshot failed:', err);
  });
}
startSnapshot(); // 啟動監聽

// ========== renderBoard：把 latestDocs 用當前身份渲染到 DOM ==========
function renderBoard() {
  board.innerHTML = '';
  if (!latestDocs || latestDocs.length === 0) {
    board.innerHTML = '<div style="color:#6b4b2a">目前沒有紀錄，敲一敲然後上榜吧！</div>';
    return;
  }

  latestDocs.forEach((docSnap, idx) => {
    const data = docSnap.data();
    const id = docSnap.id;

    const row = document.createElement('div');
    row.className = 'board-row';

    const left = document.createElement('div');
    left.className = 'left';
    left.innerHTML = `<div class="rank">${idx+1}</div>
                      <div class="meta">
                        <div class="name">${escapeHtml(data.name)}</div>
                        <div class="score">${data.score}</div>
                      </div>`;

    const actions = document.createElement('div');
    actions.className = 'row-actions';

    // 顯示刪除按鈕：擁有者（data.uid === currentUid）或 isAdmin
    if ((data.uid && currentUid && data.uid === currentUid) || isAdmin) {
      const delBtn = document.createElement('button');
      delBtn.textContent = '刪除';
      delBtn.onclick = async () => {
        // double-check permission on client side
        if (!confirm('確定要刪除此筆紀錄？')) return;

        // debug log
        console.log('[delete] try delete id=', id, 'doc.uid=', data.uid, 'currentUid=', currentUid, 'isAdmin=', isAdmin);

        try {
          await deleteDoc(doc(db, 'leaderboard', id));
          console.log('[delete] success id=', id);
          // onSnapshot 會自動更新 UI
        } catch (err) {
          console.error('[delete] failed', err);
          alert('刪除失敗：' + (err.message || err));
        }
      };
      actions.appendChild(delBtn);
    }

    row.appendChild(left);
    row.appendChild(actions);
    board.appendChild(row);
  });
}

// ========== 工具：簡單的 escapeHtml ==========
function escapeHtml(s = '') {
  return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

// ========== 結尾提示 ==========
console.log('script.js 已載入：Firebase initialized, snapshot started.');


