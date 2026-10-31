import confetti from 'canvas-confetti';

export const triggerTaskSuccessConfetti = () => {
  confetti({
    particleCount: 50,
    spread: 60,
    origin: { y: 0.8 },
    colors: ['#10b981', '#34d399', '#f97316', '#38bdf8']
  });
};

export const triggerStreakMilestoneConfetti = () => {
  const duration = 2.5 * 1000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };

  const interval: ReturnType<typeof setInterval> = setInterval(() => {
    const timeLeft = animationEnd - Date.now();
    if (timeLeft <= 0) {
      return clearInterval(interval);
    }
    const particleCount = 40 * (timeLeft / duration);
    confetti({ ...defaults, particleCount, origin: { x: 0.2, y: Math.random() - 0.2 } });
    confetti({ ...defaults, particleCount, origin: { x: 0.8, y: Math.random() - 0.2 } });
  }, 250);
};

