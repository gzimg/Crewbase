import type { NextApiRequest, NextApiResponse } from "next"
import { withPermissionCheck } from "@/utils/permissionsManager"
import prisma from "@/utils/database"
import crypto from "crypto"

type Data = {
	success: boolean
	error?: string
	apiKey?: {
		id: string
		name: string
		key: string
		expiresAt: Date | null
	}
}

export default withPermissionCheck(handler, "manage_apikeys")

export async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
	if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" })
	if (!req.session.userid) return res.status(401).json({ success: false, error: "Not authenticated" })
	if (!req.query.id) return res.status(400).json({ success: false, error: "Missing workspace ID" })

	const workspaceId = Number.parseInt(req.query.id as string)
	const { name, expiresIn } = req.body

	if (!name) return res.status(400).json({ success: false, error: "API key name is required" })

	try {
		const apiKeyCount = await prisma.apiKey.count({
			where: { workspaceGroupId: workspaceId },
		})
		// API keys depend on the workspace's Crewbase plan
		const { getPlanDefinition, planUpgradeError } = await import("@/utils/plans")
		const { def } = await getPlanDefinition(workspaceId)
		if (!def.features.includes("api")) {
			return res.status(403).json(planUpgradeError("The public API") as any)
		}
		const keyLimit = Math.min(def.limits.apiKeys, 50)
		if (apiKeyCount >= keyLimit) {
			return res.status(400).json({ success: false, error: `This workspace’s ${def.name} plan allows up to ${keyLimit} API key${keyLimit === 1 ? "" : "s"}` })
		}

		// Generate a secure API key
		const apiKeyValue = `firefli_${crypto.randomBytes(32).toString("hex")}`

		// Calculate expiration date if provided
		let expiresAt = null
		if (expiresIn && expiresIn !== "never") {
			const now = new Date()
			switch (expiresIn) {
				case "30days":
					expiresAt = new Date(now.setDate(now.getDate() + 30))
					break
				case "90days":
					expiresAt = new Date(now.setDate(now.getDate() + 90))
					break
				case "1year":
					expiresAt = new Date(now.setFullYear(now.getFullYear() + 1))
					break
			}
		}

		const apiKey = await prisma.apiKey.create({
		data: {
			id: crypto.randomUUID(),
			name,
			key: apiKeyValue,
			expiresAt,
			workspaceGroupId: workspaceId,
			createdById: req.session.userid,
		},
		})

		return res.status(200).json({
			success: true,
			apiKey: {
				id: apiKey.id,
				name: apiKey.name,
				key: apiKey.key,
				expiresAt: apiKey.expiresAt,
			},
		})
	} catch (error) {
		console.error("Error creating API key:", error)
		return res.status(500).json({ success: false, error: "Failed to create API key" })
	}
}
