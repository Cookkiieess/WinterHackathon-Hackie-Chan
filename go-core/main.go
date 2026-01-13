package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os" // <--- Added for debug logging (Stdout/Stderr)
	"os/exec"
	"runtime" // <--- Added to detect Windows vs Linux
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

			var cmd *exec.Cmd

			// 🔧 PLATFORM FIX: Run commands correctly based on OS
			if runtime.GOOS == "windows" {
				// Windows: Run directly to handle paths with spaces correctly
				// If it's the "terminal" app, we need special magic to make the window appear
				if app.ID == "terminal" {
					cmd = exec.Command("cmd", "/c", "start")
				} else {
					cmd = exec.Command(app.Cmd)
				}
			} else {
				// Linux/Mac: Use 'sh -c' to handle environment variables and shell expansion safely
				cmd = exec.Command("sh", "-c", app.Cmd)
			}

			// 🐛 DEBUGGING FIX: Connect app output to your server terminal
			// If Chrome crashes or is missing, you will see the error in YOUR Go terminal now.
			cmd.Stdout = os.Stdout
			cmd.Stderr = os.Stderr

			if err := cmd.Start(); err != nil {
				log.Printf("Failed to launch %s: %v", app.Name, err)
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}

			// Release the process resource so it doesn't zombie or close when the server closes
			go func() {
				_ = cmd.Process.Release()
			}()

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
	http.HandleFunc("/setApps", setAppsHandler)
	http.HandleFunc("/health", healthHandler)

	log.Println("Go backend running on :7070")
	log.Fatal(http.ListenAndServe(":7070", nil))
}
