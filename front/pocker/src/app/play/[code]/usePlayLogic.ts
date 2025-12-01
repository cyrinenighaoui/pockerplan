"use client";

import { useState, useEffect, useRef } from "react";
import { API_URL } from "../../../../lib/api.js";

export function usePlayLogic(code: string) {
  const ws = useRef<WebSocket | null>(null);

  const [story, setStory] = useState<any>(null);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [votes, setVotes] = useState<any>({});
  const [players, setPlayers] = useState<any[]>([]);
  const [messages, setMessages] = useState<{ user: string; msg: string }[]>([]);
  const [chatInput, setChatInput] = useState("");

  const [hasVoted, setHasVoted] = useState(false);
  const [allVoted, setAllVoted] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // 🔁 Scroll auto du chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 🔐 Charger token + username depuis localStorage
  useEffect(() => {
    setToken(localStorage.getItem("token"));
    setUsername(localStorage.getItem("username"));
    setLoading(false);
  }, []);

  // 🎯 Redirection vers /results si plus de tâches
  useEffect(() => {
    if (story?.done) {
      window.location.href = `/results/${code}`;
    }
  }, [story, code]);

  // 🌐 Connexion WebSocket
    useEffect(() => {
    if (!code || !username || loading) return;

    let reconnectTimeout: NodeJS.Timeout;

    const connect = () => {
        ws.current = new WebSocket(`ws://localhost:8000/ws/rooms/${code}/?username=${username}`);

        ws.current.onopen = () => {
        setIsConnected(true);
        };

        ws.current.onmessage = (event) => {
        const data = JSON.parse(event.data);

        // ---- 🎯 REVEAL LOGIC RESTORED ----
        if (data.type === "reveal_event") {
            console.log("🃏 Reveal event received:", data);

            if (data.status === "validated") {
            alert(`🃏 Résultat final : ${data.result}`);

            // Reload => show next task
            setTimeout(() => window.location.reload(), 700);

            setSelectedCard(null);
            setVotes({});
            setAllVoted(false);
            setHasVoted(false);
            } 
            else if (data.status === "revote") {
            alert("❌ Aucun accord — on revote !");
            setVotes({});
            setAllVoted(false);
            setSelectedCard(null);
            setHasVoted(false);
            } 
            else if (data.status === "coffee") {
            alert("☕ Pause café !");
            setHasVoted(false);
            } 
            else if (data.status === "wait") {
            alert("⌛ En attente des votes restants…");
            }

            return; // 🔥 prevents other handlers from interfering
        }

        // ---- 📌 AUTRES TYPES D'ÉVÉNEMENTS ----
        if (data.type === "presence_event") loadRoomData();
        if (data.type === "voted_event") loadVotes();
        if (data.type === "snapshot") setStory(data);
        if (data.type === "chat") {
            setMessages(prev => [...prev, { user: data.username, msg: data.message }]);
        }
        };

        ws.current.onclose = () => {
        setIsConnected(false);
        reconnectTimeout = setTimeout(connect, 2000);
        };
    };

    connect();
    return () => clearTimeout(reconnectTimeout);

    }, [code, username, loading]);

  // ---------- API CALLS ----------

  const loadStory = async () => {
    if (!token) return;
    const res = await fetch(`${API_URL}/api/rooms/${code}/current/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const data = await res.json();
    setStory(data);
  };

  const loadRoomData = async () => {
    if (!token) return;
    const res = await fetch(`${API_URL}/api/rooms/${code}/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const data = await res.json();

    setPlayers(data.players || []);
    setIsAdmin(
      data.players?.some((p: any) => p.username === username && p.role === "admin")
    );
  };

  const loadVotes = async () => {
    if (!token) return;
    const res = await fetch(`${API_URL}/api/rooms/${code}/votes/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const data = await res.json();

    setVotes(data);

    // Met à jour hasVoted & allVoted
    if (username) {
      setHasVoted(!!data[username]);
    }
    if (players.length > 0) {
      setAllVoted(Object.keys(data).length === players.length);
    }
  };

  // ---------- ACTIONS ----------

  const sendMessage = () => {
    if (!ws.current || !chatInput.trim()) return;
    ws.current.send(
      JSON.stringify({ type: "chat", username, message: chatInput })
    );
    setChatInput("");
  };

  const sendVote = async () => {
    if (!selectedCard || !token) return;

    await fetch(`${API_URL}/api/rooms/${code}/vote/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ value: selectedCard }),
    });

    ws.current?.send(JSON.stringify({ type: "vote" }));
    setHasVoted(true);
  };

  const sendReveal = () => {
    if (!ws.current) return;
    ws.current.send(JSON.stringify({ type: "reveal" }));
    // 💡 On ne reload PAS ici, on attend le "reveal_event" du serveur
  };

  // ---------- INITIAL LOAD ----------

  useEffect(() => {
    if (!token || !username || !code || loading) return;

    loadStory();
    loadRoomData();
    loadVotes();
  }, [token, username, code, loading]);

  return {
    story,
    votes,
    players,
    messages,
    username,
    selectedCard,
    isAdmin,
    allVoted,
    chatInput,
    hasVoted,
    isConnected,
    setChatInput,
    setSelectedCard,
    sendMessage,
    sendVote,
    sendReveal,
    messagesEndRef,
  };
}
