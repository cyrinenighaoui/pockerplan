"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import "./mode.css";
import { API_URL } from "../../../lib/api.js";

/**
 * Composant principal pour la sélection du mode de jeu et gestion des rooms
 * Permet à l'utilisateur de créer ou rejoindre une room de Planning Poker
 */
export default function ModePage() {
  // États pour gérer les données utilisateur et interactions
  const [username, setUsername] = useState(""); // Nom d'utilisateur connecté
  const [selectedRule, setSelectedRule] = useState<string | null>(null); // Règle de jeu sélectionnée
  const [roomCode, setRoomCode] = useState(""); // Code de room saisi pour rejoindre

  // Effet pour récupérer le nom d'utilisateur au chargement du composant
  useEffect(() => {
    const u = localStorage.getItem("username");
    if (u) setUsername(u); // Met à jour l'état si un username est trouvé
  }, []); // Tableau de dépendances vide = exécution une seule fois au mount

  // Récupération du token d'authentification avec vérification SSR
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  /**
   * Handler pour la création d'une nouvelle room
   * @async
   */
  const handleCreateRoom = async () => {
    // Validation des données requises
    if (!selectedRule) return alert("Please select a game mode!");
    if (!token) return alert("You need to login");

    // Appel API pour créer une room
    const res = await fetch(`${API_URL}/api/rooms/create/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`, // Inclusion du token d'authentification
      },
      body: JSON.stringify({ mode: selectedRule }), // Mode de jeu sélectionné
    });
    
    const data = await res.json();
    
    // Redirection si la création réussit
    if (res.ok) {
      // data = { code, mode }
      window.location.href = `/room/${data.code}`; // Redirection vers la room créée
    } else {
      // Affichage de l'erreur en cas d'échec
      alert("Error creating room: " + JSON.stringify(data));
    }
  };

  /**
   * Handler pour rejoindre une room existante
   * @async
   */
  const handleJoinRoom = async () => {
    // Validation des données requises
    if (!roomCode) return alert("Please enter a room code!");
    if (!token) return alert("You need to login");

    // Appel API pour rejoindre une room
    const res = await fetch(`${API_URL}/api/rooms/join/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`, // Inclusion du token d'authentification
      },
      body: JSON.stringify({ code: roomCode }), // Code de room saisi
    });
    
    const data = await res.json();
    
    // Redirection si la jonction réussit
    if (res.ok) {
      window.location.href = `/room/${data.code}`; // Redirection vers la room rejointe
    } else {
      // Affichage de l'erreur en cas d'échec
      alert("Error joining room: " + JSON.stringify(data));
    }
  };

  // Définition des modes de jeu disponibles
  const gameModes = [
    { label: "Strict", value: "strict" },
    { label: "Average", value: "average" },
    { label: "Median", value: "median" },
    { label: "Majority", value: "majority" },
  ];

  // Rendu du composant
  return (
    <main className="mode-root">
      {/* Image de fond */}
      <Image src="/img1.jpg" alt="background" fill className="mode-bg" />
      
      {/* Carte principale contenant l'interface */}
      <div className="mode-card">
        {/* Titre de bienvenue avec le nom d'utilisateur */}
        <h2 className="mode-title">Welcome, {username} 👋</h2>
        <p className="mode-sub">Select a Planning Poker mode</p>

        {/* Grille des modes de jeu sélectionnables */}
        <div className="mode-options">
          {gameModes.map((mode) => (
            <div
              key={mode.value} // Clé unique pour React
              className={`mode-card-option ${selectedRule === mode.value ? "active" : ""}`}
              onClick={() => setSelectedRule(mode.value)} // Sélection du mode au clic
            >
              {mode.label}
            </div>
          ))}
        </div>

        {/* Champ de saisie pour rejoindre une room */}
        <input
          className="mode-input"
          type="text"
          placeholder="Enter a room code"
          onChange={(e) => setRoomCode(e.target.value.toUpperCase())} // Conversion en majuscules
        />

        {/* Boutons d'action */}
        <button className="mode-btn" onClick={handleJoinRoom}>
          Join Room
        </button>
        <button className="mode-btn-primary" onClick={handleCreateRoom}>
          Create Room
        </button>
      </div>
    </main>
  );
}