package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sort"
	"strings"
	"time"
)

type teamPair struct{ id, name string }
type generatedFixture struct {
	home, away string
	day, group int
}

func (s *Server) fixtures(w http.ResponseWriter, r *http.Request, c *userClaims, cid string) {
	switch r.Method {
	case "GET":
		out, e := s.fixtureList(r, cid)
		if e != nil {
			internal(w, e)
			return
		}
		writeJSON(w, 200, out)
	case "DELETE":
		_, e := s.db.Exec(r.Context(), `DELETE FROM fixtures WHERE "competitionId"=$1`, cid)
		if e != nil {
			internal(w, e)
			return
		}
		writeJSON(w, 200, map[string]bool{"success": true})
	default:
		writeError(w, 405, "Method not allowed")
	}
}
func (s *Server) fixtureList(r *http.Request, cid string) ([]map[string]any, error) {
	rows, e := s.db.Query(r.Context(), `SELECT f.id,f."competitionId",f."homeTeamId",f."awayTeamId",f."venueId",f."matchDate",f."kickoffTime",f.matchday,f."groupNumber",f.status,f.notes,f.version,f."createdAt",f."updatedAt",h.name,a.name,v.name FROM fixtures f JOIN teams h ON h.id=f."homeTeamId" JOIN teams a ON a.id=f."awayTeamId" LEFT JOIN venues v ON v.id=f."venueId" WHERE f."competitionId"=$1 ORDER BY f.matchday,f."matchDate"`, cid)
	if e != nil {
		return nil, e
	}
	defer rows.Close()
	out := []map[string]any{}
	for rows.Next() {
		var id, comp, home, away, status string
		var venue, matchDate, kickoff, notes, group any
		var day, version int
		var cr, up time.Time
		var hn, an string
		var vn *string
		if e = rows.Scan(&id, &comp, &home, &away, &venue, &matchDate, &kickoff, &day, &group, &status, &notes, &version, &cr, &up, &hn, &an, &vn); e != nil {
			return nil, e
		}
		out = append(out, map[string]any{"id": id, "competitionId": comp, "homeTeamId": home, "awayTeamId": away, "venueId": venue, "matchDate": matchDate, "kickoffTime": kickoff, "matchday": day, "groupNumber": group, "status": status, "notes": notes, "version": version, "createdAt": cr, "updatedAt": up, "homeTeam": map[string]string{"id": home, "name": hn}, "awayTeam": map[string]string{"id": away, "name": an}, "venue": nullableVenue(venue, vn)})
	}
	return out, rows.Err()
}
func nullableVenue(id any, name *string) any {
	if id == nil {
		return nil
	}
	return map[string]any{"id": id, "name": name}
}
func (s *Server) fixtureActions(w http.ResponseWriter, r *http.Request, c *userClaims, cid string, tail []string, fixtureID string) {
	if fixtureID == "generate" && len(tail) == 1 && r.Method == "POST" {
		s.generate(w, r, c, cid)
		return
	}
	if fixtureID == "auto-schedule" && r.Method == "POST" {
		s.autoSchedulePlan(w, r, c, cid)
		return
	}
	if fixtureID == "check-conflicts" && r.Method == "POST" {
		s.checkConflicts(w, r, cid)
		return
	}
	if fixtureID == "next-round" && r.Method == "POST" {
		s.nextKnockoutRound(w, r, c, cid)
		return
	}
	if len(tail) > 1 && tail[1] == "reschedule" && r.Method == "POST" {
		s.reschedule(w, r, c, cid, fixtureID)
		return
	}
	if len(tail) != 1 {
		writeError(w, 404, "Not found")
		return
	}
	switch r.Method {
	case "PATCH":
		m, e := body(r)
		if e != nil {
			writeError(w, 400, "Invalid request")
			return
		}
		_, e = s.db.Exec(r.Context(), `UPDATE fixtures SET "matchDate"=CASE WHEN $2 THEN NULLIF($3,'')::date ELSE "matchDate" END,"kickoffTime"=COALESCE($4,"kickoffTime"),"venueId"=CASE WHEN $5 THEN NULLIF($6,'') ELSE "venueId" END,status=CASE WHEN $7='' THEN status ELSE $7::"FixtureStatus" END,notes=COALESCE($8,notes),version=version+1,"updatedAt"=now() WHERE id=$1 AND "competitionId"=$9`, fixtureID, m["matchDate"] != nil, str(m, "matchDate"), nullIfEmpty(str(m, "kickoffTime")), m["venueId"] != nil, str(m, "venueId"), str(m, "status"), nullIfEmpty(str(m, "notes")), cid)
		if e != nil {
			internal(w, e)
			return
		}
		s.auditAdd(r, c, "Fixture", fixtureID, "UPDATE", m)
		writeJSON(w, 200, map[string]bool{"success": true})
	default:
		writeError(w, 405, "Method not allowed")
	}
}
func (s *Server) generate(w http.ResponseWriter, r *http.Request, c *userClaims, cid string) {
	var format string
	var groupSize int
	e := s.db.QueryRow(r.Context(), `SELECT format,"groupSize" FROM competitions WHERE id=$1`, cid).Scan(&format, &groupSize)
	if e != nil {
		writeError(w, 404, "Competition not found")
		return
	}
	var existing int
	_ = s.db.QueryRow(r.Context(), `SELECT count(*) FROM fixtures WHERE "competitionId"=$1`, cid).Scan(&existing)
	if existing > 0 {
		writeError(w, 400, "Fixtures already exist. Clear them first to regenerate.")
		return
	}
	rows, e := s.db.Query(r.Context(), `SELECT t.id,t.name FROM teams t JOIN competition_teams ct ON ct."teamId"=t.id WHERE ct."competitionId"=$1 ORDER BY t.name`, cid)
	if e != nil {
		internal(w, e)
		return
	}
	teams := []teamPair{}
	for rows.Next() {
		var t teamPair
		if e = rows.Scan(&t.id, &t.name); e != nil {
			rows.Close()
			internal(w, e)
			return
		}
		teams = append(teams, t)
	}
	rows.Close()
	gen, e := makeFixtures(teams, format, groupSize)
	if e != nil {
		writeError(w, 400, e.Error())
		return
	}
	tx, e := s.db.Begin(r.Context())
	if e != nil {
		internal(w, e)
		return
	}
	defer tx.Rollback(r.Context())
	for _, f := range gen {
		_, e = tx.Exec(r.Context(), `INSERT INTO fixtures(id,"competitionId","homeTeamId","awayTeamId",matchday,"groupNumber") VALUES($1,$2,$3,$4,$5,NULLIF($6,0))`, newID(), cid, f.home, f.away, f.day, f.group)
		if e != nil {
			internal(w, e)
			return
		}
	}
	if e = tx.Commit(r.Context()); e != nil {
		internal(w, e)
		return
	}
	s.auditAdd(r, c, "Competition", cid, "GENERATE_FIXTURES", map[string]any{"format": format, "teamCount": len(teams), "fixtureCount": len(gen)})
	writeJSON(w, 200, map[string]any{"success": true, "fixtureCount": len(gen)})
}
func makeFixtures(teams []teamPair, format string, groupSize int) ([]generatedFixture, error) {
	if len(teams) < 2 {
		return nil, fmt.Errorf("At least 2 teams are required to generate fixtures")
	}
	if format == "SINGLE_ROUND_ROBIN" || format == "DOUBLE_ROUND_ROBIN" {
		if len(teams)%2 != 0 {
			return nil, fmt.Errorf("Round-robin requires an even number of teams")
		}
		first := roundRobin(teams)
		if format == "SINGLE_ROUND_ROBIN" {
			return first, nil
		}
		out := append([]generatedFixture{}, first...)
		for _, f := range first {
			out = append(out, generatedFixture{home: f.away, away: f.home, day: f.day + len(teams) - 1})
		}
		return out, nil
	}
	if format == "GROUP_STAGE" {
		if groupSize < 3 || groupSize > 6 {
			return nil, fmt.Errorf("Group stage requires 3 to 6 teams per group")
		}
		n := (len(teams) + groupSize - 1) / groupSize
		groups := make([][]teamPair, n)
		for i, t := range teams {
			groups[i%n] = append(groups[i%n], t)
		}
		out := []generatedFixture{}
		for gi, g := range groups {
			if len(g) < 2 {
				continue
			}
			for _, f := range roundRobin(g) {
				f.group = gi + 1
				out = append(out, f)
			}
		}
		return out, nil
	}
	if format == "KNOCKOUT" {
		if len(teams)%2 != 0 {
			return nil, fmt.Errorf("Knockout format requires an even number of teams")
		}
		out := []generatedFixture{}
		for i := 0; i < len(teams); i += 2 {
			out = append(out, generatedFixture{home: teams[i].id, away: teams[i+1].id, day: 1})
		}
		return out, nil
	}
	return nil, fmt.Errorf("Unsupported competition format")
}
func roundRobin(teams []teamPair) []generatedFixture {
	rot := append([]teamPair{}, teams...)
	if len(rot)%2 != 0 {
		rot = append(rot, teamPair{})
	}
	out := []generatedFixture{}
	for rd := 0; rd < len(rot)-1; rd++ {
		for i := 0; i < len(rot)/2; i++ {
			home, away := rot[i], rot[len(rot)-1-i]
			if home.id != "" && away.id != "" {
				out = append(out, generatedFixture{home: home.id, away: away.id, day: rd + 1})
			}
		}
		rot = append([]teamPair{rot[0], rot[len(rot)-1]}, rot[1:len(rot)-1]...)
	}
	return out
}
func (s *Server) checkConflicts(w http.ResponseWriter, r *http.Request, cid string) {
	m, e := body(r)
	if e != nil {
		writeError(w, 400, "Invalid request")
		return
	}
	id := str(m, "fixtureId")
	date := str(m, "matchDate")
	timev := str(m, "kickoffTime")
	venue := str(m, "venueId")
	var home, away string
	e = s.db.QueryRow(r.Context(), `SELECT "homeTeamId","awayTeamId" FROM fixtures WHERE id=$1 AND "competitionId"=$2`, id, cid).Scan(&home, &away)
	if e != nil {
		writeError(w, 404, "Fixture not found")
		return
	}
	rows, e := s.db.Query(r.Context(), `SELECT h.name,a.name,v.name FROM fixtures f JOIN teams h ON h.id=f."homeTeamId" JOIN teams a ON a.id=f."awayTeamId" LEFT JOIN venues v ON v.id=f."venueId" WHERE f."competitionId"=$1 AND f.id<>$2 AND f."matchDate"=$3::date AND f."kickoffTime"=$4 AND f.status<>'CANCELLED' AND ((f."venueId"=$5 AND $5<>'') OR f."homeTeamId" IN($6,$7) OR f."awayTeamId" IN($6,$7))`, cid, id, date, timev, venue, home, away)
	if e != nil {
		internal(w, e)
		return
	}
	defer rows.Close()
	conf := []string{}
	for rows.Next() {
		var h, a string
		var v *string
		if e = rows.Scan(&h, &a, &v); e != nil {
			internal(w, e)
			return
		}
		if v != nil && venue != "" {
			conf = append(conf, fmt.Sprintf("Venue conflict: %s vs %s is already scheduled at %s", h, a, *v))
		} else {
			conf = append(conf, fmt.Sprintf("Team conflict: %s vs %s is already scheduled at this time", h, a))
		}
	}
	writeJSON(w, 200, map[string]any{"conflicts": conf})
}
func (s *Server) reschedule(w http.ResponseWriter, r *http.Request, c *userClaims, cid, oldID string) {
	m, e := body(r)
	if e != nil {
		writeError(w, 400, "Invalid request")
		return
	}
	var home, away string
	var venue, kickoff any
	var day int
	var oldDate *time.Time
	e = s.db.QueryRow(r.Context(), `SELECT "homeTeamId","awayTeamId","venueId","kickoffTime",matchday,"matchDate" FROM fixtures WHERE id=$1 AND "competitionId"=$2`, oldID, cid).Scan(&home, &away, &venue, &kickoff, &day, &oldDate)
	if e != nil {
		writeError(w, 404, "Fixture not found")
		return
	}
	id := newID()
	_, e = s.db.Exec(r.Context(), `INSERT INTO fixtures(id,"competitionId","homeTeamId","awayTeamId","venueId","matchDate","kickoffTime",matchday,notes) VALUES($1,$2,$3,$4,COALESCE(NULLIF($5,''),$6),NULLIF($7,'')::date,COALESCE(NULLIF($8,''),$9),$10,$11)`, id, cid, home, away, str(m, "venueId"), venue, str(m, "matchDate"), str(m, "kickoffTime"), kickoff, day, "Rescheduled from original fixture")
	if e != nil {
		internal(w, e)
		return
	}
	s.auditAdd(r, c, "Fixture", id, "RESCHEDULE", map[string]string{"originalFixtureId": oldID})
	writeJSON(w, 201, map[string]string{"id": id})
}
func (s *Server) autoSchedule(w http.ResponseWriter, r *http.Request, c *userClaims, cid string) {
	var start, end, format string
	if e := s.db.QueryRow(r.Context(), `SELECT "startDate"::date::text,"endDate"::date::text,format FROM competitions WHERE id=$1`, cid).Scan(&start, &end, &format); e != nil {
		writeError(w, 404, "Competition not found")
		return
	}
	fixtures, e := s.fixtureList(r, cid)
	if e != nil {
		internal(w, e)
		return
	}
	if len(fixtures) == 0 {
		writeError(w, 400, "Generate fixtures before automating the schedule")
		return
	}
	dates := []time.Time{}
	first, _ := time.Parse("2006-01-02", start)
	last, _ := time.Parse("2006-01-02", end)
	for d := first; !d.After(last); d = d.AddDate(0, 0, 1) {
		if format == "KNOCKOUT" || d.Weekday() == time.Friday {
			dates = append(dates, d)
		}
	}
	matchdays := []int{}
	seen := map[int]bool{}
	for _, f := range fixtures {
		n, ok := f["matchday"].(int)
		if ok && !seen[n] {
			seen[n] = true
			matchdays = append(matchdays, n)
		}
	}
	sort.Ints(matchdays)
	if len(dates) < len(matchdays) {
		writeError(w, 400, "Competition date range is too short for all matchdays")
		return
	}
	schedule := []map[string]string{}
	for _, f := range fixtures {
		day, ok := f["matchday"].(int)
		if !ok {
			continue
		}
		idx := sort.SearchInts(matchdays, day)
		d := dates[idx]
		if format != "KNOCKOUT" {
			d = d.AddDate(0, 0, 2)
		}
		stamp := d.Format("2006-01-02")
		kickoff := "16:00"
		if format == "KNOCKOUT" {
			kickoff = "19:00"
		}
		_, e = s.db.Exec(r.Context(), `UPDATE fixtures SET "matchDate"=$2::date,"kickoffTime"=$3,version=version+1,"updatedAt"=now() WHERE id=$1`, f["id"], stamp, kickoff)
		if e != nil {
			internal(w, e)
			return
		}
		schedule = append(schedule, map[string]string{"fixtureId": f["id"].(string), "matchDate": stamp, "kickoffTime": kickoff})
	}
	s.auditAdd(r, c, "Competition", cid, "AUTO_SCHEDULE_FIXTURES", map[string]int{"fixtureCount": len(schedule)})
	writeJSON(w, 200, map[string]any{"success": true, "fixtureCount": len(schedule), "schedule": schedule})
}

type schedulePlan struct{ fixtureID, date, kickoff, venueID string }

func (s *Server) autoSchedulePlan(w http.ResponseWriter, r *http.Request, c *userClaims, cid string) {
	var startText, endText, format string
	if e := s.db.QueryRow(r.Context(), `SELECT "startDate"::date::text,"endDate"::date::text,format FROM competitions WHERE id=$1`, cid).Scan(&startText, &endText, &format); e != nil {
		writeError(w, 404, "Competition not found")
		return
	}
	start, e := time.Parse("2006-01-02", startText)
	if e != nil {
		internal(w, e)
		return
	}
	end, e := time.Parse("2006-01-02", endText)
	if e != nil {
		internal(w, e)
		return
	}
	fixtures, e := s.fixtureList(r, cid)
	if e != nil {
		internal(w, e)
		return
	}
	if len(fixtures) == 0 {
		writeError(w, 400, "Generate fixtures before automating the schedule")
		return
	}
	matchdays := []int{}
	seen := map[int]bool{}
	byDay := map[int][]map[string]any{}
	for _, f := range fixtures {
		day, ok := f["matchday"].(int)
		if !ok {
			writeError(w, 400, "Every fixture must have a matchday before scheduling")
			return
		}
		if !seen[day] {
			seen[day] = true
			matchdays = append(matchdays, day)
		}
		byDay[day] = append(byDay[day], f)
	}
	sort.Ints(matchdays)
	dates := []time.Time{}
	if format == "KNOCKOUT" {
		for d := start; !d.After(end); d = d.AddDate(0, 0, 2) {
			dates = append(dates, d)
		}
	} else {
		friday := start
		for friday.Weekday() != time.Friday {
			friday = friday.AddDate(0, 0, 1)
		}
		for friday.AddDate(0, 0, 2).Compare(end) <= 0 {
			dates = append(dates, friday)
			friday = friday.AddDate(0, 0, 7)
		}
	}
	if len(dates) < len(matchdays) {
		writeError(w, 400, fmt.Sprintf("Competition date range has %d eligible dates, but %d matchdays need scheduling", len(dates), len(matchdays)))
		return
	}
	plans := []schedulePlan{}
	finalDay := matchdays[len(matchdays)-1]
	for index, day := range matchdays {
		games := byDay[day]
		date := dates[index]
		if format == "KNOCKOUT" {
			for _, f := range games {
				plans = append(plans, schedulePlan{fixtureID: f["id"].(string), date: date.Format("2006-01-02"), kickoff: "19:00"})
			}
			continue
		}
		if day == finalDay {
			stamp := date.AddDate(0, 0, 2).Format("2006-01-02")
			for _, f := range games {
				plans = append(plans, schedulePlan{fixtureID: f["id"].(string), date: stamp, kickoff: "16:00"})
			}
			continue
		}
		for i, f := range games {
			plan := schedulePlan{fixtureID: f["id"].(string)}
			if i == 0 {
				plan.date = date.Format("2006-01-02")
				plan.kickoff = "19:00"
			} else {
				dayOffset := 1
				if i%2 == 0 {
					dayOffset = 2
				}
				plan.date = date.AddDate(0, 0, dayOffset).Format("2006-01-02")
				slotsOnDay := (i+1)/2 - 1
				if slotsOnDay > 15 {
					writeError(w, 400, "Too many matches fall on one day for the available kickoff window")
					return
				}
				minutes := 14*60 + 30 + slotsOnDay*30
				plan.kickoff = fmt.Sprintf("%02d:%02d", minutes/60, minutes%60)
			}
			var venueID string
			err := s.db.QueryRow(r.Context(), `SELECT v.id FROM fixtures f JOIN venues v ON v."homeTeamId"=f."homeTeamId" JOIN competition_venues cv ON cv."venueId"=v.id AND cv."competitionId"=f."competitionId" WHERE f.id=$1 LIMIT 1`, plan.fixtureID).Scan(&venueID)
			if err == nil {
				plan.venueID = venueID
			}
			plans = append(plans, plan)
		}
	}
	tx, e := s.db.Begin(r.Context())
	if e != nil {
		internal(w, e)
		return
	}
	defer tx.Rollback(r.Context())
	result := make([]map[string]string, 0, len(plans))
	for _, p := range plans {
		_, e = tx.Exec(r.Context(), `UPDATE fixtures SET "matchDate"=$2::date,"kickoffTime"=$3,"venueId"=COALESCE(NULLIF($4,''),"venueId"),version=version+1,"updatedAt"=now() WHERE id=$1`, p.fixtureID, p.date, p.kickoff, p.venueID)
		if e != nil {
			internal(w, e)
			return
		}
		result = append(result, map[string]string{"fixtureId": p.fixtureID, "matchDate": p.date, "kickoffTime": p.kickoff})
	}
	changes := map[string]int{"fixtureCount": len(plans), "matchdays": len(matchdays)}
	blob, _ := json.Marshal(changes)
	_, e = tx.Exec(r.Context(), `INSERT INTO audit_logs(id,"entityType","entityId",action,changes,"performedBy") VALUES($1,'Competition',$2,'AUTO_SCHEDULE_FIXTURES',$3,$4)`, newID(), cid, string(blob), c.UserID)
	if e != nil {
		internal(w, e)
		return
	}
	if e = tx.Commit(r.Context()); e != nil {
		internal(w, e)
		return
	}
	writeJSON(w, 200, map[string]any{"success": true, "fixtureCount": len(plans), "schedule": result})
}

func (s *Server) nextKnockoutRound(w http.ResponseWriter, r *http.Request, c *userClaims, cid string) {
	m, e := body(r)
	if e != nil {
		writeError(w, 400, "Invalid request")
		return
	}
	ids := []string{}
	for _, v := range anySlice(m["qualifiedTeamIds"]) {
		if id, ok := v.(string); ok && id != "" {
			ids = append(ids, id)
		}
	}
	if len(ids) < 2 || len(ids)%2 != 0 {
		writeError(w, 400, "Qualified teams must be an even number of at least 2")
		return
	}
	var format string
	if e = s.db.QueryRow(r.Context(), `SELECT format FROM competitions WHERE id=$1`, cid).Scan(&format); e != nil || format != "KNOCKOUT" {
		writeError(w, 400, "This feature is only available for knockout competitions")
		return
	}
	var day int
	_ = s.db.QueryRow(r.Context(), `SELECT COALESCE(MAX(matchday),0)+1 FROM fixtures WHERE "competitionId"=$1`, cid).Scan(&day)
	tx, e := s.db.Begin(r.Context())
	if e != nil {
		internal(w, e)
		return
	}
	defer tx.Rollback(r.Context())
	created := []map[string]any{}
	for i := 0; i < len(ids); i += 2 {
		id := newID()
		_, e = tx.Exec(r.Context(), `INSERT INTO fixtures(id,"competitionId","homeTeamId","awayTeamId",matchday) VALUES($1,$2,$3,$4,$5)`, id, cid, ids[i], ids[i+1], day)
		if e != nil {
			internal(w, e)
			return
		}
		created = append(created, map[string]any{"id": id, "competitionId": cid, "homeTeamId": ids[i], "awayTeamId": ids[i+1], "matchday": day, "status": "SCHEDULED"})
	}
	if e = tx.Commit(r.Context()); e != nil {
		internal(w, e)
		return
	}
	s.auditAdd(r, c, "Competition", cid, "GENERATE_NEXT_KNOCKOUT_ROUND", map[string]any{"matchday": day, "qualifiedTeamIds": ids, "fixtureCount": len(created)})
	writeJSON(w, 200, map[string]any{"success": true, "matchday": day, "fixtures": created})
}

var _ = json.Valid
var _ = strings.TrimSpace
