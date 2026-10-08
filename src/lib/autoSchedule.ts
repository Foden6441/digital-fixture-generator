export interface AutoScheduleFixture {
  id: string
  matchday: number | null
}

export interface FixtureScheduleAssignment {
  fixtureId: string
  matchDate: string
  kickoffTime: string
}

const kickoffSlots = Array.from({ length: 16 }, (_, index) => {
  const minutesAfterStart = index * 30
  const totalMinutes = 14 * 60 + 30 + minutesAfterStart
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
})

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setUTCDate(result.getUTCDate() + days)
  return result
}

function getEligibleWeekends(startDate: Date, endDate: Date): Date[] {
  const weekends: Date[] = []
  let friday = new Date(Date.UTC(
    startDate.getUTCFullYear(),
    startDate.getUTCMonth(),
    startDate.getUTCDate()
  ))

  while (friday.getUTCDay() !== 5) {
    friday = addDays(friday, 1)
  }

  while (addDays(friday, 2) <= endDate) {
    weekends.push(friday)
    friday = addDays(friday, 7)
  }

  return weekends
}

function getEligibleWeekdays(startDate: Date, endDate: Date, rounds: number): Date[] {
  const weekdays: Date[] = []
  let currentDate = new Date(Date.UTC(
    startDate.getUTCFullYear(),
    startDate.getUTCMonth(),
    startDate.getUTCDate()
  ))

  while (weekdays.length < rounds && currentDate <= endDate) {
    weekdays.push(new Date(currentDate))
    currentDate = addDays(currentDate, 2)
  }

  return weekdays
}

export function createAutomaticSchedule(
  fixtures: AutoScheduleFixture[],
  startDate: Date,
  endDate: Date,
  isKnockout = false
): FixtureScheduleAssignment[] {
  if (fixtures.length === 0) {
    throw new Error("Generate fixtures before automating the schedule")
  }
  if (startDate > endDate) {
    throw new Error("The competition start date must be before its end date")
  }
  if (fixtures.some((fixture) => fixture.matchday === null)) {
    throw new Error("Every fixture must have a matchday before scheduling")
  }

  const matchdays = [...new Set(fixtures.map((fixture) => fixture.matchday!))]
    .sort((first, second) => first - second)

  let scheduleDates: Date[]

  if (isKnockout) {
    scheduleDates = getEligibleWeekdays(startDate, endDate, matchdays.length)
    if (scheduleDates.length < matchdays.length) {
      throw new Error(
        `The competition date range doesn't have enough days for ${matchdays.length} knockout rounds`
      )
    }
  } else {
    scheduleDates = getEligibleWeekends(startDate, endDate)
    if (scheduleDates.length < matchdays.length) {
      throw new Error(
        `The competition date range has ${scheduleDates.length} full weekends, but ${matchdays.length} matchdays need scheduling`
      )
    }
  }

  const assignments: FixtureScheduleAssignment[] = []
  const finalMatchday = matchdays[matchdays.length - 1]

  for (const [matchdayIndex, matchday] of matchdays.entries()) {
    const matchdayFixtures = fixtures.filter((fixture) => fixture.matchday === matchday)
    const scheduleDate = scheduleDates[matchdayIndex]

    if (isKnockout) {
      const matchDate = dateKey(scheduleDate)
      assignments.push(...matchdayFixtures.map((fixture) => ({
        fixtureId: fixture.id,
        matchDate,
        kickoffTime: "19:00"
      })))
    } else {
      const friday = scheduleDate

      if (matchday === finalMatchday) {
        const finalDate = dateKey(addDays(friday, 2))
        assignments.push(...matchdayFixtures.map((fixture) => ({
          fixtureId: fixture.id,
          matchDate: finalDate,
          kickoffTime: "16:00"
        })))
        continue
      }

      const fridayFixture = matchdayFixtures[0]
      assignments.push({
        fixtureId: fridayFixture.id,
        matchDate: dateKey(friday),
        kickoffTime: "19:00"
      })

      for (const [fixtureIndex, fixture] of matchdayFixtures.slice(1).entries()) {
        const dayOffset = fixtureIndex % 2 === 0 ? 1 : 2
        const date = dateKey(addDays(friday, dayOffset))
        const matchesOnSameDay = Math.floor(fixtureIndex / 2)
        const kickoffTime = kickoffSlots[matchesOnSameDay]

        if (!kickoffTime) {
          throw new Error("Too many matches fall on one day for the available kickoff window")
        }

        assignments.push({
          fixtureId: fixture.id,
          matchDate: date,
          kickoffTime
        })
      }
    }
  }

  return assignments
}
