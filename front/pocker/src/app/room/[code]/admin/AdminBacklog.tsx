"use client";

import { useState, useEffect } from "react";
import { API_URL } from "../../../../../lib/api";

interface BacklogItem {
  external_id: string; 
  title: string;
  description?: string;
  order?: number;
}

interface Room {
  backlog: BacklogItem[];
}

interface Props {
  room: Room | null;
  code: string;
  token: string;
  addLog: (msg: string) => void;
  onRoomUpdate: () => void;
}

export default function AdminBacklog({ room, code, token, addLog, onRoomUpdate }: Props) {
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [localBacklog, setLocalBacklog] = useState<BacklogItem[]>([]);

  // Synchroniser avec les props
  useEffect(() => {
    if (room?.backlog) {
      setLocalBacklog(room.backlog);
    }
  }, [room?.backlog]);

  if (!room) return null;

  // Mettre à jour le backlog
  const updateBacklog = async (updatedBacklog: BacklogItem[]) => {
    try {
      const res = await fetch(`${API_URL}/api/rooms/${code}/backlog/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updatedBacklog.map(item => ({
          id: item.external_id, 
          title: item.title,
          description: item.description,
          order: item.order
        }))),
      });

      if (!res.ok) {
        const error = await res.json();
        alert(`❌ Failed: ${error.error || "Unknown error"}`);
        return false;
      }

      setLocalBacklog(updatedBacklog);
      onRoomUpdate(); // Notifier le parent de rafraîchir
      return true;
    } catch (error) {
      console.error("Error updating backlog:", error);
      alert("❌ Network error");
      return false;
    }
  };

  //  Ajouter feature
  const addFeature = async () => {
    if (!newTitle.trim()) return alert("Title required");

    const newItem: BacklogItem = {
      external_id: crypto.randomUUID(),
      title: newTitle.trim(),
      description: newDesc.trim(),
      order: localBacklog.length + 1
    };

    const updated = [...localBacklog, newItem];
    const success = await updateBacklog(updated);

    if (success) {
      addLog(`➕ Added feature: ${newTitle}`);
      setNewTitle("");
      setNewDesc("");
      setIsAdding(false);
    }
  };

  //  Modifier feature
  const saveEdit = async (index: number) => {
    if (!editTitle.trim()) return alert("Title required");

    const updated = [...localBacklog];
    updated[index] = {
      ...updated[index],
      title: editTitle.trim(),
      description: editDesc.trim(),
    };

    const success = await updateBacklog(updated);
    if (success) {
      addLog(`✏️ Updated feature #${index + 1}`);
      setEditingIndex(null);
    }
  };

  //  Supprimer feature
  const removeFeature = async (index: number) => {
    if (!confirm("Delete this item?")) return;

    const updated = localBacklog.filter((_, i) => i !== index);
    const success = await updateBacklog(updated);
    
    if (success) {
      addLog(`🗑️ Removed feature #${index + 1}`);
    }
  };

  // Commencer l'édition
  const startEdit = (index: number) => {
    setEditingIndex(index);
    setEditTitle(localBacklog[index].title);
    setEditDesc(localBacklog[index].description || "");
  };

  return (
    <div className="admin-section">
      <h3>📋 Backlog ({localBacklog.length} items)</h3>

      <div className="backlog-admin-list">
        {localBacklog.map((item, i) => (
          <div key={item.external_id} className="backlog-admin-item"> {}
            {editingIndex === i ? (
              <div className="edit-form">
                <input
                  className="admin-input"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Feature title"
                />
                <textarea
                  className="admin-textarea"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  placeholder="Description (optional)"
                  rows={3}
                />
                <div className="edit-actions">
                  <button className="admin-btn primary" onClick={() => saveEdit(i)}>
                    Save
                  </button>
                  <button className="admin-btn" onClick={() => setEditingIndex(null)}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="item-content">
                <div className="item-text">
                  <div className="feature-title">
                    {i + 1}. {item.title}
                  </div>
                  {item.description && (
                    <div className="feature-desc small">{item.description}</div>
                  )}
                </div>

                <div className="admin-actions">
                  <button
                    className="admin-btn edit"
                    onClick={() => startEdit(i)}
                  >
                    Edit ✏️
                  </button>
                  <button
                    className="admin-btn danger"
                    onClick={() => removeFeature(i)}
                  >
                    Delete ❌
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/*  ADD NEW FEATURE */}
      {!isAdding ? (
        <button className="admin-btn primary" onClick={() => setIsAdding(true)}>
          ➕ Add feature
        </button>
      ) : (
        <div className="add-block">
          <input
            className="admin-input"
            placeholder="Feature title *"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
          <textarea
            className="admin-textarea"
            placeholder="Description (optional)"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            rows={3}
          />

          <div className="add-actions">
            <button 
              className="admin-btn primary" 
              onClick={addFeature}
              disabled={!newTitle.trim()}
            >
              Add
            </button>
            <button 
              className="admin-btn" 
              onClick={() => {
                setIsAdding(false);
                setNewTitle("");
                setNewDesc("");
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}