"use client";

export default function AdminRoomInfo({ room, code }: { room: any; code: string }) {
  if (!room) return null;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code);
    alert(`Room code ${code} copied to clipboard!`);
  };

  return (
    <div className="admin-section">
      <h3>🏠 Room Information</h3>

      <div className="admin-info-grid">
        <div className="admin-info-item">
          <span className="label">Room code:</span>
          <span className="value code" onClick={copyToClipboard} style={{cursor: 'pointer'}}>
            {code} 📋
          </span>
        </div>

        <div className="admin-info-item">
          <span className="label">Mode:</span>
          <span className="value mode">{room.mode.toUpperCase()}</span>
        </div>

        <div className="admin-info-item">
          <span className="label">Players:</span>
          <span className="value">{room.players?.length || 0}</span>
        </div>

        <div className="admin-info-item">
          <span className="label">Backlog items:</span>
          <span className="value">{room.backlog?.length || 0}</span>
        </div>

        <div className="admin-info-item">
          <span className="label">Current task:</span>
          <span className="value">
            {room.current_task_index >= (room.backlog?.length || 0) 
              ? "Completed" 
              : `#${room.current_task_index + 1}`
            }
          </span>
        </div>

        <div className="admin-info-item">
          <span className="label">Game status:</span>
          <span className={`value status ${room.started ? 'started' : 'waiting'}`}>
            {room.started ? "✅ Started" : "⏳ Waiting"}
          </span>
        </div>
      </div>
    </div>
  );
}