// A joined set of tables is redundant when it still seats the party after dropping its smallest table.
export function hasRedundantTable(seats: number[], partySize: number): boolean {
  return seats.length > 1 && seats.reduce((a, b) => a + b, 0) - Math.min(...seats) >= partySize
}
