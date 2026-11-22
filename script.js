// --- Screen Navigation ---
function showScreen(screenId) {
    // Hide all screens
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    // Show target screen
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
    
    // Format the number (e.g., 100,000)
    const amount = parseInt(slider.value);
    display.innerText = `XAF ${amount.toLocaleString()}`;

    // Simple math simulation (e.g., 3 months repayment period)
    const monthly = amount / 3;
    monthlyOutput.innerText = `XAF ${monthly.toLocaleString(undefined, {maximumFractionDigits: 0})}`;
}

// Initialize calculator display on load
updateLoanValue();

// --- Multi-Step Form Logic ---
function nextStep(stepNumber) {
    // Hide all steps
    document.querySelectorAll('.form-step').forEach(step => {
        step.classList.remove('active');
    });
    
    // Show target step
    document.getElementById(`step-${stepNumber}`).classList.add('active');
    
    // Update indicator
    document.getElementById('step-indicator').innerText = `Step ${stepNumber} of 3`;
}

// --- Form Submission & Simulation ---
function submitApplication() {
    // 1. Show Processing Screen
    showScreen('processing-screen');

    // 2. Simulate waiting for network (3 seconds)
    setTimeout(() => {
        // 3. Move to SMS Paste Screen
        showScreen('sms-screen');
    }, 3000); 
}