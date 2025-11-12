"use client";
import { useEffect, useState, use } from "react";
import Image from "next/image";
import "./room.css";
import { API_URL } from "../../../../lib/api.js";
import { useRouter } from "next/navigation";

type Player = {
  username: string;
  role: "admin" | "player";
};

export default function RoomLobby({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();

  const [room, setRoom] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploadPreview, setUploadPreview] = useState<any[] | null>(null);
  const [msg, setMsg] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    setToken(localStorage.getItem("token"));
    setUsername(localStorage.getItem("username"));
  }, []);

  // 🔁 Récupération des infos de la room
  const fetchRoom = async () => {
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/api/rooms/${code}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (res.ok) {
        setRoom(data);

        // 🚀 Si la partie a démarré -> redirection automatique
        if (data.started) {
          router.push(`/play/${code}`);
          return;
        }
      }
    } catch (err) {
      console.error("Error fetching room:", err);
    }

    setLoading(false);
  };

  // 🔄 Rafraîchissement toutes les 2 secondes
  useEffect(() => {
    if (token && code) {
      fetchRoom();
      const interval = setInterval(fetchRoom, 2000);
      return () => clearInterval(interval);
    }
  }, [token, code]);

  // 🚀 Lancer la partie (admin)
  const handleStart = async () => {
    if (!token) return alert("Not authorized");

    try {
      const res = await fetch(`${API_URL}/api/rooms/${code}/start/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        alert("🚀 Game started!");
        router.push(`/play/${code}`);
      } else {
        const err = await res.json();
        alert("❌ Failed to start: " + (err.error || "unknown error"));
      }
    } catch (error) {
      console.error("Error starting game:", error);
      alert("⚠️ Server error while starting game");
    }
  };

  // 🧾 Upload backlog (admin)
  const handleFile = async (file: File) => {
    setMsg("");
    if (!file) return;
    try {
      const text = await file.text();
      const json = JSON.parse(text);

      if (!Array.isArray(json)) {
        setMsg("❌ JSON must be an array");
        setUploadPreview(null);
        return;
      }

      setUploadPreview(json);
      setMsg(`✅ Loaded ${json.length} backlog items (preview).`);
    } catch (e: any) {
      setMsg("❌ Invalid JSON file");
      setUploadPreview(null);
    }
  };

  const handleUpload = async () => {
    if (!uploadPreview || !token) return alert("You need to login");

    const res = await fetch(`${API_URL}/api/rooms/${code}/backlog/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(uploadPreview),
    });

    const data = await res.json();
    if (res.ok) {
      setMsg(`✅ Backlog uploaded (${data.count} items).`);
      setUploadPreview(null);
      fetchRoom();
    } else {
      setMsg("❌ " + (data.error || "Upload failed"));
    }
  };

  // 🧑‍💻 Vérifie si utilisateur = admin
  const players: Player[] = room?.players || [];
  const isAdmin = players.some((p) => p.username === username && p.role === "admin");

  // 🕓 États d’attente
  if (!isClient) return <div style={{ padding: 24 }}>Loading...</div>;
  if (!token) return <div style={{ padding: 24 }}>You need to login.</div>;
  if (loading) return <div style={{ padding: 24 }}>Loading room...</div>;

  // ✅ Redirection si le jeu a déjà démarré
// ✅ Redirection automatique si la partie a commencé
useEffect(() => {
  if (room?.started) {
    router.push(`/play/${code}`);
  }
}, [room, code, router]);


  return (
    <main className="room-root">
      <Image src="/img1.jpg" alt="background" fill className="room-bg" />
      <section className="room-card">
        <div className="room-header">
          <h2>
            Room <span className="badge">{room.code}</span>
          </h2>
          <div className="mode-tag">{room.mode.toUpperCase()}</div>
        </div>

        <p className="room-sub">Players currently connected:</p>

        <div className="players-list">
          {players.map((p, i) => (
            <div
              key={i}
              className={`player ${p.role} ${p.username === username ? "current-user" : ""}`}
            >
              <div className="avatar">{p.username.charAt(0).toUpperCase()}</div>
              <div className="meta">
                <div className="name">{p.username}</div>
                <div className="role">
                  {p.role}
                  {p.username === username && " (you)"}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ✅ INTERFACE ADMIN */}
        {isAdmin && (
          <div className="backlog-block">
            <div className="backlog-title">Backlog JSON</div>
            <div className="backlog-row">
              <input
                className="file-input"
                type="file"
                accept="application/json"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              <button className="btn primary" onClick={handleUpload} disabled={!uploadPreview}>
                Upload to room
              </button>
              <button
                className="btn ghost"
                onClick={async () => {
                  if (!token) return alert("You need to login");
                  const res = await fetch(`${API_URL}/api/rooms/${code}/backlog/export/`, {
                    headers: { Authorization: `Bearer ${token}` },
                  });
                  const data = await res.json();
                  const blob = new Blob([JSON.stringify(data, null, 2)], {
                    type: "application/json",
                  });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `${code}_backlog_export.json`;
                  a.click();
                }}
              >
                Download current 📥
              </button>
            </div>

            {msg && <div className="backlog-msg">{msg}</div>}

            {room?.backlog?.length > 0 && (
              <div className="backlog-info">
                Current backlog: <b>{room.backlog.length}</b> items
              </div>
            )}

            <button
              className="btn start"
              disabled={!room?.backlog?.length}
              onClick={handleStart}
            >
              🚀 Commencer la partie
            </button>
          </div>
        )}

        {/* ✅ INTERFACE JOUEUR NORMAL */}
        {!isAdmin && (
          <div className="info-zone">
            <p>Waiting for the admin to start the game… 🕒</p>
            <div className="loading-spinner"></div>
            <p className="small-text">You will be redirected automatically when the game starts.</p>
          </div>
        )}

        <div className="room-actions">
          <button
            className="btn ghost"
            onClick={() => navigator.clipboard.writeText(room.code)}
          >
            Copy code
          </button>
        </div>
      </section>
    </main>
  );
}
