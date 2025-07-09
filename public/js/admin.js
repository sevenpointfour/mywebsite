document.addEventListener('DOMContentLoaded', () => {
    const emailForm = document.getElementById('email-form');
    const otpForm = document.getElementById('otp-form');
    const sendOtpBtn = document.getElementById('send-otp-btn');
    const loginBtn = document.getElementById('login-btn');
    const emailInput = document.getElementById('email');
    const otpInput = document.getElementById('otp');
    const messageArea = document.getElementById('message-area');

    function showMessage(text, type) {
        messageArea.textContent = text;
        messageArea.className = `message ${type}-message`;
    }

    // Step 1: Send OTP
    sendOtpBtn.addEventListener('click', async () => {
        const email = emailInput.value;
        if (!email) {
            showMessage('Please enter your email address.', 'error');
            return;
        }

        showMessage('Sending code...', 'success');

        try {
            const response = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: email }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                showMessage(data.message, 'success');
                emailForm.classList.add('hidden');
                otpForm.classList.remove('hidden');
                otpInput.focus();
            } else {
                showMessage(data.error || 'Failed to send code.', 'error');
            }
        } catch (error) {
            console.error('Error sending OTP:', error);
            showMessage('An error occurred. Please try again.', 'error');
        }
    });

    // Step 2: Verify OTP and Login
    loginBtn.addEventListener('click', async () => {
        const email = emailInput.value;
        const otp = otpInput.value;

        if (!otp) {
            showMessage('Please enter the code from your email.', 'error');
            return;
        }

        showMessage('Verifying...', 'success');

        try {
            const response = await fetch('/api/admin/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: email, otp: otp }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                localStorage.setItem('adminWebsiteToken', data.token);
                showMessage('Login successful! Redirecting...', 'success');
                window.location.href = '/index.html'; // Redirect to your main admin dashboard
            } else {
                showMessage(data.error || 'Login failed.', 'error');
            }
        } catch (error) {
            console.error('Error verifying OTP:', error);
            showMessage('An error occurred. Please try again.', 'error');
        }
    });
});