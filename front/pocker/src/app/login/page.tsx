"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

// Imports des styles
import "./login.css";
import "../welcome/login-green.css";

// Imports des utilitaires
import { API_URL } from "../../../lib/api.js";

// Interface pour typer les données de l'utilisateur
interface UserData {
  token: string;
  user: {
    username: string;
  };
}

/**
 * Composant de page de connexion
 * Gère l'authentification des utilisateurs avec nom d'utilisateur et mot de passe
 */
export default function LoginPage() {
  // États pour gérer les champs du formulaire et les messages
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Hook Next.js pour la navigation
  const router = useRouter();

  /**
   * Gère la soumission du formulaire de connexion
   * @param e - Événement de soumission du formulaire
   */
  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");

    // Validation basique des champs
    if (!username.trim() || !password.trim()) {
      setMessage("❌ Veuillez remplir tous les champs");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/auth/login/`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json" 
        },
        body: JSON.stringify({ username, password }),
      });

      const data: UserData & { error?: string } = await response.json();

      if (response.ok) {
        // Stockage des données d'authentification
        localStorage.setItem("token", data.token);
        localStorage.setItem("username", data.user.username);
        
        setMessage("✅ Connexion réussie ! Redirection...");
        
        // Redirection après un délai
        setTimeout(() => router.push("/mode"), 1000);
      } else {
        // Gestion des erreurs de l'API
        setMessage(data.error || " Identifiants invalides");
      }
    } catch (error) {
      // Gestion des erreurs réseau
      console.error("Erreur de connexion:", error);
      setMessage(" Erreur de connexion au serveur");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="login-root">
      {/* Image de fond */}
      <Image 
        src="/img1.jpg" 
        alt="Background de connexion" 
        fill 
        className="login-bg"
        priority
      />
      
      {/* Carte de connexion */}
      <section className="login-card">
        <h2 className="title">Bienvenue</h2>
        
        {/* Formulaire de connexion */}
        <form className="form" onSubmit={handleSubmit}>
          {/* Champ nom d'utilisateur */}
          <input 
            type="text" 
            placeholder="Nom d'utilisateur" 
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={isLoading}
            required
          />
          
          {/* Champ mot de passe */}
          <input 
            type="password" 
            placeholder="Mot de passe" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            required
          />
          
          {/* Bouton de soumission */}
          <button 
            type="submit" 
            className="btn-primary"
            disabled={isLoading}
          >
            {isLoading ? "Connexion..." : "Se connecter"}
          </button>
        </form>
        
        {/* Lien vers la page d'inscription */}
        <p className="switch">
          Nouveau ici ?{" "}
          <Link href="/signup">Créer un compte</Link>
        </p>
        
        {/* Affichage des messages */}
        {message && (
          <p className={`message ${message.includes("✅") ? "success" : "error"}`}>
            {message}
          </p>
        )}
      </section>
    </main>
  );
}