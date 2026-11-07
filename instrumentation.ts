export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    (BigInt.prototype as any).toJSON = function () {
      return this.toString();
    };

    // On Vercel, new server instances start constantly, so closing every open
    // activity session on startup would cut off staff mid-session. There, the
    // /api/cron/close-stale-sessions job handles leftover sessions instead.
    if (!process.env.VERCEL) {
      const { closeActiveSessions } = await import('./utils/closesessions');
      await closeActiveSessions();
    }
    
    if (process.env.NEXT_MULTI?.toLowerCase() === 'true') {
      const prisma = (await import('./utils/database')).default;
      
      console.log("[STARTUP] Starting batch assignment for multi-container mode");
      
      const workspaces = await prisma.workspace.findMany({
        select: { groupId: true }
      });

      if (workspaces.length === 0) {
        console.log("[STARTUP] No workspaces found to assign batches");
      } else {
        const shuffled = [...workspaces].sort(() => Math.random() - 0.5);
        const batchUpdates = shuffled.map((workspace, index) => {
          const batchId = (index % 8) + 1;
          return prisma.workspace.update({
            where: { groupId: workspace.groupId },
            data: { batchId }
          });
        });

        await prisma.$transaction(batchUpdates);
        const distribution = await prisma.workspace.groupBy({
          by: ['batchId'],
          _count: { groupId: true }
        });
        
        console.log("[STARTUP] Batch assignment completed:");
        distribution.forEach(({ batchId, _count }) => {
          console.log(`  Batch ${batchId}: ${_count.groupId} workspaces`);
        });
      }
    }
  }
}
