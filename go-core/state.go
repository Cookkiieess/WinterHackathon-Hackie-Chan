package main

import (
	"runtime"
	"sync"
)

type App struct {
	ID      string `json:"id"`
	Name    string `json:"name"`
	Cmd     string `json:"cmd"`
	Icon    string `json:"icon"`
	Allowed bool   `json:"allowed"`
}

var (
	mu sync.Mutex

	sessionActive = false
	allowedAppIDs = []string{} // IDs of allowed apps from teacher

	// All available apps on this system
	allApps = []App{
		{
			ID:   "chrome",
			Name: "Chrome",
			Cmd:  getChromeCmd(),
			Icon: "🌐",
		},
		{
			ID:   "vscode",
			Name: "VS Code",
			Cmd:  getVSCodeCmd(),
			Icon: "💻",
		},
		{
			ID:   "terminal",
			Name: "Terminal",
			Cmd:  getTerminalCmd(),
			Icon: "⌨️",
		},
		{
			ID:   "calculator",
			Name: "Calculator",
			Cmd:  getCalculatorCmd(),
			Icon: "🔢",
		},
		{
			ID:   "notepad",
			Name: "Notepad",
			Cmd:  getNotepadCmd(),
			Icon: "📝",
		},
		{
			ID:   "firefox",
			Name: "Firefox",
			Cmd:  getFirefoxCmd(),
			Icon: "🦊",
		},
	}
)

// Platform-specific commands
func getChromeCmd() string {
	switch runtime.GOOS {
	case "windows":
		return "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
	case "darwin":
		return "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
	default:
		return "google-chrome"
	}
}

func getVSCodeCmd() string {
	switch runtime.GOOS {
	case "windows":
		return "C:\\Program Files\\Microsoft VS Code\\Code.exe"
	case "darwin":
		return "/Applications/Visual Studio Code.app/Contents/MacOS/Electron"
	default:
		return "code"
	}
}

func getTerminalCmd() string {
	switch runtime.GOOS {
	case "windows":
		return "cmd.exe"
	case "darwin":
		return "/System/Applications/Utilities/Terminal.app/Contents/MacOS/Terminal"
	default:
		return "x-terminal-emulator"
	}
}

func getCalculatorCmd() string {
	switch runtime.GOOS {
	case "windows":
		return "calc.exe"
	case "darwin":
		return "/System/Applications/Calculator.app/Contents/MacOS/Calculator"
	default:
		return "gnome-calculator"
	}
}

func getNotepadCmd() string {
	switch runtime.GOOS {
	case "windows":
		return "notepad.exe"
	case "darwin":
		return "/System/Applications/TextEdit.app/Contents/MacOS/TextEdit"
	default:
		return "gedit"
	}
}

func getFirefoxCmd() string {
	switch runtime.GOOS {
	case "windows":
		return "C:\\Program Files\\Mozilla Firefox\\firefox.exe"
	case "darwin":
		return "/Applications/Firefox.app/Contents/MacOS/firefox"
	default:
		return "firefox"
	}
}

// Check if an app ID is in the allowed list
func isAppAllowed(appID string) bool {
	mu.Lock()
	defer mu.Unlock()

	if !sessionActive {
		return false
	}

	for _, id := range allowedAppIDs {
		if id == appID {
			return true
		}
	}
	return false
}

// Start session with allowed apps
func StartSessionWithApps(apps []string) {
	mu.Lock()
	defer mu.Unlock()
	sessionActive = true
	allowedAppIDs = apps
}

func StartSession() {
	mu.Lock()
	defer mu.Unlock()
	sessionActive = true
}

func StopSession() {
	mu.Lock()
	defer mu.Unlock()
	sessionActive = false
	allowedAppIDs = []string{}
}

func IsSessionActive() bool {
	mu.Lock()
	defer mu.Unlock()
	return sessionActive
}

// Get all apps with their allowed status
func GetApps() []App {
	mu.Lock()
	defer mu.Unlock()

	apps := make([]App, len(allApps))
	for i, app := range allApps {
		apps[i] = app
		apps[i].Allowed = false

		// Mark as allowed if in the list
		for _, id := range allowedAppIDs {
			if app.ID == id {
				apps[i].Allowed = true
				break
			}
		}
	}

	return apps
}
