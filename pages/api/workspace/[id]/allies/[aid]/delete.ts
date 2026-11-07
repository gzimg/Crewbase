// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { fetchworkspace, getConfig, setConfig } from '@/utils/configEngine'
import prisma, { inactivityNotice } from '@/utils/database';
import { withSessionRoute } from '@/lib/withSession'
import { withPermissionCheck } from '@/utils/permissionsManager'
import { getUsername, getThumbnail, getDisplayName } from '@/utils/userinfoEngine'
type Data = {
	success: boolean
	error?: string
	quota?: any
}

export default withPermissionCheck(handler, 'delete_alliances');

export async function handler(
	req: NextApiRequest,
	res: NextApiResponse<Data>
) {
	if (req.method !== 'DELETE') return res.status(405).json({ success: false, error: 'Method not allowed' })
	if (!req.session.userid) return res.status(401).json({ success: false, error: 'Not logged in' });
	if (!req.query.aid) return res.status(400).json({ success: false, error: 'Missing ally id' });
	if (typeof req.query.aid !== 'string') return res.status(400).json({ success: false, error: 'Invalid ally id' })


	try {
		// Only allow deleting alliances that belong to this workspace
		const ally = await prisma.ally.findUnique({ where: { id: String(req.query.aid) }, select: { workspaceGroupId: true } });
		if (!ally || ally.workspaceGroupId !== BigInt(req.query.id as string)) {
			return res.status(404).json({ success: false, error: 'Alliance not found' });
		}
		await prisma.ally.delete({
			where: {
				id: String(req.query.aid)
			}
		});
		

		return res.status(200).json({ success: true });
	} catch (error) {
		console.error(error);
		return res.status(500).json({ success: false, error: "Something went wrong" });
	}
}
