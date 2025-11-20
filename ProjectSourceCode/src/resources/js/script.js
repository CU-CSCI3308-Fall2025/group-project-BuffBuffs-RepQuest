
console.log("script loaded")

document.addEventListener('DOMContentLoaded', () => {
  const OVERLAY_KEY = 'onboardingCompleted_v2xy';

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

document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("picModal");
  const openBtn = document.getElementById("changePicBtn");
  const closeBtn = document.getElementById("closeModal");
  const fileInput = document.getElementById("fileInput");
  const imageDataField = document.getElementById("imageData");

  if (!modal) {
    console.error("Modal elements not found on this page.");
    return;
  }

  // Open modal
  openBtn.addEventListener("click", () => modal.classList.remove("hidden"));

  // Close modal
  closeBtn.addEventListener("click", () => modal.classList.add("hidden"));

  // Convert file to Base64
  fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      imageDataField.value = reader.result;
    };
    reader.readAsDataURL(file);
  });
});
