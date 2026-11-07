const randomTextFromArray = (texts: string[]) => {
	return texts[Math.floor(Math.random() * texts.length)];
};

const randomText = (name: string) => {
	const morningOnlyTexts = [
		`Good morning, ${name} ☀️`,
		`Rise and shine, ${name}! The crew’s ready when you are 🔥`,
		`Let’s spark up a great day, ${name} ✨`,
		`Wake up and light it up, ${name} 💡`,
		`Coffee and crew energy for you, ${name} ☕️`,
		`Hey ${name}, let’s ignite some productivity!`,
		`Sunrise and new ideas, ${name} 🌅`,
		`Ready to blaze a trail today, ${name}?`,
		`Shine on, ${name}! Your crew’s got your back.`,
		`Let’s get glowing, ${name} 💫`,
		`Fresh start, fresh sparks, ${name} ✨`,
		`Light the fuse on your goals, ${name}.`,
		`Crewbase mornings: powered by ambition and you, ${name}.`,
		`Let’s make today brilliant, ${name}!`,
		`The world’s brighter with you in it, ${name} 🔆`,
		`Rise, shine, and set the pace, ${name} 🏃‍♂️`,
		`Let’s turn up the heat, ${name} 🔥`,
		`New day, new flames, ${name} 🔥`,
		`Let’s light up those tasks, ${name}!`,
		`Crewbase: where your morning starts strong, ${name}.`,
		`Shine bright, ${name}! The day’s yours ☀️`,
		`Let’s get glowing, ${name} ✨`,
		`Crewbase mornings: let’s go, ${name}!`,
		`You’re the spark, ${name} 💡`,
		`Let’s blaze through the morning, ${name} 🔥`,
		`Good vibes and good light, ${name} 🌞`,
		`Let’s set the day on fire (in a good way), ${name} 🔥`,
		`Morning, ${name}! The whole crew’s with you`,
		`Let’s make it a legendary morning, ${name} 🏆`,
		`Crewbase: powering up your day, ${name}`
	];

	const afternoonOnlyTexts = [
		`Good afternoon, ${name} 🌞`,
		`Keep the fire burning, ${name} ⛺`,
		`How’s your spark, ${name}?`,
		`Let’s keep glowing, ${name} ✨`,
		`Halfway there, ${name}! The crew’s cheering you on`,
		`Let’s fuel up for the afternoon, ${name} ⛽️`,
		`You’re on fire, ${name}! Keep it up 🔥`,
		`Let’s light up the rest of the day, ${name} 💡`,
		`Still going strong, ${name}? Your crew’s with you.`,
		`Let’s blaze through those tasks, ${name}!`,
		`Need a recharge? The crew’s got you, ${name}.`,
		`Keep the momentum, ${name} 🚀`,
		`Let’s turn sparks into results, ${name} 💥`,
		`You’re glowing, ${name}!`,
		`Crewbase afternoons: productivity in motion, ${name} 🛠️`,
		`Let’s keep the flame alive, ${name} 🔥`,
		`Don’t forget to hydrate, ${name} 💧`,
		`Ping! Base checking in on you, ${name} 🛎️`,
		`Let’s make this afternoon count, ${name} 🧠`,
		`You’re the light in this workspace, ${name} 💡`,
		`Keep it up, ${name}! Your crew’s proud of you`,
		`Let’s power through, ${name} ⚡️`,
		`Crewbase: fueling your afternoon, ${name}`,
		`Let’s get those wins, ${name} 🏆`,
		`You’re unstoppable, ${name} 🚀`,
		`Let’s keep the fire alive, ${name} 🔥`,
		`Crewbase: your team’s home base, ${name}`,
		`Let’s make it a brilliant afternoon, ${name} 🌞`,
		`You’re the spark that keeps us going, ${name} ✨`
	];

	const nightOnlyTexts = [
		`Good evening, ${name} 🌙`,
		`Winding down, ${name}? Base will keep the lights on`,
		`Hope your day was bright, ${name} 🌆`,
		`Relax and recharge, ${name} 🔋`,
		`Evening vibes, crew style, ${name} ✨`,
		`Time to slow down and reflect, ${name} 🧘`,
		`The night’s aglow, ${name} 🌌`,
		`Great job today, ${name}! The crew’s proud`,
		`Sweet dreams, ${name} 😴`,
		`Crewbase never sleeps, but you should soon, ${name} 💤`,
		`The night is calm, ${name}. Time to relax 🌙`,
		`Logging off soon, ${name}? You’ve earned it!`,
		`Recharge mode: activated, ${name}.`,
		`Even the best crews need rest - so do you, ${name}.`,
		`Thanks for shining today, ${name} 💙`,
		`Night shift or night chill? You decide, ${name}.`,
		`May your dreams be bug-free, ${name} 💤`,
		`Another day complete. Well done, ${name} 🎮`,
		`Mission complete for today, ${name}.`,
		`Sending good energy for tomorrow, ${name} 🔮`,
		`Crewbase: keeping watch tonight, ${name}`,
		`You made today brighter, ${name} ✨`,
		`Rest easy, ${name}. Base is covered`,
		`Let the glow guide you, ${name} 🌙`,
		`Good night, ${name}! Shine again tomorrow`,
		`Crewbase: powering down, ${name} 💤`,
		`You’re the light in the dark, ${name} 🔦`,
		`Let’s recharge for another bright day, ${name} 🔋`
	];

	const lateNightTexts = [
		`Still awake, ${name}? Crewbase respects the grind.`,
		`Burning the midnight oil, ${name}? 🔥`,
		`Late-night coding or just vibing, ${name}? 💻`,
		`You, me, and the glow. Let’s vibe, ${name} 🪩`,
		`Insomniacs anonymous: Crewbase edition, ${name} 😴💤`,
		`Hope you’re doing okay, ${name}. Remember to rest soon!`,
		`Base is still running, and so are you, ${name} ✨`,
		`Night owl mode: activated, ${name} 🦉`,
		`Don’t forget to power down, ${name}.`,
		`Crewbase: keeping you company, ${name}.`,
		`You’re the last spark online, ${name}!`,
		`Let’s make the most of the night, ${name}.`,
		`Rest is important, ${name}. Crewbase says so!`,
		`Late night, bright mind, ${name} 💡`,
		`Crewbase: on the night shift with you, ${name}.`
	];

	const hour = new Date().getHours();

	if (hour >= 20) return randomTextFromArray(nightOnlyTexts);
	if (hour >= 12) return randomTextFromArray(afternoonOnlyTexts);
	if (hour >= 4) return randomTextFromArray(morningOnlyTexts);
	return randomTextFromArray(lateNightTexts);
};

export default randomText;