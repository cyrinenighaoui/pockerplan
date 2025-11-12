"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import "../welcome/login-green.css";
import { API_URL } from "../../../lib/api.js";
import './signup.css';
export default function SignupPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  const handleSubmit = async (e: any) => {
    e.preventDefault();

    const res = await fetch(`${API_URL}/auth/register/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password }),
    });

    const data = await res.json();

    if (res.ok) {
      setMsg("✅ Account created! Redirecting...");
      setTimeout(() => (window.location.href = "/login"), 1500);
    } else {
      setMsg("❌ " + JSON.stringify(data));
    }
  };

  return (
    <main className="signup-root">
      <Image src="/img1.jpg" alt="background" fill className="signup-bg" />
      <section className="signup-card">
        <h2 className="title">Create account</h2>
        <form className="form" onSubmit={handleSubmit}>
          <input type="text" placeholder="Username" onChange={(e) => setUsername(e.target.value)} />
          <input type="email" placeholder="Email" onChange={(e) => setEmail(e.target.value)} />
          <input type="password" placeholder="Password" onChange={(e) => setPassword(e.target.value)} />
          <button className="btn-primary">Sign Up</button>
        </form>
        <p className="switch">Already have an account? <Link href="/login">Login</Link></p>
        {msg && <p style={{ marginTop: "10px" }}>{msg}</p>}
      </section>
    </main>
  );
}
