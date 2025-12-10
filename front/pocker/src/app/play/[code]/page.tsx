"use client";
import "./play.css";
import { use } from "react";
import { CARDS } from "./play.constants";
import { usePlayLogic } from "./usePlayLogic";

export default function PlayPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);

  const {
    story, votes, players, messages, username, selectedCard, isAdmin,
    allVoted, chatInput, hasVoted, isConnected, pauseCoffee,
    setChatInput, setSelectedCard,
    sendMessage, sendVote, sendReveal,
    messagesEndRef,    resumeSession   // ✅ 👈 AJOUT ICI
  } = usePlayLogic(code);

  if (!story) return <p>Chargement de la tâche…</p>;

  return (
    <div className="play-layout">

      {/* LEFT PANEL */}
      <div className="left-panel">

        {/* Header */}
        <div className="task-header">
          <h2>{story.current?.title}</h2>
          <p className="task-description">{story.current?.description}</p>
          <p className="task-progress">Tâche {story.index} sur {story.total}</p>
        </div>

        {/* Vote Status */}
        <div className={`vote-status ${allVoted ? "all-voted" : "waiting"}`}>
          {allVoted ? "✅ Tous les joueurs ont voté !" : `⏳ Votes : ${Object.keys(votes).length}/${players.length}`}
        </div>

        {/* Players */}
        <div className="presence-row">
          {players.map((p, i) => (
            <div key={i} className={`chip ${votes[p.username] ? "voted" : ""}`}>
              {p.username} {votes[p.username] ? "✅" : "⌛"} {p.role === "admin" && "👑"}
            </div>
          ))}
        </div>

        {/* Card Grid */}
        <div className="cards-grid">
          {CARDS.map((c) => (
            <div
              key={c}
              className={`card3d ${selectedCard === c ? "selected" : ""} ${hasVoted ? "locked" : ""}`}
              onClick={() => !hasVoted && setSelectedCard(c)}
            >
              <div className="card3d-inner">
                <div className="card3d-front">{c === "coffee" ? "☕" : c}</div>
                <div className="card3d-back">✓</div>
              </div>
            </div>
          ))}
        </div>

        {/* Vote Button */}
        <button 
          className="submit-btn" 
          onClick={sendVote}
          disabled={pauseCoffee || hasVoted || !selectedCard}
        >
          {hasVoted ? "Vote envoyé ✅" : "Voter 🎯"}
        </button>

        {/* Reveal Button */}
        {isAdmin && (
          <button
            className="reveal-btn"
            disabled={(!allVoted && !hasVoted) || pauseCoffee}
            onClick={sendReveal}
          >
            👀 Révéler les votes
          </button>
        )}



        {/* Pause Coffee Info */}
        {pauseCoffee && (
          <p style={{ color: "orange", marginTop: "10px", fontWeight: "bold" }}>☕ Pause café activée</p>
        )}
      {isAdmin && pauseCoffee && (
        <button className="resume-btn" onClick={resumeSession}>
          ▶️ Reprendre la session
        </button>
      )}

      </div>

      {/* RIGHT PANEL (Chat) */}
      <div className="right-panel">
        <div className="chat-container">
          <div className="chat-header">💬 Discussion {isConnected ? "🟢" : "🔴"}</div>

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
              placeholder="Écrire..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <button onClick={sendMessage} disabled={!chatInput.trim()}>
              Envoyer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
