// --- Screen Navigation ---
function showScreen(screenId) {
    // Hide all screens
    document.querySelectorAll('.dark-screen').forEach(screen => {
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
    const amountSlider = document.getElementById('loanAmount');
    const termSlider = document.getElementById('loanTerm');
    
    const amountDisplay = document.getElementById('amountDisplay');
    const termDisplay = document.getElementById('termDisplay');
    const monthlyOutput = document.getElementById('monthlyPayment');
    
    // Get current values from sliders
    const amount = parseInt(amountSlider.value);
    const term = parseInt(termSlider.value);
    
    // Format the outputs (e.g., XAF 410,000)
    amountDisplay.innerText = `XAF ${amount.toLocaleString()}`;
    termDisplay.innerText = `${term} Months`;

    // Calculation logic:
    // Let's assume a flat interest rate of 12% total for the loan simulation.
    const interestRate = 0.12; 
    const totalRepayment = amount + (amount * interestRate);
    const monthly = totalRepayment / term;
    
    // Round up to the nearest whole number and format
    monthlyOutput.innerText = `XAF ${Math.ceil(monthly).toLocaleString()}`;
}

// Initialize calculator display on load
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

    // Simulate waiting for network (3 seconds)
    setTimeout(() => {
        showScreen('sms-screen');
    }, 3000); 
}