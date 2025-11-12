"use client";
import Image from "next/image";
import Link from "next/link";
import "./login-green.css";

export default function WelcomePage() {
  return (
    <main className="agc-root">
      {/* Background full-screen */}
      <div className="agc-bg">
        <Image
          src="/img1.jpg"
          alt="Green leaves background"
          fill
          priority
          className="agc-bg-img"
        />
        <div className="agc-bg-overlay" />
      </div>

      {/* Glass hero card */}
      <section className="agc-card">
        {/* Top navigation inside the card */}
        <nav className="agc-nav">
          <div className="agc-brand">AgileCards</div>
     
        </nav>

        {/* Content */}
        <div className="agc-content">
          <div className="agc-text">
            <h1>
              Make sprint<br />
              <span className="agc-highlight">Planning</span><br />
              Collaborative
            </h1>
            <p>
            Estimez vos user stories en équipe de manière simple et efficace.
            Votez en temps réel, discutez, convergeez — tout en gardant votre focus
            sur la valeur du produit.
            </p>
            <div className="agc-cta-duo">
            <Link href="/login" className="agc-btn">
                Login
            </Link>

            <Link href="/signup" className="agc-btn agc-btn-outline">
                Sign Up
            </Link>
            </div>
          </div>

          {/* Decorative leaf inside the card (right side) */}
          <div className="agc-visual">
                <Image
                src="/img6.png"
                alt="Leaf branch"
                width={550}
                height={550}
                className="agc-leaf"
                style={{ width: 400, height: 400 }}
                priority
                />
          </div>
        </div>
      </section>
    </main>
  );
}
