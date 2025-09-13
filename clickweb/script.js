
import { collection, addDoc, getDocs, deleteDoc, doc, getFirestore } from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";
import { initializeApp } from "firebase/app";

// Firebase config & 初始化
const firebaseConfig = {
 apiKey: "AIzaSyD2EQ5DmELxioh-1TwbJr9OOi86Blb7YbY",
  authDomain: "clickweb-1e245.firebaseapp.com",
  projectId: "clickweb-1e245",
  storageBucket: "clickweb-1e245.firebasestorage.app",
  messagingSenderId: "43331920268",
  appId: "1:43331920268:web:8650db43411e167afeb6a9",
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

signInAnonymously(auth)
  .then(() => console.log("匿名登入成功"))
  .catch(err => console.error("匿名登入失敗", err));

const leaderboardContainer = document.getElementById("leaderboard");

// 顯示排行榜
async function fetchLeaderboard() {
  leaderboardContainer.innerHTML = ""; // 清空
  const querySnapshot = await getDocs(collection(db, "leaderboard"));
  querySnapshot.forEach(docSnap => {
    const data = docSnap.data();
    const entry = document.createElement("div");
    entry.textContent = `${data.name} - ${data.score}`;

    // 刪除按鈕
    const delBtn = document.createElement("button");
    delBtn.textContent = "刪除";
    delBtn.style.marginLeft = "10px";
    delBtn.onclick = async () => {
      try {
        await deleteDoc(doc(db, "leaderboard", docSnap.id));
        alert("已刪除該榜單");
        fetchLeaderboard(); // 刷新排行榜
      } catch (err) {
        console.error(err);
        alert("刪除失敗: " + err.message);
      }
    };

    entry.appendChild(delBtn);
    leaderboardContainer.appendChild(entry);
  });
}

// 新增榜單
async function submitScore(name, score) {
  try {
    if (!auth.currentUser) return;
    await addDoc(collection(db, "leaderboard"), {
      name,
      score,
      timestamp: Date.now()
    });
    fetchLeaderboard(); // 更新榜單
  } catch (err) {
    console.error(err);
    alert("上榜失敗: " + err.message);
  }
}

// 初始載入排行榜
fetchLeaderboard();





