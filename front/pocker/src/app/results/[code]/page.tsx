"use client";

import { useEffect, useState, use } from "react";
import { API_URL } from "../../../../lib/api";
import "./results.css";

export default function ResultsPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);

  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    setToken(localStorage.getItem("token"));
  }, []);

  const fetchResults = async () => {
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/api/rooms/${code}/export/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error("Error fetching results:", e);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (token) {
      fetchResults();
    }
  }, [token]);

  if (loading) return <div className="results-root">Loading results...</div>;

  return (
    <main className="results-root">
      <div className="results-card">
        <h1>📊 Final Estimates</h1>
        <p className="room-info">
          Room <b>{data.room}</b> — Mode: <b>{data.mode}</b>
        </p>

        <ul className="results-list">
          {data.results.map((item: any, index: number) => (
            <li key={item.external_id} className="result-item">
              <div className="item-index">{index + 1}.</div>
              <div className="item-details">
                <div className="item-title">{item.title}</div>
                <div className="item-desc">{item.description}</div>

                {item.estimate ? (
                  <div className="item-estimate">
                    Estimated: <b>{item.estimate}</b>
                  </div>
                ) : (
                  <div className="item-estimate pending">Not estimated</div>
                )}
              </div>
            </li>
          ))}
        </ul>

        <button
          className="btn-export"
          onClick={() => {
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `room_${code}_results.json`;
            a.click();
          }}
        >
          📥 Export JSON
        </button>
      </div>
    </main>
  );
}
