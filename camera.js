import { db } from "./firebase-config.js";
import {
  doc,
  setDoc,
  collection,
  addDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const servers = {
  iceServers: [
    { urls: ["stun:stun.l.google.com:19302"] }
  ]
};

const localVideo = document.getElementById("localVideo");
const roomCodeEl = document.getElementById("roomCode");
const statusEl = document.getElementById("status");
const createBtn = document.getElementById("createRoom");
const cameraNameInput = document.getElementById("cameraNameInput");
const saveNameBtn = document.getElementById("saveNameBtn");
const savedName = localStorage.getItem("globalCameraName");

if (savedName) {
  cameraNameInput.value = savedName;
}

let pc;
let localStream;
let roomId;

// 🎥 включение камеры
async function startMedia() {
  localStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
  });

  localVideo.srcObject = localStream;
}

// 🧠 генерация ID
function generateRoomId() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// 💾 сохранить имя
saveNameBtn.onclick = async () => {
  const name = cameraNameInput.value.trim() || "Камера";

  // 💾 1. сохраняем ГЛОБАЛЬНО (важно!)
  localStorage.setItem("globalCameraName", name);

  // ☁️ 2. если комната есть — обновляем Firebase
  if (roomId) {
    await setDoc(doc(db, "rooms", roomId), {
      name: name
    }, { merge: true });
  }

  // ✅ сообщение
  statusEl.textContent = "Название сохранено!";
};

// 📡 создать комнату
createBtn.onclick = async () => {
  await startMedia();

  roomId = generateRoomId();
  roomCodeEl.textContent = roomId;

  createBtn.style.display = "none";

  pc = new RTCPeerConnection(servers);

  localStream.getTracks().forEach(track => {
    pc.addTrack(track, localStream);
  });

  const callerCandidates = collection(db, "rooms", roomId, "callerCandidates");

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      addDoc(callerCandidates, event.candidate.toJSON());
    }
  };

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  const roomRef = doc(db, "rooms", roomId);

  await setDoc(roomRef, {
    offer: {
      type: offer.type,
      sdp: offer.sdp
    },
    status: "online",
    name: localStorage.getItem("globalCameraName") || cameraNameInput.value || "Камера"
  });

  statusEl.textContent = "Комната создана. Ожидание зрителя...";

  // 👀 слушаем answer
  onSnapshot(roomRef, (snapshot) => {
    const data = snapshot.data();

    if (!pc.currentRemoteDescription && data?.answer) {
      const answer = new RTCSessionDescription(data.answer);
      pc.setRemoteDescription(answer);
      statusEl.textContent = "Зритель подключился!";
    }
  });

  // 👂 ICE от viewer
  const calleeCandidates = collection(db, "rooms", roomId, "calleeCandidates");

  onSnapshot(calleeCandidates, (snapshot) => {
    snapshot.docChanges().forEach(change => {
      if (change.type === "added") {
        pc.addIceCandidate(new RTCIceCandidate(change.doc.data()));
      }
    });
  });
};