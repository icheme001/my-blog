import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import pkg from 'nodemailer';
const { createTransport } = pkg;
import { supabase } from "../config/db.js";

// Create email transporter
const transporter = createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});
// Verify transporter configuration
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Email transporter error:', error);
  } else {
    console.log('✅ Email server is ready to send messages');
  }
});

export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    console.log('Registration attempt:', email);

    // Check if user exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      console.log('User already exists');
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const { data, error } = await supabase
      .from('users')
      .insert([
        {
          name,
          email,
          password: hashedPassword
        }
      ])
      .select('id, name, email, role')
      .single();

    if (error) {
      console.error('Registration error:', error);
      throw error;
    }

    console.log('User registered successfully:', data.id);
    
    // Generate token for auto-login after registration
    const token = jwt.sign(
      { id: data.id, role: data.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // Return token and user data
    res.status(201).json({
      token,
      id: data.id,
      name: data.name,
      email: data.email,
      role: data.role
    });
  } catch (err) {
    console.error('Error registering user:', err);
    res.status(500).json({ error: err.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('=== LOGIN ATTEMPT ===');
    console.log('Email:', email);
    console.log('Password received:', password ? 'Yes' : 'No');

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    console.log('Supabase query error:', error);
    console.log('User found:', user ? 'Yes' : 'No');
    
    if (user) {
      console.log('User ID:', user.id);
      console.log('User role:', user.role);
      console.log('Password hash starts with:', user.password?.substring(0, 10));
    }

    if (error || !user) {
      console.log('FAILED: User not found');
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, user.password);
    console.log('Password comparison result:', valid);

    if (!valid) {
      console.log('FAILED: Invalid password');
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    console.log('SUCCESS: Login successful');
    
    // FIXED: Return token AND user data
    res.json({
      token,
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    });
  } catch (err) {
    console.error('Error logging in:', err);
    res.status(500).json({ error: err.message });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    console.log('=== FORGOT PASSWORD REQUEST ===');
    console.log('Email:', email);

    // Check if user exists
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('email', email)
      .single();

    // Always return success message (security best practice)
    if (error || !user) {
      console.log('User not found, but returning success for security');
      return res.json({ 
        message: "If an account exists with this email, you will receive a verification code." 
      });
    }

    // Generate 6-digit code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const resetCodeExpiry = new Date(Date.now() + 600000).toISOString(); // 10 minutes

    // Store code in database
    const { error: updateError } = await supabase
      .from('users')
      .update({
        reset_token: resetCode,
        reset_token_expiry: resetCodeExpiry
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error storing reset code:', updateError);
      throw updateError;
    }

    // Log the code to console (backup)
    console.log('');
    console.log('=================================');
    console.log('📧 VERIFICATION CODE FOR:', email);
    console.log('🔢 CODE:', resetCode);
    console.log('⏰ Expires in 10 minutes');
    console.log('=================================');
    console.log('');
    
    // Send email with code
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || `"Your Blog" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: 'Password Reset Code - Your Blog',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; }
              .code-box { background: #f5f5f5; border: 2px dashed #667eea; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
              .code { font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #667eea; font-family: monospace; }
              .footer { background: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 10px 10px; }
              .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
              .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 15px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0;">🔐 Password Reset</h1>
              </div>
              <div class="content">
                <p>Hello <strong>${user.name}</strong>,</p>
                <p>You requested to reset your password. Use the verification code below:</p>
                
                <div class="code-box">
                  <div style="color: #666; font-size: 14px; margin-bottom: 10px;">Your Verification Code</div>
                  <div class="code">${resetCode}</div>
                </div>
                
                <p style="text-align: center; color: #666;">
                  <strong>Enter this code on the password reset page</strong>
                </p>
                
                <div class="warning">
                  ⚠️ <strong>Important:</strong> This code will expire in <strong>10 minutes</strong>
                </div>
                
                <p>If you didn't request this password reset, please ignore this email or contact support if you have concerns.</p>
                
                <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                  Best regards,<br>
                  <strong>Your Blog Team</strong>
                </p>
              </div>
              <div class="footer">
                <p>This is an automated email, please do not reply.</p>
                <p>© ${new Date().getFullYear()} Your Blog. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `
      };

      await transporter.sendMail(mailOptions);
      console.log('✅ Email sent successfully to:', user.email);
    } catch (emailError) {
      console.error('❌ Error sending email:', emailError);
      // Don't fail the request if email fails - code is still in console
    }

    console.log('SUCCESS: Verification code generated and sent');
    res.json({ 
      message: "If an account exists with this email, you will receive a verification code."
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'An error occurred. Please try again later.' });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    console.log('=== RESET PASSWORD REQUEST ===');
    console.log('Email:', email);
    console.log('Code:', code);

    if (!email || !code || !newPassword) {
      return res.status(400).json({ message: "Email, code, and new password are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    // Find user with valid reset code
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, reset_token, reset_token_expiry')
      .eq('email', email)
      .eq('reset_token', code)
      .single();

    if (error || !user) {
      console.log('Invalid code or email');
      return res.status(400).json({ message: "Invalid verification code" });
    }

    // Check if code is expired
    if (new Date(user.reset_token_expiry) < new Date()) {
      console.log('Code expired');
      return res.status(400).json({ message: "Verification code has expired. Please request a new one." });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear reset code
    const { error: updateError } = await supabase
      .from('users')
      .update({
        password: hashedPassword,
        reset_token: null,
        reset_token_expiry: null
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating password:', updateError);
      throw updateError;
    }

    console.log('SUCCESS: Password reset successfully');
    res.json({ message: "Password has been reset successfully. You can now login with your new password." });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'An error occurred. Please try again later.' });
  }
};