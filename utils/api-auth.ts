import prisma from "@/utils/database"

// Validate API key for a given workspace
export async function validateApiKey(apiKey: string, workspaceId: string | number) {
  // New keys start with "crewbase_". Keys made before the rename start with "firefli_"
  // and keep working.
  if (!apiKey || !(apiKey.startsWith("crewbase_") || apiKey.startsWith("firefli_"))) return null

  const key = await prisma.apiKey.findUnique({ where: { key: apiKey } })
  if (!key) return null

  if (key.expiresAt && new Date(key.expiresAt) < new Date()) return null

  const numericWorkspaceId = typeof workspaceId === 'string' ? parseInt(workspaceId, 10) : workspaceId
  if (!numericWorkspaceId || key.workspaceGroupId !== BigInt(numericWorkspaceId)) return null

  // Non-blocking lastUsed update
  prisma.apiKey.update({
    where: { id: key.id },
    data: { lastUsed: new Date() }
  }).catch(() => {})

  return key
}
