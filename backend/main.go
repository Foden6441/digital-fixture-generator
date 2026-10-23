package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Fatal("DATABASE_URL is required")
	}
	secret := os.Getenv("AUTH_SECRET")
	if len(secret) < 32 {
		log.Fatal("AUTH_SECRET must be at least 32 characters")
	}
	pool, err := pgxpool.New(context.Background(), dsn)
	if err != nil {
		log.Fatalf("connect to PostgreSQL: %v", err)
	}
	defer pool.Close()
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := pool.Ping(ctx); err != nil {
		log.Fatalf("ping PostgreSQL: %v", err)
	}

	app := &Server{db: pool, authSecret: []byte(secret)}
	if len(os.Args) > 1 && os.Args[1] == "seed-admin" {
		if err := app.seedAdmin(context.Background()); err != nil {
			log.Fatalf("seed admin: %v", err)
		}
		log.Println("Admin user created or updated")
		return
	}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", app.health)
	mux.HandleFunc("POST /api/auth/login", app.login)
	mux.HandleFunc("GET /api/auth/session", app.session)
	mux.HandleFunc("POST /api/auth/logout", app.logout)
	mux.HandleFunc("GET /api/auth/logout", app.logout)
	mux.Handle("/api/", app.authenticate(http.HandlerFunc(app.api)))

	addr := os.Getenv("API_ADDR")
	if addr == "" {
		addr = ":8080"
	}
	server := &http.Server{Addr: addr, Handler: app.cors(mux), ReadHeaderTimeout: 5 * time.Second}
	log.Printf("Go API listening on %s", addr)
	log.Fatal(server.ListenAndServe())
}

func (s *Server) seedAdmin(ctx context.Context) error {
	email := strings.TrimSpace(os.Getenv("ADMIN_EMAIL"))
	password := os.Getenv("ADMIN_PASSWORD")
	name := strings.TrimSpace(os.Getenv("ADMIN_NAME"))
	if email == "" || len(password) < 12 {
		return fmt.Errorf("set ADMIN_EMAIL and an ADMIN_PASSWORD of at least 12 characters")
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	if name == "" {
		name = "Competition Administrator"
	}
	_, err = s.db.Exec(ctx, `INSERT INTO users(id,email,name,password,role,"createdAt","updatedAt") VALUES($1,$2,$3,$4,'ADMIN',now(),now()) ON CONFLICT(email) DO UPDATE SET name=EXCLUDED.name,password=EXCLUDED.password,"updatedAt"=now()`, newID(), email, name, string(hash))
	return err
}
