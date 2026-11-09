import type { NextPage } from "next";
import { loginState, workspacestate, createWorkspaceModalState } from "@/state";
import { useRecoilState } from "recoil";
import { Menu, Transition, Listbox } from "@headlessui/react";
import { useRouter } from "next/router";
import { IconLogout, IconChevronDown, IconPlus, IconCheck, IconHome, IconHeadset, IconShieldLock, IconUserCircle, IconFlag } from "@tabler/icons-react";
import AnnouncementBanner from "@/components/announcementbanner";
import { PlanBadge } from "@/components/planbadge";

const planBadgeCache = new Map<string, { value: { name: string; color: string }; at: number }>();
import Link from "next/link";
import axios from "axios";
import { clearMe } from "@/lib/me";
import { Fragment, useEffect, useState } from "react";
import ThemeToggle from "./ThemeToggle";
import VerifiedBadge from "./partners";
import { usePartners } from "@/hooks/usePartners";
import Notification from "./notifications";
import HelpWidget from "./helpwidget";

const BG_COLORS = [
  "bg-amber-200",
  "bg-red-300",
  "bg-lime-200",
  "bg-emerald-300",
  "bg-rose-200",
  "bg-green-100",
  "bg-teal-200",
  "bg-yellow-200",
  "bg-red-100",
  "bg-green-300",
  "bg-lime-300",
  "bg-emerald-200",
  "bg-rose-300",
  "bg-amber-300",
  "bg-red-200",
  "bg-green-200",
];


function getRandomBg(userid: number | string, username?: string) {
	const key = `${userid ?? ""}:${username ?? ""}`;
	let hash = 5381;
	for (let i = 0; i < key.length; i++) {
		hash = ((hash << 5) - hash) ^ key.charCodeAt(i);
	}
	const index = (hash >>> 0) % BG_COLORS.length;
	return BG_COLORS[index];
}

const Topbar: NextPage = () => {
	const [login, setLogin] = useRecoilState(loginState);
	const [workspace, setWorkspace] = useRecoilState(workspacestate);
	const [, setCreateWorkspaceModal] = useRecoilState(createWorkspaceModalState);
	const router = useRouter();
	const isInWorkspace = router.pathname.startsWith('/workspace/');
	const [workspacePlan, setWorkspacePlan] = useState<{ name: string; color: string } | null>(null);
	useEffect(() => {
		const id = router.query.id;
		if (!isInWorkspace || !id) {
			setWorkspacePlan(null);
			return;
		}
		// Remember each workspace's plan badge for 5 minutes, so page changes don't refetch it
		const cached = planBadgeCache.get(String(id));
		if (cached && Date.now() - cached.at < 5 * 60_000) {
			setWorkspacePlan(cached.value);
			return;
		}
		axios
			.get(`/api/workspace/${id}/plan`, { params: { lite: 1 } })
			.then((r) => {
				const value = { name: r.data.plan.name, color: r.data.plan.color };
				planBadgeCache.set(String(id), { value, at: Date.now() });
				setWorkspacePlan(value);
			})
			.catch(() => setWorkspacePlan(null));
	}, [isInWorkspace, router.query.id]);
	const { partnerIds } = usePartners();

	async function logout() {
		await axios.post("/api/auth/logout");
		clearMe();
		setLogin({
			userId: 1,
			username: '',
			displayname: '',
			canMakeWorkspace: false,
			thumbnail: '',
			workspaces: [],
			isOwner: false,
			siteRole: null
		});
		router.push('/');
	}

	return (
		<header className="sticky top-0 z-40 bg-white dark:bg-zinc-800">
			<div className="w-full px-3">
				<div className="flex justify-between items-center h-12">
					<div className="flex items-center space-x-3">
						{isInWorkspace && (
							<Listbox
								value={workspace.groupId}
								onChange={(id) => {
									const selected = login.workspaces?.find((ws) => ws.groupId === id)
									if (selected) {
										setWorkspace({
											...workspace,
											groupId: selected.groupId,
											groupName: selected.groupName,
											groupThumbnail: selected.groupThumbnail,
										})
										router.push(`/workspace/${selected.groupId}`)
									}
								}}
							>
								<div className="relative">
									<Listbox.Button className="flex items-center gap-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors">
										<div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
											<img
												src={workspace.groupThumbnail || "/favicon-32x32.png"}
												alt=""
												className="w-6 h-6 rounded object-cover"
											/>
										</div>
										<span className="text-sm font-medium text-zinc-700 dark:text-zinc-200 max-w-[120px] truncate">
											{workspace.groupName}
										</span>
										{partnerIds.includes(workspace.groupId) && <VerifiedBadge className="w-3.5 h-3.5" />}
										<IconChevronDown className="h-3 w-3 text-zinc-500 dark:text-zinc-400" />
									</Listbox.Button>
									
									<Transition
										as={Fragment}
										enter="transition ease-out duration-100"
										enterFrom="transform opacity-0 scale-95"
										enterTo="transform opacity-100 scale-100"
										leave="transition ease-in duration-75"
										leaveFrom="transform opacity-100 scale-100"
										leaveTo="transform opacity-0 scale-95"
									>
										<Listbox.Options className="absolute left-0 mt-2 w-64 origin-top-left rounded-lg bg-white dark:bg-zinc-800 shadow-lg ring-1 ring-white dark:ring-zinc-700 ring-opacity-5 focus:outline-none max-h-60 overflow-y-auto z-[100]">
											<div className="p-2">
												{login?.workspaces && login.workspaces.length > 1 ? (
													login.workspaces
														.filter(ws => ws.groupId !== workspace.groupId)
														.map((ws) => (
															<Listbox.Option
																key={ws.groupId}
																value={ws.groupId}
																className={({ active }) =>
																	`flex items-center gap-3 px-3 py-2 cursor-pointer rounded-md transition duration-200 ${
																		active ? "bg-zinc-100 dark:bg-zinc-700" : ""
																	}`
																}
															>
																<img
																	src={ws.groupThumbnail || "/placeholder.svg"}
																	alt=""
																	className="w-6 h-6 rounded object-cover"
																/>
																<span className="flex-1 truncate text-sm text-zinc-700 dark:text-white">{ws.groupName}</span>														{partnerIds.includes(ws.groupId) && <VerifiedBadge className="w-3.5 h-3.5" />}																{workspace.groupId === ws.groupId && <IconCheck className="w-4 h-4 text-primary" />}
															</Listbox.Option>
														))
												) : (
													<div className="px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400">
														No other workspaces.
													</div>
												)}
											</div>
											<div className="border-t border-zinc-200 dark:border-zinc-700 p-2">
												<button
													type="button"
													className="w-full flex items-center gap-3 px-3 py-2 cursor-pointer rounded-md transition duration-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-left"
													onClick={(e) => {
														e.preventDefault();
														e.stopPropagation();
														router.push('/workspaces?home=true');
													}}
												>
													<div className="w-6 h-6 rounded bg-zinc-100 dark:bg-zinc-600 flex items-center justify-center">
														<IconHome className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
													</div>
													<span className="flex-1 text-sm font-medium text-zinc-700 dark:text-white">Home</span>
												</button>
											</div>
											{login?.canMakeWorkspace && process.env.NEXT_PUBLIC_FIREFLI_LIMIT === 'true' && (
												<div className="border-t border-zinc-200 dark:border-zinc-700 p-2">
													<button 
														type="button"
														className="w-full flex items-center gap-3 px-3 py-2 cursor-pointer rounded-md transition duration-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-left"
														onMouseDown={(e) => {
															e.preventDefault();
															e.stopPropagation();
														}}
														onClick={(e) => {
															e.preventDefault();
															e.stopPropagation();
														router.push('/welcome');
														}}
													>
														<div className="w-6 h-6 rounded bg-zinc-100 dark:bg-zinc-600 flex items-center justify-center">
															<IconPlus className="w-3 h-3 text-zinc-600 dark:text-zinc-300" />
														</div>
														<span className="flex-1 text-sm font-medium text-zinc-700 dark:text-white">Create Workspace</span>
													</button>
												</div>
											)}
										</Listbox.Options>
									</Transition>
								</div>
							</Listbox>
						)}
						{isInWorkspace && workspacePlan && (
							<Link href={`/workspace/${router.query.id}/plan`} className="hidden sm:inline-flex" aria-label={`${workspacePlan.name} plan, view details`}>
								<PlanBadge name={workspacePlan.name} color={workspacePlan.color} />
							</Link>
						)}
					</div>

					<div className="flex items-center space-x-2">
						<div className="sm:hidden">
							<ThemeToggle />
						</div>
					{(login?.siteRole === "staff" || login?.siteRole === "admin") && (
						<Link
							href="/site/staff"
							className={`hidden sm:flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-sm font-medium transition-colors ${router.pathname === "/site/staff" ? "bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-white" : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700"}`}
						>
							<IconHeadset className="h-4 w-4" aria-hidden="true" />
							Site staff
						</Link>
					)}
					{login?.siteRole === "admin" && (
						<Link
							href="/site/admin"
							className={`hidden sm:flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-sm font-medium transition-colors ${router.pathname === "/site/admin" ? "bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-white" : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700"}`}
						>
							<IconShieldLock className="h-4 w-4" aria-hidden="true" />
							Site admin
						</Link>
					)}
					{isInWorkspace && (
						<div className="hidden sm:block">
							<Notification variant="topbar" />
						</div>
					)}						<Menu as="div" className="relative">
						<Menu.Button className="flex items-center space-x-2 px-2 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors">
							<div className={`h-7 w-7 rounded-full ${getRandomBg(login?.userId)} flex items-center justify-center overflow-hidden`}>
								<img
									src={login?.thumbnail}
									className="h-7 w-7 object-cover rounded-full"
									alt={`${login?.displayname}'s avatar`}
								/>
							</div>
							<span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
								{login?.displayname}
							</span>
							<IconChevronDown className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
						</Menu.Button>

						<Transition
							as={Fragment}
							enter="transition ease-out duration-100"
							enterFrom="transform opacity-0 scale-95"
							enterTo="transform opacity-100 scale-100"
							leave="transition ease-in duration-75"
							leaveFrom="transform opacity-100 scale-100"
							leaveTo="transform opacity-0 scale-95"
						>
							<Menu.Items className="absolute right-0 mt-2 w-56 origin-top-right rounded-lg bg-white dark:bg-zinc-800 shadow-lg ring-1 ring-white dark:ring-zinc-700 ring-opacity-5 focus:outline-none">
								<div className="p-2">
									<div className="px-3 py-2">
										<div className="flex items-center space-x-3">
											<img
												src={login?.thumbnail}
												className="h-10 w-10 rounded-full bg-zinc-200 dark:bg-zinc-600"
												alt={`${login?.displayname}'s avatar`}
											/>
											<div>
												<div className="text-sm font-medium text-zinc-900 dark:text-white">
													{login?.displayname}
												</div>
												<div className="text-xs text-zinc-500 dark:text-zinc-400">
													@{login?.username}
												</div>
											</div>
										</div>
									</div>

									<div className="h-px bg-zinc-200 dark:bg-zinc-700 my-2" />

									<div className="sm:hidden">
										<HelpWidget variant="topbar" />
									</div>

									{(login?.siteRole === "staff" || login?.siteRole === "admin") && (
										<Menu.Item>
											{({ active }) => (
												<button
													onClick={() => router.push("/site/staff")}
													className={`${active ? 'bg-zinc-100 dark:bg-zinc-700' : ''} sm:hidden group flex w-full items-center rounded-md px-3 py-2 text-sm`}
												>
													<IconHeadset className="mr-2 h-5 w-5 text-zinc-500 dark:text-zinc-400" />
													<span className="text-zinc-700 dark:text-zinc-200">Site staff</span>
												</button>
											)}
										</Menu.Item>
									)}
									{login?.siteRole === "admin" && (
										<Menu.Item>
											{({ active }) => (
												<button
													onClick={() => router.push("/site/admin")}
													className={`${active ? 'bg-zinc-100 dark:bg-zinc-700' : ''} sm:hidden group flex w-full items-center rounded-md px-3 py-2 text-sm`}
												>
													<IconShieldLock className="mr-2 h-5 w-5 text-zinc-500 dark:text-zinc-400" />
													<span className="text-zinc-700 dark:text-zinc-200">Site admin</span>
												</button>
											)}
										</Menu.Item>
									)}

									<Menu.Item>
										{({ active }) => (
											<button
												onClick={() => router.push("/account")}
												className={`${active ? 'bg-zinc-100 dark:bg-zinc-700' : ''} group flex w-full items-center rounded-md px-3 py-2 text-sm`}
											>
												<IconUserCircle className="mr-2 h-5 w-5 text-zinc-500 dark:text-zinc-400" />
												<span className="text-zinc-700 dark:text-zinc-200">Your account</span>
											</button>
										)}
									</Menu.Item>
									<Menu.Item>
										{({ active }) => (
											<button
												onClick={() => router.push(isInWorkspace && router.query.id ? `/report?workspace=${router.query.id}` : "/report")}
												className={`${active ? 'bg-zinc-100 dark:bg-zinc-700' : ''} group flex w-full items-center rounded-md px-3 py-2 text-sm`}
											>
												<IconFlag className="mr-2 h-5 w-5 text-zinc-500 dark:text-zinc-400" />
												<span className="text-zinc-700 dark:text-zinc-200">Report a problem</span>
											</button>
										)}
									</Menu.Item>

									<Menu.Item>
										{({ active }) => (
											<button
												onClick={logout}
												className={`${
													active ? 'bg-zinc-100 dark:bg-zinc-700' : ''
												} group flex w-full items-center rounded-md px-3 py-2 text-sm`}
											>
												<IconLogout className="mr-2 h-5 w-5 text-zinc-500 dark:text-zinc-400" />
												<span className="text-zinc-700 dark:text-zinc-200">Sign out</span>
											</button>
										)}
									</Menu.Item>
								</div>
							</Menu.Items>
						</Transition>
					</Menu>
					</div>
				</div>
			</div>
			<AnnouncementBanner />
		</header>
	);
};

export default Topbar;
