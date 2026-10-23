package main

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgconn"
)

func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}

func newID() string {
	b := make([]byte, 12)
	if _, e := rand.Read(b); e != nil {
		panic(e)
	}
	return "c" + hex.EncodeToString(b)
}
func body(r *http.Request) (map[string]any, error) {
	var v map[string]any
	d := json.NewDecoder(r.Body)
	d.UseNumber()
	e := d.Decode(&v)
	return v, e
}
func str(m map[string]any, k string) string { v, _ := m[k].(string); return strings.TrimSpace(v) }
func nint(m map[string]any, k string) int {
	switch v := m[k].(type) {
	case json.Number:
		i, _ := v.Int64()
		return int(i)
	case float64:
		return int(v)
	}
	return 0
}
func (s *Server) api(w http.ResponseWriter, r *http.Request) {
	p := strings.Trim(strings.TrimPrefix(r.URL.Path, "/api/"), "/")
	a := strings.Split(p, "/")
	c := r.Context().Value(claimsKey).(*userClaims)
	if len(a) == 1 && a[0] == "competitions" {
		s.competitions(w, r, c)
		return
	}
	if len(a) == 1 && a[0] == "teams" {
		s.catalogTeams(w, r)
		return
	}
	if len(a) == 2 && a[0] == "teams" {
		s.deleteCatalogTeam(w, r, a[1])
		return
	}
	if len(a) == 1 && a[0] == "venues" {
		s.catalogVenues(w, r)
		return
	}
	if len(a) == 2 && a[0] == "venues" {
		s.deleteCatalogVenue(w, r, a[1])
		return
	}
	if len(a) < 2 || a[0] != "competitions" {
		writeError(w, 404, "Not found")
		return
	}
	id := a[1]
	if len(a) == 2 {
		s.competition(w, r, c, id)
		return
	}
	if len(a) == 3 {
		switch a[2] {
		case "teams":
			s.members(w, r, c, id, "teams")
			return
		case "venues":
			s.members(w, r, c, id, "venues")
			return
		case "fixtures":
			s.fixtures(w, r, c, id)
			return
		case "audit":
			s.audit(w, r, id)
			return
		}
	}
	if len(a) == 4 && a[2] == "teams" {
		s.removeMember(w, r, c, id, a[3], "teams")
		return
	}
	if len(a) == 5 && a[2] == "teams" && a[4] == "home-venue" {
		s.setTeamHomeVenue(w, r, c, id, a[3])
		return
	}
	if len(a) == 4 && a[2] == "venues" {
		s.removeMember(w, r, c, id, a[3], "venues")
		return
	}
	if len(a) >= 4 && a[2] == "fixtures" {
		s.fixtureActions(w, r, c, id, a[3:], a[3])
		return
	}
	writeError(w, 404, "Not found")
}
func (s *Server) competitions(w http.ResponseWriter, r *http.Request, c *userClaims) {
	switch r.Method {
	case "GET":
		rows, e := s.db.Query(r.Context(), `SELECT c.*, (SELECT count(*) FROM competition_teams ct WHERE ct."competitionId"=c.id) AS "teamCount", (SELECT count(*) FROM fixtures f WHERE f."competitionId"=c.id) AS "fixtureCount", (SELECT count(*) FROM competition_venues cv WHERE cv."competitionId"=c.id) AS "venueCount" FROM competitions c ORDER BY c."createdAt" DESC`)
		if e != nil {
			internal(w, e)
			return
		}
		defer rows.Close()
		out := []map[string]any{}
		for rows.Next() {
			var id, name, season, status, format string
			var desc, logo, color any
			var start, end, created, updated time.Time
			var group, tc, fc, vc int
			var creator string
			err := rows.Scan(&id, &name, &desc, &logo, &color, &season, &start, &end, &status, &format, &group, &creator, &created, &updated, &tc, &fc, &vc)
			if err != nil {
				internal(w, err)
				return
			}
			out = append(out, map[string]any{"id": id, "name": name, "description": desc, "logo": logo, "primaryColor": color, "season": season, "startDate": start, "endDate": end, "status": status, "format": format, "groupSize": group, "createdBy": creator, "createdAt": created, "updatedAt": updated, "_count": map[string]int{"teamMemberships": tc, "fixtures": fc, "venueMemberships": vc}})
		}
		writeJSON(w, 200, out)
	case "POST":
		m, e := body(r)
		if e != nil {
			writeError(w, 400, "Invalid request")
			return
		}
		name, season := str(m, "name"), str(m, "season")
		if name == "" || season == "" {
			writeError(w, 400, "Name and season are required")
			return
		}
		format := str(m, "format")
		if format == "" {
			format = "DOUBLE_ROUND_ROBIN"
		}
		gs := nint(m, "groupSize")
		if gs == 0 {
			gs = 4
		}
		start, end := str(m, "startDate"), str(m, "endDate")
		id := newID()
		tx, e := s.db.Begin(r.Context())
		if e != nil {
			internal(w, e)
			return
		}
		defer tx.Rollback(r.Context())
		_, e = tx.Exec(r.Context(), `INSERT INTO competitions(id,name,description,logo,"primaryColor",season,"startDate","endDate",format,"groupSize","createdBy","updatedAt") VALUES($1,$2,$3,$4,$5,$6,$7::date,$8::date,$9,$10,$11,now())`, id, name, nullIfEmpty(str(m, "description")), nullIfEmpty(str(m, "logo")), coalesce(str(m, "primaryColor"), "#191B52"), season, start, end, format, gs, c.UserID)
		if e != nil {
			internal(w, e)
			return
		}
		for _, v := range anySlice(m["existingTeamIds"]) {
			if tid, ok := v.(string); ok {
				if _, e = tx.Exec(r.Context(), `INSERT INTO competition_teams("competitionId","teamId") VALUES($1,$2)`, id, tid); e != nil {
					internal(w, e)
					return
				}
			}
		}
		for _, v := range anySlice(m["newTeams"]) {
			t, ok := v.(map[string]any)
			if !ok {
				continue
			}
			tid := newID()
			_, e = tx.Exec(r.Context(), `INSERT INTO teams(id,name,abbreviation,"updatedAt") VALUES($1,$2,$3,now())`, tid, str(t, "name"), nullIfEmpty(str(t, "abbreviation")))
			if e == nil {
				_, e = tx.Exec(r.Context(), `INSERT INTO competition_teams("competitionId","teamId") VALUES($1,$2)`, id, tid)
			}
			if e != nil {
				internal(w, e)
				return
			}
		}
		if e = tx.Commit(r.Context()); e != nil {
			internal(w, e)
			return
		}
		s.getCompetition(w, r, id)
	default:
		writeError(w, 405, "Method not allowed")
	}
}
func anySlice(v any) []any { a, _ := v.([]any); return a }
func nullIfEmpty(v string) any {
	if v == "" {
		return nil
	}
	return v
}
func coalesce(v, d string) string {
	if v == "" {
		return d
	}
	return v
}
func internal(w http.ResponseWriter, e error) {
	fmt.Printf("backend error: %v\n", e)
	writeError(w, 500, "Backend operation failed")
}

func (s *Server) getCompetition(w http.ResponseWriter, r *http.Request, id string) {
	var out map[string]any
	var name, season, status, format, creator string
	var desc, logo any
	var color string
	var start, end, created, updated time.Time
	var gs, tc, vc, fc int
	e := s.db.QueryRow(r.Context(), `SELECT c.id,c.name,c.description,c.logo,c."primaryColor",c.season,c."startDate",c."endDate",c.status,c.format,c."groupSize",c."createdBy",c."createdAt",c."updatedAt",(SELECT count(*) FROM competition_teams x WHERE x."competitionId"=c.id),(SELECT count(*) FROM competition_venues x WHERE x."competitionId"=c.id),(SELECT count(*) FROM fixtures x WHERE x."competitionId"=c.id) FROM competitions c WHERE c.id=$1`, id).Scan(&id, &name, &desc, &logo, &color, &season, &start, &end, &status, &format, &gs, &creator, &created, &updated, &tc, &vc, &fc)
	if e != nil {
		writeError(w, 404, "Competition not found")
		return
	}
	out = map[string]any{"id": id, "name": name, "description": desc, "logo": logo, "primaryColor": color, "season": season, "startDate": start, "endDate": end, "status": status, "format": format, "groupSize": gs, "createdBy": creator, "createdAt": created, "updatedAt": updated, "_count": map[string]int{"teamMemberships": tc, "venueMemberships": vc, "fixtures": fc}}
	writeJSON(w, 200, out)
}
func (s *Server) competition(w http.ResponseWriter, r *http.Request, c *userClaims, id string) {
	switch r.Method {
	case "GET":
		s.getCompetition(w, r, id)
	case "PATCH":
		m, e := body(r)
		if e != nil {
			writeError(w, 400, "Invalid request")
			return
		}
		_, e = s.db.Exec(r.Context(), `UPDATE competitions SET name=COALESCE(NULLIF($2,''),name),description=COALESCE($3,description),season=COALESCE(NULLIF($4,''),season),status=COALESCE(NULLIF($5,''),status),"primaryColor"=COALESCE(NULLIF($6,''),"primaryColor"),logo=COALESCE($7,logo),"startDate"=COALESCE(NULLIF($8,'')::date,"startDate"),"endDate"=COALESCE(NULLIF($9,'')::date,"endDate"),"updatedAt"=now() WHERE id=$1`, id, str(m, "name"), nullIfEmpty(str(m, "description")), str(m, "season"), str(m, "status"), str(m, "primaryColor"), nullIfEmpty(str(m, "logo")), str(m, "startDate"), str(m, "endDate"))
		if e != nil {
			internal(w, e)
			return
		}
		if str(m, "status") != "" {
			s.auditAdd(r, c, "Competition", id, "UPDATE", m)
		}
		s.getCompetition(w, r, id)
	default:
		writeError(w, 405, "Method not allowed")
	}
}
func (s *Server) auditAdd(r *http.Request, c *userClaims, kind, id, action string, changes any) {
	b, _ := json.Marshal(changes)
	_, _ = s.db.Exec(r.Context(), `INSERT INTO audit_logs(id,"entityType","entityId",action,changes,"performedBy") VALUES($1,$2,$3,$4,$5,$6)`, newID(), kind, id, action, string(b), c.UserID)
}

func (s *Server) catalogTeams(w http.ResponseWriter, r *http.Request) {
	if r.Method == "GET" {
		rows, e := s.db.Query(r.Context(), `SELECT id,name,abbreviation,logo,"createdAt","updatedAt" FROM teams ORDER BY name`)
		if e != nil {
			internal(w, e)
			return
		}
		defer rows.Close()
		out := []map[string]any{}
		for rows.Next() {
			var id, name string
			var ab, logo any
			var cr, up time.Time
			_ = rows.Scan(&id, &name, &ab, &logo, &cr, &up)
			out = append(out, map[string]any{"id": id, "name": name, "abbreviation": ab, "logo": logo, "createdAt": cr, "updatedAt": up})
		}
		writeJSON(w, 200, out)
		return
	}
	if r.Method != "POST" {
		writeError(w, 405, "Method not allowed")
		return
	}
	m, e := body(r)
	if e != nil || str(m, "name") == "" {
		writeError(w, 400, "Team name is required")
		return
	}
	id := newID()
	_, e = s.db.Exec(r.Context(), `INSERT INTO teams(id,name,abbreviation,"updatedAt") VALUES($1,$2,$3,now())`, id, str(m, "name"), nullIfEmpty(str(m, "abbreviation")))
	if e != nil {
		internal(w, e)
		return
	}
	writeJSON(w, 201, map[string]any{"id": id, "name": str(m, "name"), "abbreviation": nullIfEmpty(str(m, "abbreviation"))})
}
func (s *Server) deleteCatalogTeam(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != "DELETE" {
		writeError(w, 405, "Method not allowed")
		return
	}
	_, e := s.db.Exec(r.Context(), `DELETE FROM teams WHERE id=$1`, id)
	if e != nil {
		internal(w, e)
		return
	}
	writeJSON(w, 200, map[string]bool{"success": true})
}
func (s *Server) catalogVenues(w http.ResponseWriter, r *http.Request) {
	if r.Method == "GET" {
		rows, e := s.db.Query(r.Context(), `SELECT v.id,v.name,v.location,v.capacity,v."homeTeamId",t.name FROM venues v LEFT JOIN teams t ON t.id=v."homeTeamId" ORDER BY v.name`)
		if e != nil {
			internal(w, e)
			return
		}
		defer rows.Close()
		out := []map[string]any{}
		for rows.Next() {
			var id, name string
			var loc, ht, tn any
			var cap *int
			_ = rows.Scan(&id, &name, &loc, &cap, &ht, &tn)
			out = append(out, map[string]any{"id": id, "name": name, "location": loc, "capacity": cap, "homeTeamId": ht, "homeTeam": mapNullableName(tn)})
		}
		writeJSON(w, 200, out)
		return
	}
	if r.Method != "POST" {
		writeError(w, 405, "Method not allowed")
		return
	}
	m, e := body(r)
	if e != nil || str(m, "name") == "" {
		writeError(w, 400, "Venue name is required")
		return
	}
	id := newID()
	_, e = s.db.Exec(r.Context(), `INSERT INTO venues(id,name,location,capacity,"homeTeamId","updatedAt") VALUES($1,$2,$3,NULLIF($4,0),$5,now())`, id, str(m, "name"), nullIfEmpty(str(m, "location")), nint(m, "capacity"), nullIfEmpty(str(m, "homeTeamId")))
	if e != nil {
		if isUniqueViolation(e) {
			writeError(w, 409, "A venue with this name already exists. Add the existing venue to this competition instead.")
			return
		}
		internal(w, e)
		return
	}
	writeJSON(w, 201, map[string]any{"id": id, "name": str(m, "name"), "location": nullIfEmpty(str(m, "location")), "capacity": nint(m, "capacity")})
}
func mapNullableName(v any) any {
	if v == nil {
		return nil
	}
	return map[string]any{"name": v}
}
func (s *Server) deleteCatalogVenue(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != "DELETE" {
		writeError(w, 405, "Method not allowed")
		return
	}
	_, e := s.db.Exec(r.Context(), `DELETE FROM venues WHERE id=$1`, id)
	if e != nil {
		internal(w, e)
		return
	}
	writeJSON(w, 200, map[string]bool{"success": true})
}

func (s *Server) members(w http.ResponseWriter, r *http.Request, c *userClaims, id, kind string) {
	table, join := `competition_teams`, `teamId`
	if kind == "venues" {
		table, join = `competition_venues`, `venueId`
	}
	if r.Method == "GET" {
		var items []map[string]any
		var e error
		if kind == "teams" {
			items, e = s.teamMembers(r, id)
		} else {
			items, e = s.venueMembers(r, id)
		}
		if e != nil {
			internal(w, e)
			return
		}
		writeJSON(w, 200, items)
		return
	}
	if r.Method != "POST" {
		writeError(w, 405, "Method not allowed")
		return
	}
	m, e := body(r)
	if e != nil {
		writeError(w, 400, "Invalid request")
		return
	}
	if kind == "venues" {
		s.addCompetitionVenue(w, r, id, m)
		return
	}
	memberID := str(m, "teamId")
	if memberID == "" {
		memberID = newID()
		_, e = s.db.Exec(r.Context(), `INSERT INTO teams(id,name,abbreviation,"updatedAt") VALUES($1,$2,$3,now())`, memberID, str(m, "name"), nullIfEmpty(str(m, "abbreviation")))
		if e != nil {
			internal(w, e)
			return
		}
	}
	q := fmt.Sprintf(`INSERT INTO %s("competitionId","%s") VALUES($1,$2)`, table, join)
	if _, e = s.db.Exec(r.Context(), q, id, memberID); e != nil {
		writeError(w, 409, "Membership already exists or resource is invalid")
		return
	}
	writeJSON(w, 201, map[string]any{"id": memberID, "name": str(m, "name"), "abbreviation": nullIfEmpty(str(m, "abbreviation"))})
}

func (s *Server) addCompetitionVenue(w http.ResponseWriter, r *http.Request, competitionID string, m map[string]any) {
	venueID := str(m, "venueId")
	homeTeamID := str(m, "homeTeamId")
	tx, err := s.db.Begin(r.Context())
	if err != nil {
		internal(w, err)
		return
	}
	defer tx.Rollback(r.Context())
	if venueID == "" {
		name := str(m, "name")
		if name == "" {
			writeError(w, http.StatusBadRequest, "Venue name is required")
			return
		}
		venueID = newID()
		_, err = tx.Exec(r.Context(), `INSERT INTO venues(id,name,location,capacity,"updatedAt") VALUES($1,$2,$3,NULLIF($4,0),now())`, venueID, name, nullIfEmpty(str(m, "location")), nint(m, "capacity"))
		if err != nil {
			if isUniqueViolation(err) {
				writeError(w, http.StatusConflict, "A venue with this name already exists. Select the saved venue instead.")
				return
			}
			internal(w, err)
			return
		}
	} else {
		var exists bool
		if err = tx.QueryRow(r.Context(), `SELECT EXISTS(SELECT 1 FROM venues WHERE id=$1)`, venueID).Scan(&exists); err != nil {
			internal(w, err)
			return
		}
		if !exists {
			writeError(w, http.StatusNotFound, "Venue not found")
			return
		}
	}
	if homeTeamID != "" {
		var teamInCompetition bool
		if err = tx.QueryRow(r.Context(), `SELECT EXISTS(SELECT 1 FROM competition_teams WHERE "competitionId"=$1 AND "teamId"=$2)`, competitionID, homeTeamID).Scan(&teamInCompetition); err != nil {
			internal(w, err)
			return
		}
		if !teamInCompetition {
			writeError(w, http.StatusBadRequest, "Select a team that belongs to this competition")
			return
		}
	}
	if _, err = tx.Exec(r.Context(), `INSERT INTO competition_venues("competitionId","venueId") VALUES($1,$2)`, competitionID, venueID); err != nil {
		writeError(w, http.StatusConflict, "This venue is already in the competition")
		return
	}
	if homeTeamID != "" {
		var currentTeamID, currentTeamName *string
		if err = tx.QueryRow(r.Context(), `SELECT v."homeTeamId",t.name FROM venues v LEFT JOIN teams t ON t.id=v."homeTeamId" WHERE v.id=$1 FOR UPDATE OF v`, venueID).Scan(&currentTeamID, &currentTeamName); err != nil {
			internal(w, err)
			return
		}
		if currentTeamID != nil && *currentTeamID != homeTeamID {
			writeError(w, http.StatusConflict, fmt.Sprintf("This venue is already assigned to %s", *currentTeamName))
			return
		}
		if _, err = tx.Exec(r.Context(), `UPDATE venues SET "homeTeamId"=NULL,"updatedAt"=now() WHERE "homeTeamId"=$1 AND id<>$2`, homeTeamID, venueID); err != nil {
			internal(w, err)
			return
		}
		if _, err = tx.Exec(r.Context(), `UPDATE venues SET "homeTeamId"=$1,"updatedAt"=now() WHERE id=$2`, homeTeamID, venueID); err != nil {
			internal(w, err)
			return
		}
	}
	if err = tx.Commit(r.Context()); err != nil {
		internal(w, err)
		return
	}
	var name string
	if err = s.db.QueryRow(r.Context(), `SELECT name FROM venues WHERE id=$1`, venueID).Scan(&name); err != nil {
		internal(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"id": venueID, "name": name, "homeTeamId": nullIfEmpty(homeTeamID)})
}
func (s *Server) teamMembers(r *http.Request, id string) ([]map[string]any, error) {
	rows, e := s.db.Query(r.Context(), `SELECT t.id,t.name,t.abbreviation,t.logo,t."createdAt",t."updatedAt",v.id,v.name FROM teams t JOIN competition_teams m ON m."teamId"=t.id LEFT JOIN venues v ON v."homeTeamId"=t.id AND EXISTS(SELECT 1 FROM competition_venues cv WHERE cv."competitionId"=m."competitionId" AND cv."venueId"=v.id) WHERE m."competitionId"=$1 ORDER BY t.name`, id)
	if e != nil {
		return nil, e
	}
	defer rows.Close()
	out := []map[string]any{}
	for rows.Next() {
		var id, name string
		var ab, logo any
		var cr, up time.Time
		var venueID, venueName *string
		if e = rows.Scan(&id, &name, &ab, &logo, &cr, &up, &venueID, &venueName); e != nil {
			return nil, e
		}
		var homeVenue any
		if venueID != nil {
			homeVenue = map[string]string{"id": *venueID, "name": *venueName}
		}
		out = append(out, map[string]any{"id": id, "name": name, "abbreviation": ab, "logo": logo, "createdAt": cr, "updatedAt": up, "homeVenue": homeVenue})
	}
	return out, rows.Err()
}

func (s *Server) setTeamHomeVenue(w http.ResponseWriter, r *http.Request, c *userClaims, competitionID, teamID string) {
	if r.Method != http.MethodPatch {
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}
	m, err := body(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request")
		return
	}
	venueID := str(m, "venueId")
	var exists bool
	if err = s.db.QueryRow(r.Context(), `SELECT EXISTS(SELECT 1 FROM competition_teams WHERE "competitionId"=$1 AND "teamId"=$2)`, competitionID, teamID).Scan(&exists); err != nil {
		internal(w, err)
		return
	}
	if !exists {
		writeError(w, http.StatusNotFound, "Team not found in this competition")
		return
	}
	if venueID != "" {
		if err = s.db.QueryRow(r.Context(), `SELECT EXISTS(SELECT 1 FROM competition_venues WHERE "competitionId"=$1 AND "venueId"=$2)`, competitionID, venueID).Scan(&exists); err != nil {
			internal(w, err)
			return
		}
		if !exists {
			writeError(w, http.StatusBadRequest, "Add this venue to the competition before assigning it as a home venue")
			return
		}
	}
	tx, err := s.db.Begin(r.Context())
	if err != nil {
		internal(w, err)
		return
	}
	defer tx.Rollback(r.Context())
	if venueID != "" {
		var currentTeam *string
		if err = tx.QueryRow(r.Context(), `SELECT "homeTeamId" FROM venues WHERE id=$1 FOR UPDATE`, venueID).Scan(&currentTeam); err != nil {
			writeError(w, http.StatusNotFound, "Venue not found")
			return
		}
		if currentTeam != nil && *currentTeam != teamID {
			writeError(w, http.StatusConflict, "This venue is already assigned as another team's home venue")
			return
		}
		if _, err = tx.Exec(r.Context(), `UPDATE venues SET "homeTeamId"=NULL,"updatedAt"=now() WHERE "homeTeamId"=$1 AND id<>$2`, teamID, venueID); err != nil {
			internal(w, err)
			return
		}
		if _, err = tx.Exec(r.Context(), `UPDATE venues SET "homeTeamId"=$1,"updatedAt"=now() WHERE id=$2`, teamID, venueID); err != nil {
			internal(w, err)
			return
		}
	} else if _, err = tx.Exec(r.Context(), `UPDATE venues SET "homeTeamId"=NULL,"updatedAt"=now() WHERE "homeTeamId"=$1`, teamID); err != nil {
		internal(w, err)
		return
	}
	if err = tx.Commit(r.Context()); err != nil {
		internal(w, err)
		return
	}
	s.auditAdd(r, c, "Team", teamID, "SET_HOME_VENUE", map[string]string{"venueId": venueID})
	writeJSON(w, http.StatusOK, map[string]bool{"success": true})
}
func (s *Server) venueMembers(r *http.Request, id string) ([]map[string]any, error) {
	rows, e := s.db.Query(r.Context(), `SELECT v.id,v.name,v.location,v.capacity,v."homeTeamId",t.name FROM venues v JOIN competition_venues m ON m."venueId"=v.id LEFT JOIN teams t ON t.id=v."homeTeamId" WHERE m."competitionId"=$1 ORDER BY v.name`, id)
	if e != nil {
		return nil, e
	}
	defer rows.Close()
	out := []map[string]any{}
	for rows.Next() {
		var id, name string
		var loc, ht, tn any
		var cap *int
		if e = rows.Scan(&id, &name, &loc, &cap, &ht, &tn); e != nil {
			return nil, e
		}
		out = append(out, map[string]any{"id": id, "name": name, "location": loc, "capacity": cap, "homeTeamId": ht, "homeTeam": mapNullableName(tn)})
	}
	return out, rows.Err()
}
func (s *Server) removeMember(w http.ResponseWriter, r *http.Request, c *userClaims, id, memberID, kind string) {
	if r.Method != "DELETE" {
		writeError(w, 405, "Method not allowed")
		return
	}
	if kind == "teams" {
		var fixtures int
		_ = s.db.QueryRow(r.Context(), `SELECT count(*) FROM fixtures WHERE "competitionId"=$1 AND ("homeTeamId"=$2 OR "awayTeamId"=$2)`, id, memberID).Scan(&fixtures)
		if fixtures > 0 {
			writeError(w, 409, "Cannot remove a team after fixtures have been generated")
			return
		}
		tx, e := s.db.Begin(r.Context())
		if e != nil {
			internal(w, e)
			return
		}
		defer tx.Rollback(r.Context())
		_, e = tx.Exec(r.Context(), `UPDATE venues SET "homeTeamId"=NULL,"updatedAt"=now() WHERE "homeTeamId"=$1`, memberID)
		if e == nil {
			_, e = tx.Exec(r.Context(), `DELETE FROM competition_teams WHERE "competitionId"=$1 AND "teamId"=$2`, id, memberID)
		}
		if e != nil {
			internal(w, e)
			return
		}
		if e = tx.Commit(r.Context()); e != nil {
			internal(w, e)
			return
		}
		writeJSON(w, 200, map[string]bool{"success": true})
		return
	}
	_, e := s.db.Exec(r.Context(), `DELETE FROM competition_venues WHERE "competitionId"=$1 AND "venueId"=$2`, id, memberID)
	if e != nil {
		internal(w, e)
		return
	}
	writeJSON(w, 200, map[string]bool{"success": true})
}

// fixtures and their subroutes are implemented in fixtures.go.
func (s *Server) audit(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != "GET" {
		writeError(w, 405, "Method not allowed")
		return
	}
	rows, e := s.db.Query(r.Context(), `SELECT a.id,a."entityType",a."entityId",a.action,a.changes,a."performedBy",a."createdAt",u.email FROM audit_logs a JOIN users u ON u.id=a."performedBy" WHERE a."entityId"=$1 OR a."entityId" IN (SELECT id FROM fixtures WHERE "competitionId"=$1) ORDER BY a."createdAt" DESC`, id)
	if e != nil {
		internal(w, e)
		return
	}
	defer rows.Close()
	out := []map[string]any{}
	for rows.Next() {
		var aid, typ, eid, action, by, email string
		var changes any
		var at time.Time
		if e = rows.Scan(&aid, &typ, &eid, &action, &changes, &by, &at, &email); e != nil {
			internal(w, e)
			return
		}
		out = append(out, map[string]any{"id": aid, "entityType": typ, "entityId": eid, "action": action, "changes": changes, "performedBy": by, "createdAt": at, "user": map[string]string{"email": email}})
	}
	writeJSON(w, 200, out)
}
