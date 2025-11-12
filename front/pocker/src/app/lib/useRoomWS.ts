"use client";
import { useEffect, useRef, useState } from "react";

export function useRoomWS(code: string, username: string) {
  const [snapshot, setSnapshot] = useState<any>(null);  // {done,current,total,index}
  const [presence, setPresence] = useState<Set<string>>(new Set());
  const [voted, setVoted] = useState<{voters:number,total:number}>({voters:0,total:0});
  const [revealInfo, setRevealInfo] = useState<any>(null); // {status, result, done, next}
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const proto = location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${proto}://${location.host.replace(/:\d+$/, '')}:8000/ws/rooms/${code}/?username=${encodeURIComponent(username)}`);
    wsRef.current = ws;

    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.type === "snapshot") setSnapshot(msg);
      if (msg.type === "presence") {
        setPresence(s => {
          const copy = new Set(s);
          msg.online ? copy.add(msg.username) : copy.delete(msg.username);
          return copy;
        });
      }
      if (msg.type === "voted") setVoted({voters: msg.voters, total: msg.total});
      if (msg.type === "reveal") setRevealInfo(msg);
    };

    ws.onclose = () => { /* optional: auto-reconnect */ };
    return () => { ws.close(); };
  }, [code, username]);

  const send = (payload: any) => wsRef.current?.send(JSON.stringify(payload));
  const vote = (value: string) => send({type: "vote", value});
  const reveal = () => send({type: "reveal"});
  const start = () => send({type: "start"});

  return { snapshot, presence, voted, revealInfo, vote, reveal, start };
}
