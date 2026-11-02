export type MentionableMember = {
  userId: string
  fullName: string
}

export type Mention = {
  userId: string
  fullName: string
  start: number
  end: number
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function parseMentions(body: string, members: MentionableMember[]): Mention[] {
  const sortedMembers = [...members].sort(
    (a, b) => b.fullName.length - a.fullName.length,
  )
  const mentions: Mention[] = []

  for (const member of sortedMembers) {
    const pattern = new RegExp(
      `(^|[^A-Za-z0-9])@${escapeRegExp(member.fullName)}(?=$|[^A-Za-z0-9])`,
      'gi',
    )

    for (const match of body.matchAll(pattern)) {
      const prefix = match[1] ?? ''
      const start = (match.index ?? 0) + prefix.length
      mentions.push({
        userId: member.userId,
        fullName: member.fullName,
        start,
        end: start + member.fullName.length + 1,
      })
    }
  }

  return mentions.sort((a, b) => a.start - b.start)
}
