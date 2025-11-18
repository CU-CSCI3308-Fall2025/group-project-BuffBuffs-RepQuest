document.addEventListener('DOMContentLoaded', () => {
  const OVERLAY_KEY = 'onboardingCompleted_v3';

  const overlay = document.getElementById('onboarding-overlay');
  console.log('overlay element:', overlay);
  if (!overlay) return; // safety

  // If user already finished onboarding, don't show it
  const alreadyDone = localStorage.getItem(OVERLAY_KEY) === 'true';
  if (alreadyDone) return;

  // Show onboarding
  overlay.classList.remove('hidden');

  function showStep(stepNumber) {
    const steps = document.querySelectorAll('.onboarding-step');
    steps.forEach(step => step.classList.add('hidden'));

    const active = document.getElementById(`onboarding-step-${stepNumber}`);
    if (active) active.classList.remove('hidden');
  }

  // Next buttons
  document.querySelectorAll('.onboarding-next').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const next = e.target.getAttribute('data-next');
      showStep(next);
    });
  });

  // Prev buttons
  document.querySelectorAll('.onboarding-prev').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const prev = e.target.getAttribute('data-prev');
      showStep(prev);
    });
  });

  // Skip / Done
  function finishOnboarding() {
    overlay.classList.add('hidden');
    localStorage.setItem(OVERLAY_KEY, 'true');
  }

  const skipBtn = document.getElementById('onboarding-skip');
  if (skipBtn) skipBtn.addEventListener('click', finishOnboarding);

  const doneBtn = document.getElementById('onboarding-done');
  if (doneBtn) doneBtn.addEventListener('click', finishOnboarding);

  // Start at step 1
  showStep(1);
});
