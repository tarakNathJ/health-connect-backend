import nodemailer from 'nodemailer';

/**
 * Configure the SMTP transport using environment variables.
 * In production, the user should provide EMAIL_USER and EMAIL_PASS 
 * (e.g. a Gmail App Password) in the backend .env file.
 */
const transporter = nodemailer.createTransport({
    service: 'gmail', // You can change this to 'SendGrid', 'Mailgun', etc. if needed
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

/**
 * Send a password reset email
 * @param {string} email - Recipient email
 * @param {string} resetLink - Password reset link
 * @returns {Promise<boolean>} Success status
 */
export const sendPasswordResetEmail = async (email, resetLink) => {
    try {
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.warn("⚠️ Nodemailer Warning: EMAIL_USER or EMAIL_PASS not found in .env. Falling back to console simulation.");
            console.log(`[SIMULATED EMAIL] Reset Link for ${email}: \n${resetLink}`);
            return true;
        }

        const mailOptions = {
            from: `"MediBridge Support" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Reset Your MediBridge Password',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e1e4e8; border-radius: 8px; overflow: hidden;">
                    <div style="background-color: #f8f9fc; padding: 20px; text-align: center; border-bottom: 1px solid #e1e4e8;">
                        <h1 style="color: #4f46e5; margin: 0;">MediBridge</h1>
                    </div>
                    <div style="padding: 30px; background-color: #ffffff;">
                        <h2 style="color: #333333; margin-top: 0;">Password Reset Request</h2>
                        <p style="color: #555555; font-size: 16px; line-height: 1.5;">
                            Hello, <br><br>
                            We received a request to reset the password for your MediBridge account associated with this email address. 
                            If you made this request, please click the button below to securely create a new password:
                        </p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${resetLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block;">
                                Reset Your Password
                            </a>
                        </div>
                        <p style="color: #555555; font-size: 16px; line-height: 1.5;">
                            <strong>Note:</strong> This link will securely expire in 1 hour. <br>
                            If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.
                        </p>
                    </div>
                    <div style="background-color: #f8f9fc; padding: 15px; text-align: center; border-top: 1px solid #e1e4e8; font-size: 12px; color: #888888;">
                        &copy; ${new Date().getFullYear()} MediBridge. All rights reserved.
                    </div>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`Email sent successfully: ${info.messageId}`);
        return true;
    } catch (error) {
        console.error('Error sending password reset email via Nodemailer:', error);
        return false;
    }
};

/**
 * Send a password change confirmation email
 * @param {string} email - Recipient email
 * @returns {Promise<boolean>} Success status
 */
export const sendPasswordChangedEmail = async (email) => {
    try {
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.warn("⚠️ Nodemailer Warning: EMAIL_USER or EMAIL_PASS not found in .env. Falling back to console simulation.");
            console.log(`[SIMULATED EMAIL] Password successfully changed for ${email}.`);
            return true;
        }

        const mailOptions = {
            from: `"MediBridge Support" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Your MediBridge Password Has Been Changed',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e1e4e8; border-radius: 8px; overflow: hidden;">
                    <div style="background-color: #f8f9fc; padding: 20px; text-align: center; border-bottom: 1px solid #e1e4e8;">
                        <h1 style="color: #4f46e5; margin: 0;">MediBridge</h1>
                    </div>
                    <div style="padding: 30px; background-color: #ffffff;">
                        <h2 style="color: #333333; margin-top: 0;">Password Successfully Changed</h2>
                        <p style="color: #555555; font-size: 16px; line-height: 1.5;">
                            Hello, <br><br>
                            This is a confirmation that the password for your MediBridge account has been successfully updated.
                        </p>
                        <div style="text-align: center; margin: 30px 0;">
                            <span style="font-size: 40px; color: #10b981;">&#10003;</span>
                        </div>
                        <p style="color: #555555; font-size: 16px; line-height: 1.5;">
                            If you made this change, no further action is required. <br><br>
                            <strong>Security Alert:</strong> If you did not authorize this change, please contact our support team immediately to secure your account.
                        </p>
                    </div>
                    <div style="background-color: #f8f9fc; padding: 15px; text-align: center; border-top: 1px solid #e1e4e8; font-size: 12px; color: #888888;">
                        &copy; ${new Date().getFullYear()} MediBridge. All rights reserved.
                    </div>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`Confirmation email sent successfully: ${info.messageId}`);
        return true;
    } catch (error) {
        console.error('Error sending password changed email via Nodemailer:', error);
        return false;
    }
}; 