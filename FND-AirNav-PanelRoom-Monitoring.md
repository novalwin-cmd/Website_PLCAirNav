# Functional Design Document (FND)
## PLC/SCADA Panel Room Monitoring System — AirNav Indonesia

| | |
|---|---|
| **Document Type** | Functional Design Document (FND) |
| **Project** | Panel Room Electrical & Environmental Monitoring System |
| **Client** | AirNav Indonesia (Perum LPPNPI) |
| **Version** | 0.1 – Draft |
| **Date** | 2026-07-07 |
| **Status** | For Review |

---

## 1. Introduction

### 1.1 Purpose
This document defines the functional design of a local, monitoring-only PLC/SCADA system for AirNav panel rooms. The system continuously acquires **voltage, current, frequency, power factor (cos φ), and temperature/humidity** from each panel room's Main Distribution System (MDS) and presents it to control room operators through a supervisory HMI, with alarming and historian capability.

### 1.2 Background
AirNav is monitoring the health of electrical distribution panels that feed navigation and communication equipment. Because these systems support air navigation safety infrastructure, the design mandates a **fully local, non-internet-facing** network, using AirNav's internal VPN and, where practical, wired connections.

### 1.3 Objectives
- Provide real-time visibility of electrical parameters per panel room.
- Provide environmental (temperature/humidity) monitoring per panel room.
- Raise alarms for abnormal electrical or thermal conditions.
- Log historical data for trend analysis and audits.
- Keep the entire data path inside AirNav's local network/VPN — **read-only, monitoring-only**, no control/actuation of the MDS.

### 1.4 Definitions
| Term | Meaning |
|---|---|
| MDS | Main Distribution System (source of electrical parameters) |
| PLC | Programmable Logic Controller, used here as a data concentrator/gateway |
| SCADA | Supervisory Control and Data Acquisition system (server + historian + HMI) |
| HMI | Human-Machine Interface, operator-facing screens |
| CT/PT | Current Transformer / Potential Transformer |
| cos φ | Power factor |
| VPN | Virtual Private Network — AirNav's internal, local-only network |

---

## 2. Scope

### 2.1 In Scope
- Acquisition of V, I, f, cos φ from panel-room power meters via Modbus (RTU/TCP).
- Acquisition of temperature/humidity from ESP32 + DHT22 nodes via MQTT over AirNav's local VPN/Wi-Fi.
- PLC/gateway aggregation, protocol bridging (Modbus/MQTT → OPC UA).
- SCADA server: historian, alarm engine, and operator HMI (desktop clients on the internal network).
- Wired (RS485/Ethernet) cabling to the control room where feasible; wireless (VPN) only where cabling is impractical.

### 2.2 Out of Scope
- Any control or switching action on the MDS (monitoring only — no write-back to breakers/relays).
- Internet-facing access, cloud historian, or remote (outside AirNav network) access.
- Billing-grade energy metering/revenue metering certification.

---

## 3. System Architecture

### 3.1 Layered View
```
┌─────────────────────────────────────────────────────────┐
│  Presentation Layer  – SCADA/HMI clients (control room)   │
│  - Trends, alarms, panel-room mimic screens                │
└───────────────────────▲─────────────────────────────────┘
                         │ OPC UA / internal LAN
┌───────────────────────┴─────────────────────────────────┐
│  Aggregation Layer – Control Room                         │
│  - SCADA server (historian + alarm engine)                 │
│  - MQTT broker (Mosquitto) + Node-RED bridge                │
│  - PLC / Modbus-OPC gateway                                 │
└───────────────────────▲─────────────────────────────────┘
              ┌──────────┴──────────┐
   Modbus RTU/TCP (wired)     MQTT over AirNav VPN (wireless)
              │                      │
┌─────────────┴─────────┐  ┌─────────┴──────────────┐
│ Field Layer – Panel Room │  │ Field Layer – Panel Room │
│ Power meter (V/I/f/cosφ) │  │ ESP32 + DHT22 (temp/RH)  │
│ via CT/PT                │  │ Wi-Fi → local VPN         │
└───────────────────────────┘  └────────────────────────┘
```

### 3.2 Component Roles
| Layer | Component | Function |
|---|---|---|
| Field | Power meter (Modbus) | Measures V, I, f, cos φ per panel via CT/PT |
| Field | ESP32 + DHT22 | Measures panel-room temperature/humidity; sends heartbeat |
| Aggregation | PLC / Modbus-OPC gateway | Polls meters, exposes tags via OPC UA |
| Aggregation | MQTT broker (Mosquitto) | Receives ESP32 publications over local VPN |
| Aggregation | Node-RED | Validates/bridges MQTT → OPC UA/Modbus tag space |
| Aggregation | SCADA server | Historian, alarm engine, tag database |
| Presentation | HMI client | Operator screens, trends, alarm acknowledgment |

---

## 4. Functional Requirements

| ID | Requirement |
|---|---|
| FR-01 | The system shall acquire voltage, current, frequency, and cos φ from each panel room's power meter at a configurable interval (default 1–5 s). |
| FR-02 | The system shall acquire temperature and humidity from each panel room's ESP32/DHT22 node at a configurable interval (default 30–60 s). |
| FR-03 | The system shall display live values and trend charts for all measured parameters, grouped per panel room. |
| FR-04 | The system shall raise an alarm when voltage, current, frequency, cos φ, or temperature exceeds configured thresholds. |
| FR-05 | The system shall log a heartbeat from each ESP32 node and raise a communication-loss alarm if a node misses N consecutive heartbeats. |
| FR-06 | The system shall store historical data (electrical: 1 s–1 min resolution; environmental: 30–60 s resolution) for a configurable retention period. |
| FR-07 | The system shall allow operators to acknowledge, filter, and export alarms. |
| FR-08 | The system shall be read-only with respect to the MDS — it shall not issue any control commands to breakers, relays, or meters. |
| FR-09 | All HMI clients shall connect only from within the AirNav internal network/VPN. |
| FR-10 | The system shall timestamp all data using a synchronized local NTP source. |

---

## 5. Non-Functional Requirements

| ID | Category | Requirement |
|---|---|---|
| NFR-01 | Security | No component shall have outbound internet access; internet egress blocked by network policy. |
| NFR-02 | Security | Field devices, SCADA server, and HMI clients shall reside on separated, firewalled VLANs. |
| NFR-03 | Security | MQTT clients (ESP32 nodes) shall use unique client IDs and authenticated credentials. |
| NFR-04 | Reliability | Loss of a single ESP32 node shall not affect acquisition of other nodes or electrical parameters. |
| NFR-05 | Performance | End-to-end latency from sensor read to HMI tag update shall not exceed 5 s for electrical parameters. |
| NFR-06 | Availability | The SCADA server shall be backed by local UPS/backup power to maintain monitoring during short outages. |
| NFR-07 | Maintainability | Modbus register maps, tag lists, and network diagrams shall be documented and version-controlled. |

---

## 6. Data Model & Sampling

| Parameter | Source | Sampling Rate | Historian Resolution | Alarm Basis |
|---|---|---|---|---|
| Voltage (V) | Power meter (Modbus) | 1–5 s | 1 s–1 min | Over/under voltage band |
| Current (A) | Power meter (Modbus) | 1–5 s | 1 s–1 min | Overcurrent threshold |
| Frequency (Hz) | Power meter (Modbus) | 1–5 s | 1 s–1 min | Out-of-band frequency |
| Power factor (cos φ) | Power meter (Modbus) | 1–5 s | 1 s–1 min | Below minimum cos φ |
| Temperature (°C) | ESP32 + DHT22 (MQTT) | 30–60 s | 30–60 s | Over-temperature threshold |
| Humidity (%RH) | ESP32 + DHT22 (MQTT) | 30–60 s | 30–60 s | Informational (no hard alarm by default) |
| Node heartbeat | ESP32 (MQTT) | Every publish cycle | n/a | Missed-heartbeat → comms-loss alarm |

---

## 7. Alarm Matrix (Initial)

| Alarm | Condition (example) | Priority |
|---|---|---|
| Over-voltage | V > Vnom + 10% | High |
| Under-voltage | V < Vnom − 10% | High |
| Overcurrent | I > rated current | High |
| Frequency deviation | f outside 49.5–50.5 Hz | High |
| Low power factor | cos φ < 0.85 | Medium |
| Over-temperature | T > 35 °C (panel-room dependent) | Medium |
| ESP32 comms loss | Missed heartbeat ×3 | Medium |
| Meter comms loss | Modbus timeout | High |

*(Exact thresholds to be finalized with AirNav electrical engineering during Phase 0.)*

---

## 8. Network & Security Architecture

- All traffic stays within AirNav's internal LAN/VPN; **no internet egress** for any SCADA component.
- Field devices (meters, ESP32 nodes), SCADA server, and HMI clients sit on **separate VLANs** behind firewalls.
- Wired RS485/Ethernet is preferred for electrical measurements; Wi-Fi (via AirNav's local VPN) is used only where cabling is impractical, and only for temperature/humidity nodes — never for primary electrical metering.
- Modbus TCP devices are never exposed directly to the wider network; they sit behind the PLC/gateway.
- ESP32/MQTT nodes authenticate with unique client IDs and credentials; TLS is optional within the VPN boundary.
- All device access and alarm events are logged for audit.

---

## 9. Hardware & Software Summary

| Category | Recommendation |
|---|---|
| Power meters | Modbus RTU/TCP certified meters (e.g., Schneider, Socomec) with CT/PT sized to panel |
| PLC / gateway | Compact PLC or Modbus-OPC gateway (e.g., Siemens S7-1200, Schneider M221, Wago) |
| Temperature nodes | ESP32 + DHT22 (consider RTD/PT100 where ±0.1–0.5 °C accuracy is required) |
| MQTT broker | Mosquitto (local server) |
| Bridge/logic | Node-RED |
| SCADA/HMI | Ignition, Wonderware, or equivalent local SCADA package with historian |
| Time sync | Local NTP server |

---

## 10. Implementation Phases

| Phase | Description |
|---|---|
| Phase 0 – Survey | Site survey of panel rooms, existing CT/PT terminations, cable routes, control room rack space, node count. |
| Phase 1 – Prototype | One panel room fully wired (meter → PLC → SCADA) plus one ESP32/DHT22 node (MQTT → SCADA); validate data flow, alarms, historian. |
| Phase 2 – Rollout | Cable remaining rooms; deploy remaining wireless nodes; finalize tag naming, thresholds, HMI screens. |
| Phase 3 – Test & Handover | Failure-mode testing (VPN outage, meter/node offline), alarm tuning, documentation, and operator handover. |

---

## 11. Testing & Validation Checklist

- [ ] Calibrate/validate CT, PT, and meters against a reference meter.
- [ ] Verify Modbus register mapping and configured sample rates.
- [ ] Measure end-to-end latency from sensor read → SCADA tag update → alarm trigger.
- [ ] Test VPN isolation (confirm no internet egress from any component).
- [ ] Test backup power for the SCADA server.
- [ ] Verify NTP time synchronization across all timestamps.
- [ ] Simulate ESP32 node dropout and confirm comms-loss alarm fires within spec.
- [ ] Simulate meter Modbus timeout and confirm alarm fires within spec.

---

## 12. Assumptions & Constraints

- Existing panel rooms have accessible CT/PT terminations or space to install them.
- AirNav's internal VPN/Wi-Fi can accommodate additional ESP32 client devices.
- The SCADA package selected supports OPC UA and/or an MQTT bridge.
- This system is monitoring-only; no interlocks or control outputs are implemented in this phase.

---

## 13. Open Items for AirNav Sign-off

1. Exact voltage/current/frequency/cos φ alarm thresholds per panel room.
2. Number and layout of panel rooms, and which require wired vs. wireless temperature nodes.
3. Choice of SCADA/HMI platform (Ignition vs. alternative).
4. Data retention period for the historian.
5. Final power-meter model selection (for Modbus register mapping).

---

## 14. Deliverables

- This Functional Design Document (FND).
- PLC/SCADA network diagram, tag list, and Modbus register map (per panel room).
- Node-RED flow and ESP32 firmware sketch (MQTT publishing DHT22 readings over AirNav VPN).
- HMI mockups and alarm matrix (see accompanying UI/UX design).
