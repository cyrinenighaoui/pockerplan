"use client";
import { useState, useEffect, use, useRef } from "react";
import { API_URL } from "../../../../lib/api.js";
import "./play.css";

const CARDS = ["1", "2", "3", "5", "8", "13", "20", "40", "100", "coffee"];

interface PlayPageProps {
  params: Promise<{ code: string }>;
}

export default function PlayPage({ params }: PlayPageProps) {
  const { code } = use(params);

  const [story, setStory] = useState<any>(null);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [allVoted, setAllVoted] = useState(false);
  const [votes, setVotes] = useState<any>({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const ws = useRef<WebSocket | null>(null);

  // --- CHAT STATE ---
  const [messages, setMessages] = useState<{ user: string, msg: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ✅ Scroll vers le bas quand de nouveaux messages arrivent
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ✅ Charger token & username - UNIQUEMENT au début
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedUsername = localStorage.getItem("username");
    setToken(storedToken);
    setUsername(storedUsername);
    setLoading(false);
  }, []);

  // ⛳ REDIRECTION AUTOMATIQUE LORSQUE TOUT EST TERMINÉ
  useEffect(() => {
    if (story?.done) {
      console.log("🎉 Toutes les tâches sont terminées — redirection vers résultats");
      window.location.href = `/results/${code}`;
    }
  }, [story, code]);

  // ✅ WebSocket connection - CORRIGÉ avec moins de dépendances
  useEffect(() => {
    if (!code || !username || loading) return;

    let reconnectTimeout: NodeJS.Timeout;
    let isMounted = true;

    const connectWebSocket = () => {
      if (ws.current?.readyState === WebSocket.OPEN || !isMounted) {
        return;
      }

      console.log("🔄 Connecting WebSocket...");
      ws.current = new WebSocket(`ws://localhost:8000/ws/rooms/${code}/?username=${username}`);

      ws.current.onopen = () => {
        if (!isMounted) return;
        console.log("✅ WebSocket connected as", username);
        setIsConnected(true);
      };

      ws.current.onmessage = (event) => {
        if (!isMounted) return;
        
        try {
          const data = JSON.parse(event.data);
          console.log("📨 WebSocket message:", data);

          if (data.type === "reveal_event") {
            console.log("🃏 Reveal event received:", data);
            handleReveal(data);
          }
          else if (data.type === "presence_event") {
            console.log("👥 Presence update:", data);
            loadRoomData();
          }
          else if (data.type === "voted_event") {
            console.log("🗳️ Vote count update:", data);
            handleVotedEvent(data);
          }
          else if (data.type === "snapshot") {
            console.log("📸 Snapshot received:", data);
            handleSnapshot(data);
          }
          else if (data.type === "error") {
            console.error("Server error:", data.message);
            alert(`Erreur: ${data.message}`);
          }
        // Dans votre useEffect WebSocket, ajoutez ce cas :
        else if (data.type === "chat") {
          console.log("💬 Chat message received:", data);
          console.log("📝 Current messages before:", messages);
          setMessages(prev => {
            const newMessages = [...prev, { user: data.username, msg: data.message }];
            console.log("📝 Current messages after:", newMessages);
            return newMessages;
          });
        }

        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      ws.current.onclose = (event) => {
        if (!isMounted) return;
        console.log("❌ WebSocket disconnected:", event.code, event.reason);
        setIsConnected(false);
        
        // Reconnexion seulement si ce n'est pas une déconnexion normale
        if (event.code !== 1000) {
          reconnectTimeout = setTimeout(connectWebSocket, 3000);
        }
      };

      ws.current.onerror = (error) => {
        if (!isMounted) return;
        console.error("WebSocket error:", error);
        setIsConnected(false);
      };
    };

    const handleReveal = async (data: any) => {
      console.log("🔄 Processing reveal:", data);
      
      if (data.status === "validated") {
        alert(`🃏 Résultat: ${data.result}`);
        
        setTimeout(async () => {
          console.log("🔄 Reloading data after reveal...");
          await loadStory();
          await loadRoomData();
          await checkMyVoteStatus();
          await loadVotes();
        }, 1000);
        
        setSelectedCard(null);
        setVotes({});
        setAllVoted(false);
        setHasVoted(false);
        
      } else if (data.status === "revote") {
        alert("❌ Pas d'accord — on revote !");
        setVotes({});
        setAllVoted(false);
        setSelectedCard(null);
        setHasVoted(false);
      } else if (data.status === "coffee") {
        alert("☕ Pause café — on garde la même tâche.");
        setHasVoted(false);
      } else if (data.status === "wait") {
        alert("⏳ On attend encore des votes…");
      }
    };

    const handleVotedEvent = (data: any) => {
      const everyoneVoted = data.voters >= data.total && data.total > 0;
      console.log(`Votes: ${data.voters}/${data.total} - All voted: ${everyoneVoted}`);
      setAllVoted(everyoneVoted);
      loadVotes();
    };

    const handleSnapshot = (data: any) => {
      console.log("📸 Handling snapshot:", data);
      setStory(data);
      setTimeout(() => checkMyVoteStatus(), 1000);
    };

    connectWebSocket();

    return () => {
      isMounted = false;
      clearTimeout(reconnectTimeout);
      if (ws.current) {
        ws.current.close(1000, "Component unmount");
      }
    };
  }, [code, username, loading]); // ✅ Moins de dépendances

  // ✅ Vérifier si j'ai déjà voté
  const checkMyVoteStatus = async () => {
    if (!token || !username) return;
    
    try {
      const res = await fetch(`${API_URL}/api/rooms/${code}/my-vote/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const voteData = await res.json();
        console.log("My vote status:", voteData);
        setHasVoted(voteData.hasVoted);
        if (voteData.value) {
          setSelectedCard(voteData.value);
        }
      }
    } catch (error) {
      console.error("Error checking vote status:", error);
    }
  };

  // ✅ Charger la tâche actuelle
  const loadStory = async () => {
    if (!token) return;
    try {
      console.log("🔄 Loading current story...");
      const res = await fetch(`${API_URL}/api/rooms/${code}/current/`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-cache'
      });
      
      if (res.ok) {
        const storyData = await res.json();
        console.log("📖 Story loaded:", storyData);
        setStory(storyData);
        
        if (storyData.current && (!story || story.current?.title !== storyData.current?.title)) {
          console.log("🆕 New task detected, resetting votes");
          setVotes({});
          setAllVoted(false);
          setHasVoted(false);
          setSelectedCard(null);
        }
      } else {
        console.error("Failed to load story:", res.status);
      }
    } catch (error) {
      console.error("Error loading story:", error);
    }
  };

  const loadRoomData = async () => {
    if (!token || !username) return;
    try {
      const res = await fetch(`${API_URL}/api/rooms/${code}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      console.log("Room data loaded:", data);
      setPlayers(data.players || []);
      const player = (data.players || []).find((p: any) => p.username === username);
      setIsAdmin(player?.role === "admin");
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
      if (res.ok) {
        const votesData = await res.json();
        console.log("Votes loaded:", votesData);
        setVotes(votesData);
      }
    } catch (error) {
      console.error("Error loading votes:", error);
    }
  };

  // ✅ Envoi du message chat - CORRIGÉ
// ✅ Envoi du message chat - CORRIGÉ
const sendMessage = () => {
  if (!chatInput.trim()) return;
  
  console.log("💬 Sending chat message:", chatInput);
  
  // Ajouter le message localement immédiatement
  const newMessage = { user: username || "Moi", msg: chatInput };
  setMessages(prev => [...prev, newMessage]);
  
  // Envoyer via WebSocket - CORRECTION: utiliser "chat" au lieu de "chat_message"
  if (ws.current?.readyState === WebSocket.OPEN) {
    ws.current.send(JSON.stringify({
      type: "chat", // ⬅️ CHANGEMENT ICI
      username: username,
      message: chatInput
    }));
  } else {
    console.error("WebSocket not connected");
  }
  
  setChatInput("");
};
  // ✅ Envoi du vote
  const sendVote = async () => {
    if (!selectedCard || !token || !username) return alert("Choisissez une carte !");
    if (hasVoted) return alert("Vous avez déjà voté !");

    try {
      const res = await fetch(`${API_URL}/api/rooms/${code}/vote/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ value: selectedCard }),
      });

      if (res.ok) {
        ws.current?.send(JSON.stringify({ type: "vote", value: selectedCard }));
        setHasVoted(true);
        
        setVotes((prev: any) => ({
          ...prev,
          [username]: selectedCard
        }));
        
        console.log("✅ Vote envoyé !");
        
        setTimeout(() => {
          loadVotes();
          loadRoomData();
        }, 500);
      } else {
        alert("❌ Échec de l'envoi du vote");
      }
    } catch (error) {
      console.error("Error sending vote:", error);
    }
  };

  // ✅ Envoyer la commande reveal
  const sendReveal = () => {
    if (!allVoted) {
      alert("Tous les joueurs n'ont pas encore voté !");
      return;
    }
    
    console.log("Sending reveal command...");
    ws.current?.send(JSON.stringify({ type: "reveal" }));
  };

  // ✅ Effet pour charger les données initiales
  useEffect(() => {
    if (!token || !username || !code || loading) return;
    
    console.log("🚀 Loading initial data...");
    const loadInitialData = async () => {
      await loadStory();
      await loadRoomData();
      await checkMyVoteStatus();
      await loadVotes();
    };
    
    loadInitialData();
    
    const interval = setInterval(() => {
      loadVotes();
    }, 2000);
    
    return () => clearInterval(interval);
  }, [token, code, username, loading]);

  // ✅ Debug: Afficher l'état important
  useEffect(() => {
    console.log("🔍 État actuel:", {
      allVoted,
      hasVoted,
      isAdmin,
      playersCount: players.length,
      votesCount: Object.keys(votes).length,
      messagesCount: messages.length,
      story: story ? {
        done: story.done,
        current: story.current?.title || 'none',
        index: story.index
      } : 'null'
    });
  }, [allVoted, hasVoted, isAdmin, players, votes, messages, story]);

  // ✅ UI rendering
  if (loading) return <p>Chargement...</p>;
  if (!token) return <p>Vous devez vous connecter.</p>;
  if (!story) return <p>Chargement de la tâche…</p>;

  const currentVoters = Object.keys(votes).length;
  const totalPlayers = players.length;

  return (
    <div className="play-layout">
      {/* LEFT SIDE */}
      <div className="left-panel">
        {/* En-tête */}
        <div className="task-header">
          <h2>{story.current?.title}</h2>
          <p className="task-description">{story.current?.description}</p>
          {story.index && (
            <p className="task-progress">
              Tâche {story.index} sur {story.total}
            </p>
          )}
        </div>

        {/* Statut de vote */}
        <div className={`vote-status ${allVoted ? 'all-voted' : 'waiting'}`}>
          {allVoted ? (
            <div className="all-voted-message">✅ Tous les joueurs ont voté !</div>
          ) : (
            <div className="waiting-message">
              ⏳ En attente des votes... ({currentVoters}/{totalPlayers})
            </div>
          )}
        </div>

        {/* Joueurs */}
        <div className="presence-row">
          {players.map((p, i) => (
            <div key={i} className={`chip ${votes[p.username] ? 'voted' : 'waiting'}`}>
              {p.username} {votes[p.username] ? "✅" : "⌛"} {p.role === "admin" && "👑"}
            </div>
          ))}
        </div>

        {/* Cartes */}
        <div className="cards-grid">
          {CARDS.map((c) => (
            <div
              key={c}
              className={`card3d ${selectedCard === c ? "selected" : ""} ${hasVoted ? "locked" : ""}`}
              onClick={() => !hasVoted && setSelectedCard(c)}
            >
              <div className="card3d-inner">
                <div className="card3d-front">{c === "coffee" ? "☕" : c}</div>
                <div className="card3d-back">{selectedCard === c && hasVoted && "✓"}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Vote button */}
        <button className="submit-btn" onClick={sendVote} disabled={!selectedCard || hasVoted}>
          {hasVoted ? "Vote Envoyé ✅" : selectedCard ? `Voter ${selectedCard} 🎯` : "Choisir une carte"}
        </button>

        {/* Reveal Button */}
        {isAdmin && (
          <button className="reveal-btn" disabled={!allVoted} onClick={sendReveal}>
            Révéler les votes 👀
          </button>
        )}
      </div>

      {/* RIGHT SIDE - CHAT */}
      <div className="right-panel">
        <div className="chat-container">
          <div className="chat-header">💬 Discussion {!isConnected && "(Déconnecté)"}</div>
          <div className="chat-messages">
            {messages.map((m, i) => (
              <div key={i} className="chat-message">
                <strong>{m.user}: </strong> {m.msg}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div className="chat-input-row">
            <input
              placeholder="Écrire un message..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              disabled={!isConnected}
            />
            <button onClick={sendMessage} disabled={!isConnected || !chatInput.trim()}>
              Envoyer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}