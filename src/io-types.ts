export interface Request {
  url: string
  method?: string
  body?: any
}

export interface Response {
  ok?: boolean
  status?: number
  error?: string
}
