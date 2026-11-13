import prisma from "@/utils/database";

/** Staffing is on by default; a workspace can turn it off in Settings → Feature Flags. */
export async function staffingEnabled(groupId: number | bigint): Promise<boolean> {
  const row = await prisma.config.findFirst({ where: { workspaceGroupId: BigInt(groupId), key: "staffing" }, select: { value: true } });
  return (row?.value as any)?.enabled !== false;
}

export async function setStaffingEnabled(groupId: number | bigint, enabled: boolean) {
  const row = await prisma.config.findFirst({ where: { workspaceGroupId: BigInt(groupId), key: "staffing" }, select: { id: true } });
  if (row) await prisma.config.update({ where: { id: row.id }, data: { value: { enabled } } });
  else await prisma.config.create({ data: { workspaceGroupId: BigInt(groupId), key: "staffing", value: { enabled } } });
}
