package main

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Server struct {
	db         *pgxpool.Pool
	authSecret []byte
}
type userClaims struct {
	UserID string  `json:"user_id"`
	Email  string  `json:"email"`
	Name   *string `json:"name"`
	Role   string  `json:"role"`
	jwt.RegisteredClaims
}
type contextKey string

const claimsKey contextKey = "user"

func (s *Server) cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := os.Getenv("WEB_ORIGIN")
		if origin != "" && r.Header.Get("Origin") == origin {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Credentials", "true")
			w.Header().Set("Vary", "Origin")
		}
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}
func (s *Server) authenticate(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/api/auth/login" || r.URL.Path == "/api/auth/session" || r.URL.Path == "/api/auth/logout" {
			next.ServeHTTP(w, r)
			return
		}
		claims, err := s.readClaims(r)
		if err != nil {
			writeError(w, http.StatusUnauthorized, "Unauthorized")
			return
		}
		next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), claimsKey, claims)))
	})
}
func (s *Server) readClaims(r *http.Request) (*userClaims, error) {
	cookie, err := r.Cookie("dfg_session")
	if err != nil {
		return nil, err
	}
	token, err := jwt.ParseWithClaims(cookie.Value, &userClaims{}, func(t *jwt.Token) (any, error) { return s.authSecret, nil }, jwt.WithValidMethods([]string{"HS256"}))
	if err != nil {
		return nil, err
	}
	claims, ok := token.Claims.(*userClaims)
	if !ok || !token.Valid {
		return nil, jwt.ErrTokenInvalidClaims
	}
	return claims, nil
}
func (s *Server) login(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if decode(r, &body) != nil {
		writeError(w, 400, "Invalid request")
		return
	}
	var c userClaims
	var passwordHash string
	err := s.db.QueryRow(r.Context(), `SELECT id,email,name,role,password FROM users WHERE lower(email)=lower($1)`, strings.TrimSpace(body.Email)).Scan(&c.UserID, &c.Email, &c.Name, &c.Role, &passwordHash)
	if err != nil || checkPassword(passwordHash, body.Password) != nil {
		writeError(w, 401, "Invalid email or password")
		return
	}
	now := time.Now()
	c.RegisteredClaims = jwt.RegisteredClaims{Subject: c.UserID, IssuedAt: jwt.NewNumericDate(now), ExpiresAt: jwt.NewNumericDate(now.Add(12 * time.Hour)), Issuer: "digital-fixture-generator"}
	token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, c).SignedString(s.authSecret)
	if err != nil {
		writeError(w, 500, "Could not create session")
		return
	}
	http.SetCookie(w, &http.Cookie{Name: "dfg_session", Value: token, Path: "/", HttpOnly: true, Secure: os.Getenv("COOKIE_SECURE") == "true", SameSite: http.SameSiteLaxMode, Expires: now.Add(12 * time.Hour)})
	writeJSON(w, 200, map[string]any{"user": map[string]any{"id": c.UserID, "email": c.Email, "name": c.Name, "role": c.Role}})
}
func (s *Server) session(w http.ResponseWriter, r *http.Request) {
	c, err := s.readClaims(r)
	if err != nil {
		writeError(w, 401, "Unauthorized")
		return
	}
	writeJSON(w, 200, map[string]any{"user": map[string]any{"id": c.UserID, "email": c.Email, "name": c.Name, "role": c.Role}})
}
func (s *Server) logout(w http.ResponseWriter, _ *http.Request) {
	http.SetCookie(w, &http.Cookie{Name: "dfg_session", Value: "", Path: "/", HttpOnly: true, MaxAge: -1, Expires: time.Unix(1, 0), SameSite: http.SameSiteLaxMode})
	writeJSON(w, 200, map[string]bool{"success": true})
}
func (s *Server) health(w http.ResponseWriter, r *http.Request) {
	if err := s.db.Ping(r.Context()); err != nil {
		writeError(w, 503, "Database unavailable")
		return
	}
	writeJSON(w, 200, map[string]string{"status": "ok"})
}
func decode(r *http.Request, v any) error {
	d := json.NewDecoder(io.LimitReader(r.Body, 2<<20))
	d.DisallowUnknownFields()
	return d.Decode(v)
}
func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}
func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}
func queryContext(r *http.Request) context.Context { return r.Context() }
