"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import "./login.css";
import { API_URL } from "../../../lib/api.js";
import "../welcome/login-green.css";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  const handleSubmit = async (e: any) => {
    e.preventDefault();

    const res = await fetch(`${API_URL}/auth/login/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();

    if (res.ok) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("username", data.user.username);
      setMsg("✅ Logged in! Redirecting...");
      setTimeout(() => (window.location.href = "/mode"), 1000);
    } else {
      setMsg("❌ Invalid credentials");
    }
  };

  return (
    <main className="login-root">
      <Image src="/img1.jpg" alt="background" fill className="login-bg" />
      <section className="login-card">
        <h2 className="title">Welcome Back</h2>
        <form className="form" onSubmit={handleSubmit}>
          <input type="text" placeholder="Username" onChange={(e) => setUsername(e.target.value)} />
          <input type="password" placeholder="Password" onChange={(e) => setPassword(e.target.value)} />
          <button className="btn-primary">Login</button>
        </form>
        <p className="switch">New here? <Link href="/signup">Create an account</Link></p>
        {msg && <p style={{ marginTop: "10px" }}>{msg}</p>}
      </section>
    </main>
  );
}
