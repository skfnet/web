import { db } from "./firebase-config.js";
import {
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const servers = {
  iceServers: [
    { urls: ["stun:stun.l.google.com:19302"] }
  ]
};

const remoteVideo = document.getElementById("remoteVideo");
const roomInput = document.getElementById("roomInput");
const joinBtn = document.getElementById("joinBtn");
const statusEl = document.getElementById("status");

const timeOverlay = document.getElementById("timeOverlay");
const nameOverlay = document.getElementById("nameOverlay");
const statusOverlay = document.getElementById("statusOverlay");
const fullscreenBtn = document.getElementById("fullscreenBtn");

roomInput.addEventListener("input", () => {
  roomInput.value = roomInput.value
    .replace(/\D/g, "")
    .slice(0, 6);
});

fullscreenBtn.onclick = async () => {
  try {
    if (!document.fullscreenElement) {
      document.body.classList.add("fullscreen-mode");
      await document.body.requestFullscreen();

      fullscreenBtn.innerHTML =
        '<i class="material-icons">fullscreen_exit</i>';
    } else {
      document.body.classList.remove("fullscreen-mode");
      await document.exitFullscreen();

      fullscreenBtn.innerHTML =
        '<i class="material-icons">fullscreen</i>';
    }
  } catch (err) {
    console.error(err);
  }
};

document.addEventListener("fullscreenchange", () => {
  if (!document.fullscreenElement) {
    document.body.classList.remove("fullscreen-mode");

    fullscreenBtn.innerHTML =
      '<i class="material-icons">fullscreen</i>';
  }
});

let pc;
let roomId;

// ⏱ формат времени
function formatDateTime() {
  const d = new Date();
  const pad = (n) => n.toString().padStart(2, "0");

  const days = ["SUN","MON","TUE","WED","THU","FRI","SAT"];

  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ` +
         `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} ` +
         `${days[d.getDay()]}`;
}

// ⏱ таймер (только когда подключено)
setInterval(() => {
  if (!pc) return;
  timeOverlay.textContent = formatDateTime();
}, 1000);

// 🔌 подключение
joinBtn.onclick = async () => {
  roomId = roomInput.value.trim();

  if (!roomId) {
    alert("Введите код комнаты");
    return;
  }

  statusEl.textContent = "Проверка комнаты...";

  const roomRef = doc(db, "rooms", roomId);
  const roomSnap = await getDoc(roomRef);

  if (!roomSnap.exists()) {
    alert("Комната не найдена");
    return;
  }

  const data = roomSnap.data();

  if (!data.offer) {
    alert("Эта камера не активна");
    return;
  }

  if (data.used === true) {
    alert("❌ Эта трансляция уже просмотрена.\nСоздайте новую камеру.");
    return;
  }

  statusEl.textContent = "Подключение...";

  pc = new RTCPeerConnection(servers);

  pc.oniceconnectionstatechange = () => {
  console.log("ICE:", pc.iceConnectionState);
};

  pc.ontrack = (event) => {

    if (remoteVideo.srcObject) return;

    console.log("Получен поток");

    remoteVideo.srcObject = event.streams[0];

    remoteVideo.play().catch(console.error);

};

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      addDoc(
        collection(db, "rooms", roomId, "calleeCandidates"),
        event.candidate.toJSON()
      );
    }
  };

  const offer = data.offer;

  await pc.setRemoteDescription(new RTCSessionDescription(offer));

  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);

  const roomRefLive = doc(db, "rooms", roomId);

  await setDoc(roomRef, {
    answer: {
      type: answer.type,
      sdp: answer.sdp
    },
    used: true,
    status: "online"
  }, { merge: true });

  // 📡 live обновление UI
  onSnapshot(roomRefLive, (snap) => {
    const data = snap.data();
    if (!data) return;

    nameOverlay.textContent = data.name || "Камера";
    statusOverlay.textContent =
      data.status === "online" ? "Онлайн" : "Не в сети";
  });

  statusEl.textContent = "Подключено!";
};

// 🚪 выход
window.addEventListener("beforeunload", async () => {
  if (roomId) {
    await setDoc(doc(db, "rooms", roomId), {
      status: "offline"
    }, { merge: true });
  }
});
