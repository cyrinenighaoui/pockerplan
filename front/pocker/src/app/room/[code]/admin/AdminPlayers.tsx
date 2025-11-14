"use client";
import { API_URL } from "../../../../../lib/api.js";

type Player = {
  username: string;
  role: string;
};

type AdminPlayersProps = {
  players: Player[];
  code: string;
  token: string;
  addLog: (msg: string) => void;
  onRoomUpdate: () => void;
};

export default function AdminPlayers({ players, code, token, addLog, onRoomUpdate }: AdminPlayersProps) {
  const currentUser = typeof window !== "undefined" ? localStorage.getItem("username") : null;
  
  const kickPlayer = async (username: string) => {
    if (!confirm(`Kick ${username} from the room?`)) return;

    try {
      const res = await fetch(`${API_URL}/api/rooms/${code}/kick/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        alert(`❌ Error: ${data.error || "Failed to kick player"}`);
        return;
      }

      addLog(`👢 Kicked player: ${username}`);
      onRoomUpdate(); // Rafraîchir les données
    } catch (error) {
      console.error("Error kicking player:", error);
      alert("❌ Network error while kicking player");
    }
  };

  const promotePlayer = async (username: string) => {
    if (!confirm(`Promote ${username} to admin?`)) return;

    try {
      const res = await fetch(`${API_URL}/api/rooms/${code}/promote/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username }),
      });

      if (!res.ok) {
        const error = await res.json();
        alert(`❌ Error: ${error.error || "Failed to promote player"}`);
        return;
      }

      addLog(`👑 Promoted player: ${username}`);
      onRoomUpdate(); // Rafraîchir les données
    } catch (error) {
      console.error("Error promoting player:", error);
      alert("❌ Network error while promoting player");
    }
  };

  return (
    <div className="admin-section">
      <h3>👥 Players ({players.length})</h3>

      <div className="players-list">
        {players.map((player, i) => (
          <div 
            key={i} 
            className={`admin-player-row ${player.role} ${player.username === currentUser ? 'current-user' : ''}`}
          >
            <div className="admin-player-info">
              <div className="admin-avatar">
                {player.username.charAt(0).toUpperCase()}
              </div>
              <div className="player-details">
                <div className="admin-name">
                  {player.username}
                  {player.username === currentUser && " (you)"}
                </div>
                <div className="admin-role">{player.role}</div>
              </div>
            </div>

            {player.role !== "admin" && (
              <div className="admin-actions">
                <button 
                  className="admin-btn promote" 
                  onClick={() => promotePlayer(player.username)}
                >
                  Promote 👑
                </button>

                <button 
                  className="admin-btn danger" 
                  onClick={() => kickPlayer(player.username)}
                >
                  Kick ❌
                </button>
              </div>
            )}

            {player.role === "admin" && player.username !== currentUser && (
              <div className="admin-badge">Admin</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}