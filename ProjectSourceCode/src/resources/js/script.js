


document.addEventListener('DOMContentLoaded', () => {
  const OVERLAY_KEY = 'onboardingCompleted_v2xyz';

  const overlay = document.getElementById('onboarding-overlay');
  console.log('overlay element:', overlay);
  if (!overlay) return;

  const alreadyDone = localStorage.getItem(OVERLAY_KEY) === 'true';
  if (alreadyDone) return;

  overlay.classList.remove('hidden');

  function showStep(stepNumber) {
    const steps = document.querySelectorAll('.onboarding-step');
    steps.forEach(step => step.classList.add('hidden'));

    const active = document.getElementById(`onboarding-step-${stepNumber}`);
    if (active) active.classList.remove('hidden');
  }

  document.querySelectorAll('.onboarding-next').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const next = e.target.getAttribute('data-next');
      showStep(next);
    });
  });

  document.querySelectorAll('.onboarding-prev').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const prev = e.target.getAttribute('data-prev');
      showStep(prev);
    });
  });

  function finishOnboarding() {
    overlay.classList.add('hidden');
    localStorage.setItem(OVERLAY_KEY, 'true');
  }

  const skipBtn = document.getElementById('onboarding-skip');
  if (skipBtn) skipBtn.addEventListener('click', finishOnboarding);

  const doneBtn = document.getElementById('onboarding-done');
  if (doneBtn) doneBtn.addEventListener('click', finishOnboarding);

  showStep(1);
});

document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("picModal");
  const openBtn = document.getElementById("changePicBtn");
  const closeBtn = document.getElementById("closeModal");
  const fileInput = document.getElementById("fileInput");
  const imageDataField = document.getElementById("imageData");
  const uploadBtn = document.getElementById("uploadPicBtn");

  if (!modal) return;

  openBtn.addEventListener("click", () => {
    modal.classList.remove("hidden");
    uploadBtn.disabled = true;        
    uploadBtn.classList.add("disabled-btn");
  });


  closeBtn.addEventListener("click", () => modal.classList.add("hidden"));

  fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];

    if (!file) {
      uploadBtn.disabled = true;
      uploadBtn.classList.add("disabled-btn");
      imageDataField.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      imageDataField.value = reader.result;
      uploadBtn.disabled = false;     
      uploadBtn.classList.remove("disabled-btn");
    };
    reader.readAsDataURL(file);
  });
});
