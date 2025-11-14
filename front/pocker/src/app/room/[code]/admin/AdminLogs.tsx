"use client";

import { useEffect, useRef } from "react";

export default function AdminLogs({ logs }: { logs: string[] }) {
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll vers le bas quand de nouveaux logs arrivent
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <div className="admin-section">
      <h3>📜 Logs ({logs.length})</h3>

      <div className="logs-box">
        {logs.length === 0 ? (
          <p className="empty">No logs yet…</p>
        ) : (
          logs.map((log, i) => (
            <div key={i} className="log-item">
              <span className="log-time">
                {new Date().toLocaleTimeString()}
              </span>
              {log}
            </div>
          ))
        )}
        <div ref={logsEndRef} />
      </div>

      {logs.length > 0 && (
        <button 
          className="admin-btn"
          onClick={() => {
            if (logsEndRef.current) {
              logsEndRef.current.scrollIntoView({ behavior: "smooth" });
            }
          }}
        >
          Scroll to bottom
        </button>
      )}
    </div>
  );
}