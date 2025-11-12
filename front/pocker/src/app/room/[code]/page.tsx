"use client";
import { useEffect, useState, use } from "react";
import Image from "next/image";
import "./room.css";
import { API_URL } from "../../../../lib/api.js";

type Player = { username: string; role: "admin" | "player" };

export default function RoomLobby({ params }: { params: Promise<{ code: string }> }) {
  // Déballer params avec React.use()
  const { code } = use(params);
  
  const [room, setRoom] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploadPreview, setUploadPreview] = useState<any[] | null>(null);
  const [msg, setMsg] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  // Initialisation côté client seulement
  useEffect(() => {
    setIsClient(true);
    setToken(localStorage.getItem("token"));
  }, []);

  const fetchRoom = async () => {
    if (!token) return;
    const res = await fetch(`${API_URL}/api/rooms/${code}/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (res.ok) setRoom(data);
    setLoading(false);
  };

  useEffect(() => {
    if (token && code) {
      fetchRoom();
      const id = setInterval(fetchRoom, 2000);
      return () => clearInterval(id);
    }
  }, [token, code]);

  // Pendant le rendu initial côté serveur, afficher un loader générique
  if (!isClient) {
    return <div style={{ padding: 24 }}>Loading...</div>;
  }

  if (!token) return <div style={{ padding: 24 }}>You need to login.</div>;
  if (loading) return <div style={{ padding: 24 }}>Loading room...</div>;

  const players: Player[] = room?.players || [];
  
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
    if (!uploadPreview) return;
    if (!token) return alert("You need to login");

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

  return (
    <main className="room-root">
      <Image src="/img1.jpg" alt="background" fill className="room-bg" />
      <section className="room-card">

        <div className="room-header">
          <h2>Room <span className="badge">{room.code}</span></h2>
          <div className="mode-tag">{room.mode.toUpperCase()}</div>
        </div>

        <p className="room-sub">Waiting room — players currently connected</p>

        <div className="players-list">
          {players.map((p, i) => (
            <div key={i} className={`player ${p.role}`}>
              <div className="avatar">{p.username.charAt(0).toUpperCase()}</div>
              <div className="meta">
                <div className="name">{p.username}</div>
                <div className="role">{p.role}</div>
              </div>
            </div>
          ))}
        </div>

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
                headers: { Authorization: `Bearer ${token}` }
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
        </div>

        <div className="room-actions">
          <button className="btn ghost" onClick={() => navigator.clipboard.writeText(room.code)}>
            Copy code
          </button>
        </div>
      </section>
    </main>
  );
}