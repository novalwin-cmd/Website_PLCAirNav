# AirNav Panel Room Monitoring Prototype

This Vite + React prototype demonstrates a monitoring-only PLC/SCADA panel-room dashboard for AirNav Indonesia. The flow starts with a commissioning wizard that collects project, room, device, threshold, and network settings, then hands that configuration to a live monitoring dashboard with simulated electrical and environmental values.

## Run locally

```bash
npm install
npm run dev
```

## Notes

This prototype is monitoring-only and does not issue control or write-back commands to the MDS.
