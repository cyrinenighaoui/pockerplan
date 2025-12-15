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
  const [isAdmin, setIsAdmin] = useState(false);

  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [requiredVotes, setRequiredVotes] = useState(0);
  const [pauseCoffee, setPauseCoffee] = useState(false);
  const [votesCount, setVotesCount] = useState(0);
  const [totalPlayers, setTotalPlayers] = useState(0);

  //  Scroll auto du chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  //  Charger token + username depuis localStorage
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

  // ---------- FONCTIONS DE CHARGEMENT ----------
  const loadRoomData = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/rooms/${code}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();

      setPlayers(data.players || []);
      setTotalPlayers(data.players?.length || 0);
      setRequiredVotes(data.players?.length || 0);

      setIsAdmin(
        data.players?.some(
          (p: any) => p.username === username && p.role === "admin"
        )
      );
    } catch (error) {
      console.error("Error loading room data:", error);
    }
  };

  const loadVotes = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/rooms/${code}/votes/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;

      const data = await res.json();
      setVotes(data);
      setVotesCount(Object.keys(data).length);
    } catch (error) {
      console.error("Error loading votes:", error);
    }
  };

  // Calcul pour savoir si tous ont voté
  const allVoted = votesCount >= totalPlayers;

  const resumeSession = () => {
    if (!ws.current) return;

    if (ws.current.readyState !== WebSocket.OPEN) {
      console.warn("WS not ready – resume ignored");
      return;
    }

    ws.current.send(JSON.stringify({ type: "resume" }));
  };

  // ---------- CONNEXION WEBSOCKET ----------
  useEffect(() => {
    if (!code || !username || loading) return;

    let reconnectTimeout: NodeJS.Timeout;

    const connect = () => {
      ws.current = new WebSocket(`ws://localhost:8000/ws/rooms/${code}/?username=${username}`);

      ws.current.onopen = () => {
        setIsConnected(true);
        console.log("✅ WebSocket connected");
      };

      ws.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log("📩 WS Message received:", data.type); // Debug

        // ---- PAUSE EVENT ----
        if (data.type === "pause_event") {
          setPauseCoffee(true);
          setSelectedCard(null);
          alert(`☕ Pause demandée par ${data.paused_by}`);
          return;
        }
  // Dans ws.current.onmessage, ajoutez :
  if (data.type === "votes_updated") {
      console.log("🗳️ Votes updated:", data.votes);
      setVotes(data.votes);
      setVotesCount(Object.keys(data.votes).length);
      setRequiredVotes(data.counts.total);
      return;
  }
        // ---- ERROR ----
        if (data.type === "error") {
          console.log("⛔ WS ERROR:", data);
          alert(data.message || "Erreur WS");
          return;
        }

        // ---- RESUME EVENT ----
        if (data.type === "resume_event") {
          setPauseCoffee(false);
          setHasVoted(false);
          setSelectedCard(null);
          setVotes({});
          setVotesCount(0);
          return;
        }
        // Dans ws.current.onmessage
        if (data.type === "reveal") {
            console.log("🃏 Reveal event received:", data);
            
            if (data.status === "skipped") {
                alert("⏱️ Temps écoulé — tâche ignorée");
                window.location.reload();
            } 
            else if (data.status === "validated") {
                alert(`🃏 Résultat final : ${data.result}`);
                setTimeout(() => window.location.reload(), 700);
                setSelectedCard(null);
                setVotes({});
                setVotesCount(0);
                setHasVoted(false);
            } 
            else if (data.status === "revote") {
                // ✅ GÉRER LE REVOTE EN MODE STRICT
                alert("❌ Pas d'accord en mode strict ! On revote...");
                
                // Réinitialiser l'état de vote
                setSelectedCard(null);
                setVotes({});
                setVotesCount(0);
                setHasVoted(false);
                
                // Option 1: Recharger la page
                // setTimeout(() => window.location.reload(), 1000);
                
                // Option 2: Resetter sans recharger (meilleure UX)
                // Juste resetter l'état, les votes sont déjà supprimés côté serveur
            } 
            else if (data.status === "coffee") {
                alert("☕ Pause café !");
                setHasVoted(false);
            } 
            else if (data.status === "wait") {
                alert("⌛ En attente des votes restants…");
            }
            
            return;
        }

        // ---- REVEAL EVENT ----
        // ---- VOTED EVENT (TRÈS IMPORTANT) ----
        if (data.type === "voted") {
          console.log("🗳️ Voted event:", data);
          setRequiredVotes(data.total);
          // Recharger les votes immédiatement quand quelqu'un vote
          loadVotes();
          return;
        }

        // ---- PRESENCE EVENT ----
        if (data.type === "presence") {
          loadRoomData();
          return;
        }

        // ---- SNAPSHOT EVENT ----
        if (data.type === "snapshot") {
          setStory(data);
          if (data.is_paused) {
            setPauseCoffee(true);
          }
          return;
        }

        // ---- CHAT EVENT ----
        if (data.type === "chat") {
          setMessages(prev => [...prev, { user: data.username, msg: data.message }]);
          return;
        }
      };

      ws.current.onclose = () => {
        setIsConnected(false);
        console.log("🔌 WebSocket disconnected - reconnecting...");
        reconnectTimeout = setTimeout(connect, 2000);
      };

      ws.current.onerror = (error) => {
        console.error("WebSocket error:", error);
      };
    };

    connect();
    
    return () => {
      clearTimeout(reconnectTimeout);
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [code, username, loading, token]);

  // ---------- INITIAL LOAD ----------
  useEffect(() => {
    if (!token || !username || !code || loading) return;

    console.log("🔄 Initial load...");
    loadRoomData();
    loadVotes();
  }, [token, username, code, loading]);

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
    
    if (selectedCard === "coffee") {
      ws.current?.send(JSON.stringify({ type: "coffee" }));
      setPauseCoffee(true);
      alert("☕ Pause demandée !");
      return;
    }

    try {
      // Enregistrer le vote via API REST
      await fetch(`${API_URL}/api/rooms/${code}/vote/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ value: selectedCard }),
      });

      // Envoyer le vote via WebSocket
      ws.current?.send(JSON.stringify({ type: "vote", value: selectedCard }));

      setHasVoted(true);
      
      // Recharger les votes immédiatement
      setTimeout(() => loadVotes(), 100);
      
      console.log("✅ Vote sent:", selectedCard);
    } catch (error) {
      console.error("Error sending vote:", error);
      alert("Erreur lors de l'envoi du vote");
    }
  };

  const sendReveal = () => {
    console.log("👀 CLICK REVEAL", {
      wsExists: !!ws.current,
      readyState: ws.current?.readyState,
      username,
      isAdmin,
      pauseCoffee,
      votesCount,
      totalPlayers,
      allVoted,
    });

    if (!ws.current) return alert("WebSocket non connecté");
    if (ws.current.readyState !== WebSocket.OPEN) return alert("WebSocket non ouvert");
    if (!allVoted) return alert(`Attendez que tout le monde vote ! (${votesCount}/${totalPlayers})`);

    ws.current.send(JSON.stringify({ type: "reveal" }));
    console.log("📤 Reveal sent");
  };

  return {
    story,
    votes,
    players,
    messages,
    username,
    selectedCard,
    isAdmin,
    chatInput,
    hasVoted,
    isConnected,
    pauseCoffee,
    votesCount,
    totalPlayers,
    allVoted,
    setChatInput,
    setSelectedCard,
    sendMessage,
    sendVote,
    sendReveal,
    resumeSession,
    messagesEndRef,
  };
}