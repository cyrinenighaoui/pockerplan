"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import "./mode.css";
import { API_URL } from "../../../lib/api.js";

export default function ModePage() {
  const [username, setUsername] = useState("");
  const [selectedRule, setSelectedRule] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState("");

  useEffect(() => {
    const u = localStorage.getItem("username");
    if (u) setUsername(u);
  }, []);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const handleCreateRoom = async () => {
    if (!selectedRule) return alert("Please select a game mode!");
    if (!token) return alert("You need to login");

    const res = await fetch(`${API_URL}/api/rooms/create/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ mode: selectedRule }),
    });
    const data = await res.json();
    if (res.ok) {
      // data = { code, mode }
      window.location.href = `/room/${data.code}`;
    } else {
      alert("Error creating room: " + JSON.stringify(data));
    }
  };

  const handleJoinRoom = async () => {
    if (!roomCode) return alert("Please enter a room code!");
    if (!token) return alert("You need to login");

    const res = await fetch(`${API_URL}/api/rooms/join/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ code: roomCode }),
    });
    const data = await res.json();
    if (res.ok) {
      window.location.href = `/room/${data.code}`;
    } else {
      alert("Error joining room: " + JSON.stringify(data));
    }
  };

  const gameModes = [
    { label: "Strict", value: "strict" },
    { label: "Average", value: "average" },
    { label: "Median", value: "median" },
    { label: "Majority", value: "majority" },
  ];

  return (
    <main className="mode-root">
      <Image src="/img1.jpg" alt="background" fill className="mode-bg" />
      <div className="mode-card">
        <h2 className="mode-title">Welcome, {username} 👋</h2>
        <p className="mode-sub">Select a Planning Poker mode</p>

        <div className="mode-options">
          {gameModes.map((mode) => (
            <div
              key={mode.value}
              className={`mode-card-option ${selectedRule === mode.value ? "active" : ""}`}
              onClick={() => setSelectedRule(mode.value)}
            >
              {mode.label}
            </div>
          ))}
        </div>

        <input
          className="mode-input"
          type="text"
          placeholder="Enter a room code"
          onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
        />

        <button className="mode-btn" onClick={handleJoinRoom}>Join Room</button>
        <button className="mode-btn-primary" onClick={handleCreateRoom}>Create Room</button>
      </div>
    </main>
  );
}
