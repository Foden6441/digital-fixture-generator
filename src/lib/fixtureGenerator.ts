export type CompetitionFormat = "SINGLE_ROUND_ROBIN" | "DOUBLE_ROUND_ROBIN" | "KNOCKOUT" | "GROUP_STAGE"

interface Team {
  id: string
  name: string
}

interface Fixture {
  homeTeamId: string
  awayTeamId: string
  matchday: number
  groupNumber?: number
}

export function generateFixtures(
  teams: Team[],
  format: CompetitionFormat,
  groupSize = 4
): Fixture[] {
  if (teams.length < 2) {
    throw new Error("At least 2 teams are required to generate fixtures")
  }

  if (new Set(teams.map((team) => team.id)).size !== teams.length) {
    throw new Error("Each team must have a unique ID")
  }

  if (format === "GROUP_STAGE" && (!Number.isInteger(groupSize) || groupSize < 3 || groupSize > 6)) {
    throw new Error("Group stage requires 3 to 6 teams per group")
  }

  const fixtures: Fixture[] = []
  const teamCount = teams.length

  if (format === "SINGLE_ROUND_ROBIN" || format === "DOUBLE_ROUND_ROBIN") {
    if (teamCount % 2 !== 0) {
      throw new Error("Round-robin requires an even number of teams")
    }

    const firstLeg: Fixture[] = []
    let rotatingTeams = [...teams]

    for (let round = 0; round < teamCount - 1; round++) {
      for (let match = 0; match < teamCount / 2; match++) {
        const homeTeam = rotatingTeams[match]
        const awayTeam = rotatingTeams[teamCount - 1 - match]

        firstLeg.push({
          homeTeamId: homeTeam.id,
          awayTeamId: awayTeam.id,
          matchday: round + 1
        })
      }

      rotatingTeams = [
        rotatingTeams[0],
        rotatingTeams[teamCount - 1],
        ...rotatingTeams.slice(1, teamCount - 1)
      ]
    }

    fixtures.push(...firstLeg)

    if (format === "DOUBLE_ROUND_ROBIN") {
      fixtures.push(...firstLeg.map((fixture) => ({
        homeTeamId: fixture.awayTeamId,
        awayTeamId: fixture.homeTeamId,
        matchday: fixture.matchday + teamCount - 1
      })))
    }
  } else if (format === "GROUP_STAGE") {
    const groupCount = Math.ceil(teamCount / groupSize)
    const groups = Array.from({ length: groupCount }, () => [] as Team[])
    teams.forEach((team, index) => groups[index % groupCount].push(team))

    groups.forEach((group, groupIndex) => {
      const rotatingTeams: Array<Team | null> = [...group]
      if (rotatingTeams.length % 2 !== 0) rotatingTeams.push(null)

      const roundCount = rotatingTeams.length - 1
      let roundTeams = [...rotatingTeams]

      for (let round = 0; round < roundCount; round++) {
        for (let match = 0; match < roundTeams.length / 2; match++) {
          const firstTeam = roundTeams[match]
          const secondTeam = roundTeams[roundTeams.length - 1 - match]
          if (!firstTeam || !secondTeam) continue

          const reverseHomeAway = (round + match + groupIndex) % 2 === 1
          fixtures.push({
            homeTeamId: reverseHomeAway ? secondTeam.id : firstTeam.id,
            awayTeamId: reverseHomeAway ? firstTeam.id : secondTeam.id,
            matchday: round + 1,
            groupNumber: groupIndex + 1
          })
        }

        roundTeams = [
          roundTeams[0],
          roundTeams[roundTeams.length - 1],
          ...roundTeams.slice(1, roundTeams.length - 1)
        ]
      }
    })
  } else if (format === "KNOCKOUT") {
    // Knockout tournament: only generate first round initially
    // Users will add qualified teams to subsequent rounds after previous round is completed
    const matchday = 1
    const matchesInRound = teams.length / 2

    for (let i = 0; i < matchesInRound; i++) {
      fixtures.push({
        homeTeamId: teams[i * 2].id,
        awayTeamId: teams[i * 2 + 1].id,
        matchday
      })
    }
  }

  return fixtures
}

export function validateFixtureGeneration(teams: Team[], format: CompetitionFormat, groupSize = 4): {
  valid: boolean
  error?: string
} {
  if (teams.length < 2) {
    return { valid: false, error: "At least 2 teams are required" }
  }

  if (format === "GROUP_STAGE") {
    if (!Number.isInteger(groupSize) || groupSize < 3 || groupSize > 6) {
      return { valid: false, error: "Group stage requires 3 to 6 teams per group" }
    }
    return { valid: true }
  }

  if (format === "SINGLE_ROUND_ROBIN" || format === "DOUBLE_ROUND_ROBIN") {
    if (teams.length % 2 !== 0) {
      return { valid: false, error: "Round-robin format requires an even number of teams" }
    }
  }

  if (format === "KNOCKOUT") {
    // Knockout works best with power of 2, but we can handle any even number
    if (teams.length % 2 !== 0) {
      return { valid: false, error: "Knockout format requires an even number of teams" }
    }
  }

  return { valid: true }
}
