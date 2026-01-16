export const getReadMenuLabel = (read: boolean) => {
  return read ? 'Mark as unread' : 'Mark as read'
}

export const getSavedMenuLabel = (saved: boolean) => {
  return saved ? 'Remove from Read Later' : 'Read Later'
}
