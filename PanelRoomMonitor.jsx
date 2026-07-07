import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  YAxis,
  Tooltip,
} from "recharts";
import {
  Activity,
  Thermometer,
  Zap,
  Gauge,
  Radio,
  ShieldCheck,
  Wifi,
  WifiOff,
  Bell,
  Clock,
  Cable,
} from "lucide-react";

/*
  AirNav Panel Room Monitor
  ---------------------------------------------------------
  Design tokens (control-room / instrumentation aesthetic)
  Background : #0A0E14 (near-black)
  Surface 1  : #10161F (cards)
  Surface 2  : #161E2B (raised / active card)
  Line       : #212B3B (hairlines)
  Text hi    : #E7ECF3
  Text mid   : #8C97A8
  Text low   : #5A6576
  Accent     : #2DD4BF (teal - "live" / normal)
  Warning    : #F5B84C (amber)
  Critical   : #F0605C (red)
  Data font  : IBM Plex Mono (tabular figures for readouts)
  UI font    : Inter / Space Grotesk for headings
*/

const COLORS = {
  bg: "#0A0E14",
  surface1: "#10161F",
  surface2: "#161E2B",
  line: "#212B3B",
  textHi: "#E7ECF3",
  textMid: "#8C97A8",
  textLow: "#5A6576",
  accent: "#2DD4BF",
  warn: "#F5B84C",
  crit: "#F0605C",
};

const ROOM_DEFS = [
  { id: "pr-01", name: "Panel Room 01", zone: "MDS - Terminal A", wired: true },
  { id: "pr-02", name: "Panel Room 02", zone: "MDS - Terminal B", wired: true },
  { id: "pr-03", name: "Panel Room 03", zone: "MDS - Tower Base", wired: false },
  { id: "pr-04", name: "Panel Room 04", zone: "MDS - Radar Bldg", wired: false },
  { id: "pr-05", name: "Panel Room 05", zone: "MDS - Backup Gen", wired: true },
];

const PARAM_DEFS = [
  { key: "voltage", label: "Voltage", unit: "V", icon: Zap, base: 220, jitter: 3, low: 198, high: 242 },
  { key: "current", label: "Current", unit: "A", icon: Activity, base: 42, jitter: 4, low: 0, high: 63 },
  { key: "frequency", label: "Frequency", unit: "Hz", icon: Gauge, base: 50, jitter: 0.15, low: 49.5, high: 50.5 },
  { key: "cosphi", label: "Power factor", unit: "", icon: Radio, base: 0.94, jitter: 0.02, low: 0.85, high: 1.0 },
  { key: "temp", label: "Temperature", unit: "°C", icon: Thermometer, base: 27, jitter: 1.2, low: 15, high: 35 },
];

function seedHistory(base, jitter, points = 24) {
  const arr = [];
  let v = base;
  for (let i = 0; i < points; i++) {
    v = v + (Math.random() - 0.5) * jitter * 0.6;
    arr.push({ i, v: Number(v.toFixed(2)) });
  }
  return arr;
}

function statusOf(value, low, high) {
  const span = high - low;
  const margin = span * 0.08;
  if (value < low || value > high) return "crit";
  if (value < low + margin || value > high - margin) return "warn";
  return "ok";
}

function statusColor(s) {
  if (s === "crit") return COLORS.crit;
  if (s === "warn") return COLORS.warn;
  return COLORS.accent;
}

function useLiveRooms() {
  const [rooms, setRooms] = useState(() =>
    ROOM_DEFS.map((r) => ({
      ...r,
      online: true,
      heartbeat: true,
      params: Object.fromEntries(
        PARAM_DEFS.map((p) => [
          p.key,
          { value: p.base, history: seedHistory(p.base, p.jitter) },
        ])
      ),
    }))
  );

  useEffect(() => {
    const t = setInterval(() => {
      setRooms((prev) =>
        prev.map((room) => {
          const heartbeat = room.wired ? true : Math.random() > 0.06;
          const params = {};
          PARAM_DEFS.forEach((p) => {
            const cur = room.params[p.key];
            let next = cur.value + (Math.random() - 0.5) * p.jitter;
            // occasional excursion to demonstrate alarms
            if (Math.random() < 0.015) {
              next = p.high + p.jitter;
            }
            next = Number(next.toFixed(2));
            const hist = [...cur.history.slice(1), { i: cur.history.length, v: next }];
            params[p.key] = { value: next, history: hist };
          });
          return { ...room, heartbeat, online: heartbeat || room.wired, params };
        })
      );
    }, 2200);
    return () => clearInterval(t);
  }, []);

  return rooms;
}

function ParamCard({ def, data }) {
  const s = statusOf(data.value, def.low, def.high);
  const color = statusColor(s);
  const Icon = def.icon;
  return (
    <div
      style={{
        background: COLORS.surface1,
        border: `1px solid ${COLORS.line}`,
        borderRadius: 10,
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        minWidth: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Icon size={15} color={COLORS.textMid} strokeWidth={1.75} />
          <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: COLORS.textMid, letterSpacing: 0.3 }}>
            {def.label}
          </span>
        </div>
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: color,
            boxShadow: s !== "ok" ? `0 0 0 3px ${color}22` : "none",
          }}
        />
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
        <span
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontVariantNumeric: "tabular-nums",
            fontSize: 26,
            fontWeight: 500,
            color: COLORS.textHi,
            lineHeight: 1,
          }}
        >
          {def.key === "cosphi" ? data.value.toFixed(2) : data.value.toFixed(1)}
        </span>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: COLORS.textLow }}>
          {def.unit}
        </span>
      </div>

      <div style={{ height: 34, margin: "0 -4px" }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data.history} margin={{ top: 2, right: 4, left: 4, bottom: 0 }}>
            <defs>
              <linearGradient id={`grad-${def.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <YAxis hide domain={["dataMin - 1", "dataMax + 1"]} />
            <Area
              type="monotone"
              dataKey="v"
              stroke={color}
              strokeWidth={1.5}
              fill={`url(#grad-${def.key})`}
              isAnimationActive={false}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, color: COLORS.textLow }}>
        band {def.low}–{def.high}
        {def.unit}
      </div>
    </div>
  );
}

function RoomRow({ room, active, onSelect, alarmCount }) {
  const worst = useMemo(() => {
    let w = "ok";
    PARAM_DEFS.forEach((p) => {
      const s = statusOf(room.params[p.key].value, p.low, p.high);
      if (s === "crit") w = "crit";
      else if (s === "warn" && w !== "crit") w = "warn";
    });
    if (!room.online) w = "crit";
    return w;
  }, [room]);

  return (
    <button
      onClick={onSelect}
      style={{
        all: "unset",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        boxSizing: "border-box",
        padding: "10px 12px",
        borderRadius: 8,
        background: active ? COLORS.surface2 : "transparent",
        border: `1px solid ${active ? COLORS.line : "transparent"}`,
        marginBottom: 4,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            flexShrink: 0,
            background: statusColor(worst),
          }}
        />
        <div style={{ textAlign: "left", minWidth: 0 }}>
          <div
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: 13,
              color: COLORS.textHi,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {room.name}
          </div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: COLORS.textLow }}>{room.zone}</div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        {room.wired ? (
          <Cable size={13} color={COLORS.textLow} strokeWidth={1.75} />
        ) : room.heartbeat ? (
          <Wifi size={13} color={COLORS.accent} strokeWidth={1.75} />
        ) : (
          <WifiOff size={13} color={COLORS.crit} strokeWidth={1.75} />
        )}
      </div>
    </button>
  );
}

function HeartbeatStrip({ rooms }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 18,
        padding: "10px 16px",
        background: COLORS.surface1,
        border: `1px solid ${COLORS.line}`,
        borderRadius: 10,
        overflowX: "auto",
      }}
    >
      <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: COLORS.textLow, flexShrink: 0 }}>
        NODE HEARTBEAT
      </span>
      {rooms.map((r) => (
        <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: r.wired ? COLORS.textLow : r.heartbeat ? COLORS.accent : COLORS.crit,
              animation: !r.wired && r.heartbeat ? "pulse 2.2s ease-in-out infinite" : "none",
            }}
          />
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: COLORS.textMid }}>
            {r.id}
          </span>
        </div>
      ))}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(45,212,191,0.4); }
          50% { opacity: 0.55; box-shadow: 0 0 0 4px rgba(45,212,191,0); }
        }
      `}</style>
    </div>
  );
}

function AlarmLog({ alarms }) {
  return (
    <div
      style={{
        background: COLORS.surface1,
        border: `1px solid ${COLORS.line}`,
        borderRadius: 10,
        padding: "12px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        maxHeight: 260,
        overflowY: "auto",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
        <Bell size={13} color={COLORS.textMid} strokeWidth={1.75} />
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: COLORS.textLow, letterSpacing: 0.4 }}>
          ALARM LOG
        </span>
      </div>
      {alarms.length === 0 && (
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: COLORS.textLow }}>
          No active alarms.
        </div>
      )}
      {alarms.map((a, idx) => (
        <div
          key={idx}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "6px 8px",
            borderRadius: 6,
            background: "rgba(255,255,255,0.02)",
            borderLeft: `2px solid ${statusColor(a.level)}`,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: COLORS.textHi }}>
              {a.room} — {a.param}
            </div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, color: COLORS.textLow }}>
              {a.value} {a.unit} (band {a.low}–{a.high}{a.unit})
            </div>
          </div>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, color: COLORS.textLow, flexShrink: 0 }}>
            {a.time}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function PanelRoomMonitor() {
  const rooms = useLiveRooms();
  const [selectedId, setSelectedId] = useState(ROOM_DEFS[0].id);
  const selected = rooms.find((r) => r.id === selectedId) || rooms[0];
  const clockRef = useRef(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    clockRef.current = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(clockRef.current);
  }, []);

  const alarms = useMemo(() => {
    const list = [];
    rooms.forEach((room) => {
      PARAM_DEFS.forEach((p) => {
        const val = room.params[p.key].value;
        const s = statusOf(val, p.low, p.high);
        if (s !== "ok") {
          list.push({
            room: room.name,
            param: p.label,
            value: p.key === "cosphi" ? val.toFixed(2) : val.toFixed(1),
            unit: p.unit,
            low: p.low,
            high: p.high,
            level: s,
            time: now.toLocaleTimeString("en-GB", { hour12: false }),
          });
        }
      });
      if (!room.online) {
        list.push({
          room: room.name,
          param: "Node comms",
          value: "offline",
          unit: "",
          low: "-",
          high: "-",
          level: "crit",
          time: now.toLocaleTimeString("en-GB", { hour12: false }),
        });
      }
    });
    return list.slice(0, 8);
  }, [rooms, now]);

  return (
    <div
      style={{
        background: COLORS.bg,
        minHeight: "100vh",
        padding: 20,
        boxSizing: "border-box",
        fontFamily: "Inter, sans-serif",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 7,
              background: COLORS.surface2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: `1px solid ${COLORS.line}`,
            }}
          >
            <Gauge size={16} color={COLORS.accent} strokeWidth={1.75} />
          </div>
          <div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 15, color: COLORS.textHi, fontWeight: 500 }}>
              AirNav Panel Room Monitor
            </div>
            <div style={{ fontSize: 11, color: COLORS.textLow }}>Monitoring only · read-only tags · no MDS control</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 10px",
              borderRadius: 999,
              background: COLORS.surface1,
              border: `1px solid ${COLORS.line}`,
            }}
          >
            <ShieldCheck size={13} color={COLORS.accent} strokeWidth={1.75} />
            <span style={{ fontSize: 11.5, color: COLORS.textMid }}>Local VPN · no internet egress</span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 10px",
              borderRadius: 999,
              background: COLORS.surface1,
              border: `1px solid ${COLORS.line}`,
            }}
          >
            <Clock size={13} color={COLORS.textMid} strokeWidth={1.75} />
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5, color: COLORS.textMid }}>
              {now.toLocaleTimeString("en-GB", { hour12: false })} NTP-sync
            </span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 10px",
              borderRadius: 999,
              background: alarms.length ? "rgba(240,96,92,0.1)" : COLORS.surface1,
              border: `1px solid ${alarms.length ? "rgba(240,96,92,0.35)" : COLORS.line}`,
            }}
          >
            <Bell size={13} color={alarms.length ? COLORS.crit : COLORS.textMid} strokeWidth={1.75} />
            <span style={{ fontSize: 11.5, color: alarms.length ? COLORS.crit : COLORS.textMid }}>
              {alarms.length} active
            </span>
          </div>
        </div>
      </div>

      {/* Body grid */}
      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr 260px", gap: 14, alignItems: "start" }}>
        {/* Sidebar */}
        <div
          style={{
            background: COLORS.surface1,
            border: `1px solid ${COLORS.line}`,
            borderRadius: 10,
            padding: 10,
          }}
        >
          <div style={{ fontSize: 11, color: COLORS.textLow, padding: "4px 6px 8px", letterSpacing: 0.4 }}>
            PANEL ROOMS
          </div>
          {rooms.map((r) => (
            <RoomRow key={r.id} room={r} active={r.id === selectedId} onSelect={() => setSelectedId(r.id)} />
          ))}
        </div>

        {/* Main */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 15, color: COLORS.textHi, fontFamily: "'Space Grotesk', sans-serif" }}>
                {selected.name}
              </div>
              <div style={{ fontSize: 11.5, color: COLORS.textLow }}>{selected.zone}</div>
            </div>
            <div style={{ fontSize: 11, color: COLORS.textLow, fontFamily: "'IBM Plex Mono', monospace" }}>
              {selected.wired ? "wired · RS485/Modbus" : "wireless · ESP32/MQTT via VPN"}
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: 12,
            }}
          >
            {PARAM_DEFS.map((def) => (
              <ParamCard key={def.key} def={def} data={selected.params[def.key]} />
            ))}
          </div>

          <HeartbeatStrip rooms={rooms} />
        </div>

        {/* Right rail */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <AlarmLog alarms={alarms} />
        </div>
      </div>
    </div>
  );
}
