const btn = document.getElementById('knockBtn');
const countSpan = document.getElementById('count');
const nameInput = document.getElementById('nameInput');
const board = document.getElementById('board');
const audio = document.getElementById('muyuSound');
let sessionCount = 0;


function playSound() {
  if (audio && audio.src) {
    audio.currentTime = 0;
    audio.play().catch(()=>{}); 
  }
}


btn.addEventListener('click', ()=>{
  sessionCount++;
  countSpan.textContent = sessionCount;
  playSound();
});


document.getElementById('saveBtn').addEventListener('click', async ()=>{
  const name = nameInput.value.trim() || '匿名';
  const score = sessionCount;
  if(score===0) return alert('不會先敲一下嗎sb');
  
  try {
    await window.firebaseDB && addDoc(collection(window.firebaseDB,'leaderboard'),{
      name,
      score,
      timestamp: Date.now()
    });
    alert('已上榜！');
    sessionCount = 0;
    countSpan.textContent = 0;
  } catch(e){
    console.error(e);
    alert('失敗，請稍後再試');
  }
});


if(window.firebaseDB){
  const q = query(collection(window.firebaseDB,'leaderboard'), orderBy('score','desc'), limit(10));
  onSnapshot(q, snapshot=>{
    board.innerHTML = '';
    snapshot.docs.forEach((doc,i)=>{
      const data = doc.data();
      const div = document.createElement('div');
      div.className = 'board-row';
      div.innerHTML = `
        <div class="left">
          <div class="rank">${i+1}</div>
          <div class="meta">
            <div class="name">${data.name}</div>
            <div class="score">${data.score}</div>
          </div>
        </div>
      `;
      board.appendChild(div);
    });
  });
}
