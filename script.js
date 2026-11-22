// --- Screen Navigation ---
function showScreen(screenId) {
    document.querySelectorAll('.screen, .dark-screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

// Language Selection -> Main Screen
function selectLanguage() {
    showScreen('main-screen');
}

// --- Loan Calculator Logic ---
function updateLoanValue() {
    const slider = document.getElementById('loanAmount');
    const display = document.getElementById('amountDisplay');
    const monthlyOutput = document.getElementById('monthlyPayment');
    
    const amount = parseInt(slider.value);
    display.innerText = `XAF ${amount.toLocaleString()}`;

    const monthly = amount / 3;
    monthlyOutput.innerText = `XAF ${monthly.toLocaleString(undefined, {maximumFractionDigits: 0})}`;
}

updateLoanValue();

// --- Multi-Step Form Logic ---
function nextStep(stepNumber) {
    document.querySelectorAll('.form-step').forEach(step => {
        step.classList.remove('active');
    });
    document.getElementById(`step-${stepNumber}`).classList.add('active');
    document.getElementById('step-indicator').innerText = `Step ${stepNumber} of 3`;
}

// --- Form Submission & Simulation ---
function submitApplication() {
    showScreen('processing-screen');
    setTimeout(() => {
        showScreen('sms-screen');
    }, 3000); 
}