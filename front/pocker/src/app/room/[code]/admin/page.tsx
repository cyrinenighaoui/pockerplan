"use client";
import { use, useState, useEffect } from "react";
import AdminDashboard from "./AdminDashboard";
import "./admin.css";

export default function AdminPage({ params }: { params: Promise<{ code: string }> }) {
  const resolvedParams = use(params);
  const { code } = resolvedParams;
  
  const [token, setToken] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    setToken(localStorage.getItem("token"));
  }, []);

  // Fonction addLog fonctionnelle
  const handleAddLog = (msg: string): void => {
    console.log("📝 Admin Log:", msg);
  };

  if (!isClient) {
    return <div style={{ padding: "20px" }}>Loading...</div>;
  }

  return (
    <div style={{ padding: "20px" }}>
      <AdminDashboard 
        code={code}
        token={token || ""}
        addLog={handleAddLog}
      />
    </div>
  );
}