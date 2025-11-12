"use client";
import { useState, useEffect, use, useRef } from "react";
import { API_URL } from "../../../../lib/api.js";
import "./play.css";

const CARDS = ["1","2","3","5","8","13","20","40","100","coffee"];

interface PlayPageProps {
  params: Promise<{ code: string }>;
}

export default function PlayPage({ params }: PlayPageProps) {
  const { code } = use(params);

  const [story, setStory] = useState<any>(null);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [allVoted, setAllVoted] = useState(false);
  const [votes, setVotes] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const ws = useRef<WebSocket | null>(null);

  // ✅ Load token and username once
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedUsername = localStorage.getItem("username");
    setToken(storedToken);
    setUsername(storedUsername);
    setLoading(false);
  }, []);

  // ✅ WebSocket connection (single hook)
  useEffect(() => {
    if (!code || !username) return;

    const connectWebSocket = () => {
      ws.current = new WebSocket(`ws://localhost:8000/ws/rooms/${code}/?username=${username}`);

      ws.current.onopen = () => {
        console.log("✅ WebSocket connected as", username);
        setIsConnected(true);
      };

      ws.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log("WebSocket message:", data);

        if (data.event === "reveal_result") {
          setVotes(data.votes);
        }
        if (data.type === "presence") {
          loadRoomData();
        }
        if (data.type === "voted") {
          loadVotes();
        }
        if (data.type === "snapshot") {
          loadStory();
        }
        if (data.type === "error") {
          console.error("Server error:", data.message);
        }
      };

      ws.current.onclose = () => {
        console.log("❌ WebSocket disconnected");
        setIsConnected(false);
        setTimeout(connectWebSocket, 3000); // auto-reconnect
      };

      ws.current.onerror = (error) => {
        console.error("WebSocket error:", error);
        setIsConnected(false);
      };
    };

    connectWebSocket();

    return () => {
      ws.current?.close();
      setIsConnected(false);
    };
  }, [code, username]); // ✅ fixed-size dependency array

  // ✅ Fetch functions
  const loadStory = async () => {
    if (!token) return;
    const res = await fetch(`${API_URL}/api/rooms/${code}/current/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setStory(await res.json());
  };

  const loadRoomData = async () => {
    if (!token || !username) return;
    const res = await fetch(`${API_URL}/api/rooms/${code}/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const data = await res.json();
    setPlayers(data.players);
    const player = data.players.find((p: any) => p.username === username);
    setIsAdmin(player?.role === "admin");
  };

  const loadVotes = async () => {
    if (!token) return;
    const res = await fetch(`${API_URL}/api/rooms/${code}/votes/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setVotes(data);
      setAllVoted(true);
    } else setAllVoted(false);
  };

  const sendVote = async () => {
    if (!selectedCard || !token) return alert("Pick a card!");
    const res = await fetch(`${API_URL}/api/rooms/${code}/vote/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ value: selectedCard }),
    });
    if (res.ok) alert("✅ Vote sent 🎯");
  };

  // ✅ Periodic data refresh
  useEffect(() => {
    if (!token || !username || !code || loading) return;
    loadStory();
    loadRoomData();
    const voteInterval = setInterval(loadVotes, 2000);
    const storyInterval = setInterval(loadStory, 3000);
    return () => {
      clearInterval(voteInterval);
      clearInterval(storyInterval);
    };
  }, [token, code, username, loading]); // ✅ fixed-size dependency list

  // ✅ UI rendering
  if (loading) return <p>Loading...</p>;
  if (!token) return <p>You need to login.</p>;
  if (!story) return <p>Loading task…</p>;
  if (story.done) return <p>✅ All tasks completed!</p>;

  return (
    <main className="play-root">
      <h2>{story.title}</h2>
      <p>{story.description}</p>

      <div className="presence-row">
        {players.map((p, i) => {
          const hasVoted = votes && votes[p.username] !== undefined;
          return (
            <div key={i} className="chip">
              {p.username} {hasVoted ? "✅" : "⌛"}
            </div>
          );
        })}
      </div>

      <div className="cards-grid">
        {CARDS.map((c) => {
          const isSelected = selectedCard === c;
          const hasVoted = votes && votes[username || ""] !== undefined;
          return (
            <div
              key={c}
              className={`card3d ${isSelected ? "selected" : ""} ${hasVoted ? "hide" : ""}`}
              onClick={() => !hasVoted && setSelectedCard(c)}
            >
              <div className="card3d-inner">
                <div className="card3d-front">{c === "coffee" ? "☕" : c}</div>
                <div className="card3d-back">
                  {votes ? votes[username || ""] : ""}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <button className="submit-btn" onClick={sendVote}>
        Send Vote ✅
      </button>

      {isAdmin && allVoted && (
        <button
          className="submit-btn"
          onClick={() => ws.current?.send(JSON.stringify({ type: "reveal" }))}
        >
          Reveal Votes
        </button>
      )}
    </main>
  );
}
