// ==========================================
// 🔧 CẤU HÌNH P2P CHAT SERVER
// ==========================================

// ✅ CÙNG 1 MÁY (Alice & Bob trên cùng máy): Dùng localhost
export const API_BASE_URL = 'http://localhost:8080/api';
export const WS_BASE_URL = 'http://localhost:8080/ws/signaling';

// 🌐 NHIỀU MÁY KHÁC NHAU: Uncomment 2 dòng dưới và comment 2 dòng trên
// export const API_BASE_URL = 'http://192.168.31.105:8080/api';
// export const WS_BASE_URL = 'http://192.168.31.105:8080/ws/signaling';

// ==========================================
// 🌍 STUN SERVERS (cho WebRTC NAT traversal)
// ==========================================
export const STUN_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' }
];

export const ICE_SERVERS = {
  iceServers: STUN_SERVERS
};

