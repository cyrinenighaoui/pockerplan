"use client";
import { useEffect, useState } from "react";
import { API_URL } from "../../../../../lib/api";
import AdminBacklog from "./AdminBacklog";
import AdminPlayers from "./AdminPlayers";
import AdminRoomInfo from "./AdminRoomInfo";
import AdminLogs from "./AdminLogs";

type Room = {
  code: string;
  mode: string;
  players: Array<{ username: string; role: string }>;
  backlog: any[];
  started: boolean;
  current_task_index: number;
};

type AdminDashboardProps = {
  code: string;
  token: string;
  addLog: (msg: string) => void;
};

export default function AdminDashboard({ code, token, addLog }: AdminDashboardProps) {
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<string[]>([]);

  // Fonction pour ajouter des logs
  const handleAddLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${msg}`;
    setLogs(prev => [...prev, logMessage]);
    addLog(msg); // Appeler aussi la fonction parent si nécessaire
  };

  // Fonction pour rafraîchir les données de la room
  const fetchRoom = async () => {
    try {
      const res = await fetch(`${API_URL}/api/rooms/${code}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (res.ok) {
        const data = await res.json();
        setRoom({
          ...data,
          backlog: data.backlog || [],
        });
      } else {
        handleAddLog("❌ Failed to load room data");
      }
    } catch (err) {
      console.error("Error fetching room:", err);
      handleAddLog("❌ Error fetching room data");
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour mettre à jour la room (celle qui était manquante)
  const handleRoomUpdate = async () => {
    await fetchRoom();
  };

  useEffect(() => {
    if (token) {
      fetchRoom();
      
      // Rafraîchissement automatique toutes les 5 secondes
      const interval = setInterval(fetchRoom, 5000);
      return () => clearInterval(interval);
    }
  }, [token, code]);

  if (loading) {
    return <div>Loading admin dashboard...</div>;
  }

  if (!room) {
    return <div>Failed to load room data</div>;
  }

  // Vérifier que l'utilisateur est bien admin
  const currentUser = typeof window !== "undefined" ? localStorage.getItem("username") : null;
  const isAdmin = room.players.some(
    (p) => p.username === currentUser && p.role === "admin"
  );

  if (!isAdmin) {
    return <div>Access denied. Admin privileges required.</div>;
  }

  return (
    <div className="admin-dashboard">
      <h1>Admin Dashboard - Room {room.code}</h1>
      
      <div className="admin-grid">
        <div className="admin-column">
          <AdminRoomInfo room={room} code={code} />
          <br></br>
          <AdminPlayers 
            players={room.players} 
            code={code} 
            token={token} 
            addLog={handleAddLog}
            onRoomUpdate={handleRoomUpdate} // ← CORRECTION ICI
          />
        </div>
        
        <div className="admin-column">
          <AdminBacklog 
            room={room} 
            code={code} 
            token={token} 
            addLog={handleAddLog}
            onRoomUpdate={handleRoomUpdate} // ← CORRECTION ICI
          />
                    <br></br>

          <AdminLogs logs={logs} />
        </div>
      </div>

    </div>);
}