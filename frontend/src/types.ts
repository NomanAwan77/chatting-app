export type User = {
  _id: string
  name: string
  email: string
}

export type Message = {
  _id: string
  senderId: string
  receiverId: string
  message: string
  createdAt?: string
  updatedAt?: string
}

export type RecentPeer = {
  id: string
  name?: string
}
