export interface CurvePoint {
  time: number
  vus: number
}

export interface ThreadGroupCurve {
  name: string
  type: string
  points: CurvePoint[]
}
