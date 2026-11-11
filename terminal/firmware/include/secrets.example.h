#pragma once
// Template for include/secrets.h. Copy it and fill in your values:
//
//   cp include/secrets.example.h include/secrets.h
//
// secrets.h is in .gitignore: Wi-Fi passwords and terminal keys never go to the repository.

// Wi-Fi of the bench or of the demo. The ESP32 only connects to 2.4 GHz networks.
#define WIFI_SSID "nome-da-rede"
#define WIFI_PASSWORD "senha-da-rede"

// Backend base URL, with /api/v1 and without a trailing slash.
// Local Docker: http://<IP of the PC on the same network>:3000/api/v1
#define API_BASE_URL "http://192.168.0.10:3000/api/v1"

// Terminal identity (X-Terminal-Id and X-Terminal-Key). These are the PUBLIC values of the dev seed
// terminal (backend/docs/ambiente-dev.md): they only work against a local backend with the seed.
#define TERMINAL_ID "5eed0000-0000-4000-8000-000000000006"
#define TERMINAL_KEY "terminal-dev-key-1234567890abcdef1234567890"

// Shown next to the QR Code. Keep it short: that column of the display has 64 px.
#define TERMINAL_LABEL "Terminal 01"

// Fixed coordinates (I09). Leave them commented out to use the real GPS. When defined, the heartbeat
// sends them with gpsSimulado: true.
// #define GPS_FIXED_LAT -23.30512
// #define GPS_FIXED_LON -45.96551
