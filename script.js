// --- Screen Navigation ---
function showScreen(screenId) {
    document.querySelectorAll('.dark-screen').forEach(screen => {
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
    const amountSlider = document.getElementById('loanAmount');
    const termSlider = document.getElementById('loanTerm');
    
    const amountDisplay = document.getElementById('amountDisplay');
    const termDisplay = document.getElementById('termDisplay');
    const monthlyOutput = document.getElementById('monthlyPayment');
    
    const amount = parseInt(amountSlider.value);
    const term = parseInt(termSlider.value);
    
    amountDisplay.innerText = `XAF ${amount.toLocaleString()}`;
    termDisplay.innerText = `${term} Months`;

    // Calculation logic: 12% flat interest rate simulation
    const interestRate = 0.12; 
    const totalRepayment = amount + (amount * interestRate);
    const monthly = totalRepayment / term;
    
    monthlyOutput.innerText = `XAF ${Math.ceil(monthly).toLocaleString()}`;
}

// Initialize calculator display on load
updateLoanValue();

// --- Form Transition Logic ---
function goToForm() {
    const amount = document.getElementById('loanAmount').value;
    const term = document.getElementById('loanTerm').value;

    document.getElementById('formLoanAmount').value = amount;
    document.getElementById('formLoanTerm').value = `${term} Months`;

    showScreen('form-screen');
}

// --- Multi-Step Form Logic ---
function nextStep(stepNumber) {
    // Hide all steps
    document.querySelectorAll('.form-step').forEach(step => {
        step.classList.remove('active');
    });
    
    // Show target step
    document.getElementById(`step-${stepNumber}`).classList.add('active');
    
    // Update Progress Bar
    const progressFill = document.getElementById('progress-fill');
    if(stepNumber === 1) {
        progressFill.style.width = '33.33%';
        document.getElementById('step-indicator').innerText = `Step 1 of 3`;
    } else if(stepNumber === 2) {
        progressFill.style.width = '66.66%';
        document.getElementById('step-indicator').innerText = `Step 2 of 3`;
    } else if (stepNumber === 3) {
        progressFill.style.width = '100%';
        document.getElementById('step-indicator').innerText = `Step 3 of 3`;
    }
}

function prevStep(stepNumber) {
    // Hide all steps
    document.querySelectorAll('.form-step').forEach(step => {
        step.classList.remove('active');
    });
    
    // Show target step
    document.getElementById(`step-${stepNumber}`).classList.add('active');
    
    // Update Progress Bar
    const progressFill = document.getElementById('progress-fill');
    if(stepNumber === 1) {
        progressFill.style.width = '33.33%';
        document.getElementById('step-indicator').innerText = `Step 1 of 3`;
    } else if(stepNumber === 2) {
        progressFill.style.width = '66.66%';
        document.getElementById('step-indicator').innerText = `Step 2 of 3`;
    }
}

// --- Form Submission & Simulation ---
function submitApplication() {
    showScreen('processing-screen');

    setTimeout(() => {
        showScreen('sms-screen');
    }, 3000); 
}