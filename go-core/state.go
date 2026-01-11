package main

import "sync"

type App struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Cmd  string `json:"cmd"`
}

var (
	mu sync.Mutex

	sessionActive = false

	allowedApps = []App{
		{
			ID:   "terminal",
			Name: "Terminal",
			Cmd:  "x-terminal-emulator",
		},
		{
			ID:   "browser",
			Name: "Browser",
			Cmd:  "firefox",
		},
	}
)

func StartSession() {
	mu.Lock()
	defer mu.Unlock()
	sessionActive = true
}

func StopSession() {
	mu.Lock()
	defer mu.Unlock()
	sessionActive = false
}

func IsSessionActive() bool {
	mu.Lock()
	defer mu.Unlock()
	return sessionActive
}

func GetApps() []App {
	return allowedApps
}
