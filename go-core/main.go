package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os/exec"
)

func withCORS(w http.ResponseWriter) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/json")
}

// 🆕 NEW: Set allowed apps when session starts
func setAppsHandler(w http.ResponseWriter, r *http.Request) {
	withCORS(w)
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	defer r.Body.Close()

	var req struct {
		AllowedApps []string `json:"allowedApps"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}

	log.Printf("Setting allowed apps: %v", req.AllowedApps)
	StartSessionWithApps(req.AllowedApps)

	json.NewEncoder(w).Encode(map[string]string{"status": "started"})
}

func startHandler(w http.ResponseWriter, r *http.Request) {
	withCORS(w)
	StartSession()
	json.NewEncoder(w).Encode(map[string]string{"status": "started"})
}

func stopHandler(w http.ResponseWriter, r *http.Request) {
	withCORS(w)
	StopSession()
	json.NewEncoder(w).Encode(map[string]string{"status": "stopped"})
}

func statusHandler(w http.ResponseWriter, r *http.Request) {
	withCORS(w)
	json.NewEncoder(w).Encode(map[string]bool{
		"active": IsSessionActive(),
	})
}

func appsHandler(w http.ResponseWriter, r *http.Request) {
	withCORS(w)
	json.NewEncoder(w).Encode(GetApps())
}

func launchHandler(w http.ResponseWriter, r *http.Request) {
	withCORS(w)
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	defer r.Body.Close()

	if !IsSessionActive() {
		http.Error(w, "session not active", http.StatusForbidden)
		return
	}

	var req struct {
		AppID string `json:"appId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}

	// 🔒 CHECK: Is this app allowed?
	if !isAppAllowed(req.AppID) {
		log.Printf("App %s not allowed", req.AppID)
		http.Error(w, "app not allowed", http.StatusForbidden)
		return
	}

	// Find and launch the app
	for _, app := range GetApps() {
		if app.ID == req.AppID && app.Allowed {
			log.Printf("Launching app: %s (%s)", app.Name, app.Cmd)
			// This uses 'sh -c' to ensure the command runs as if you typed it in terminal
			cmd := exec.Command("sh", "-c", app.Cmd)
			if err := cmd.Start(); err != nil {
				log.Printf("Failed to launch %s: %v", app.Name, err)
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			json.NewEncoder(w).Encode(map[string]string{"launched": app.ID})
			return
		}
	}

	http.Error(w, "app not found", http.StatusNotFound)
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	withCORS(w)
	json.NewEncoder(w).Encode(map[string]string{"ok": "true"})
}

func main() {
	http.HandleFunc("/start", startHandler)
	http.HandleFunc("/stop", stopHandler)
	http.HandleFunc("/status", statusHandler)
	http.HandleFunc("/apps", appsHandler)
	http.HandleFunc("/launch", launchHandler)
	http.HandleFunc("/setApps", setAppsHandler) // 🆕 NEW
	http.HandleFunc("/health", healthHandler)

	log.Println("Go backend running on :7070")
	log.Fatal(http.ListenAndServe(":7070", nil))
}
