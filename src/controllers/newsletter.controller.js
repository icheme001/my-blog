import crypto from 'crypto';
import pkg from 'nodemailer';
const { createTransport } = pkg;
import { supabase } from '../config/db.js';

// Use existing transporter or create new one
const transporter = createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

export const subscribe = async (req, res) => {
  try {
    const { email } = req.body;

    console.log('=== NEWSLETTER SUBSCRIPTION ===');
    console.log('Email:', email);

    if (!email || !email.includes('@')) {
      return res.status(400).json({ message: 'Please provide a valid email address' });
    }

    // Check if already subscribed
    const { data: existing } = await supabase
      .from('subscribers')
      .select('id, subscribed, verified')
      .eq('email', email)
      .single();

    if (existing) {
      if (existing.subscribed) {
        console.log('Already subscribed');
        return res.json({ 
          message: 'You are already subscribed to our newsletter!',
          alreadySubscribed: true 
        });
      } else {
        // Resubscribe
        const { error } = await supabase
          .from('subscribers')
          .update({ 
            subscribed: true,
            subscribed_at: new Date().toISOString(),
            unsubscribed_at: null
          })
          .eq('email', email);

        if (error) throw error;

        console.log('Resubscribed:', email);
        await sendWelcomeEmail(email);
        
        return res.json({ 
          message: 'Welcome back! You have been resubscribed to our newsletter.' 
        });
      }
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Add new subscriber
    const { data, error } = await supabase
      .from('subscribers')
      .insert([{
        email,
        verification_token: verificationToken,
        verified: false
      }])
      .select()
      .single();

    if (error) {
      console.error('Error adding subscriber:', error);
      throw error;
    }

    console.log('New subscriber added:', email);

    // Send welcome email
    await sendWelcomeEmail(email, verificationToken);

    res.status(201).json({ 
      message: 'Thank you for subscribing! Check your email to confirm your subscription.' 
    });
  } catch (err) {
    console.error('Newsletter subscription error:', err);
    res.status(500).json({ 
      error: 'Failed to subscribe. Please try again later.' 
    });
  }
};

export const unsubscribe = async (req, res) => {
  try {
    const { email } = req.body;

    console.log('=== NEWSLETTER UNSUBSCRIBE ===');
    console.log('Email:', email);

    const { error } = await supabase
      .from('subscribers')
      .update({
        subscribed: false,
        unsubscribed_at: new Date().toISOString()
      })
      .eq('email', email);

    if (error) throw error;

    console.log('Unsubscribed:', email);
    res.json({ message: 'You have been unsubscribed from our newsletter.' });
  } catch (err) {
    console.error('Newsletter unsubscribe error:', err);
    res.status(500).json({ error: 'Failed to unsubscribe. Please try again later.' });
  }
};

export const verifySubscription = async (req, res) => {
  try {
    const { token } = req.params;

    console.log('=== VERIFY SUBSCRIPTION ===');
    console.log('Token:', token?.substring(0, 10) + '...');

    const { data, error } = await supabase
      .from('subscribers')
      .update({ 
        verified: true,
        verification_token: null
      })
      .eq('verification_token', token)
      .select()
      .single();

    if (error || !data) {
      return res.status(400).json({ message: 'Invalid or expired verification link' });
    }

    console.log('Subscription verified:', data.email);
    res.json({ message: 'Email verified! You are now subscribed to our newsletter.' });
  } catch (err) {
    console.error('Verification error:', err);
    res.status(500).json({ error: 'Verification failed. Please try again.' });
  }
};

// Helper function to send welcome email
async function sendWelcomeEmail(email, verificationToken = null) {
  try {
    const verificationLink = verificationToken 
      ? `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-subscription/${verificationToken}`
      : null;

    const mailOptions = {
      from: process.env.EMAIL_FROM || `"BlogSpace" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '🎉 Welcome to BlogSpace Newsletter!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
              color: white; 
              padding: 40px 30px; 
              text-align: center; 
              border-radius: 10px 10px 0 0; 
            }
            .content { 
              background: #ffffff; 
              padding: 40px 30px; 
              border: 1px solid #e0e0e0; 
            }
            .button { 
              display: inline-block; 
              padding: 14px 32px; 
              background: #667eea; 
              color: white; 
              text-decoration: none; 
              border-radius: 8px; 
              margin: 20px 0;
              font-weight: bold;
            }
            .footer { 
              background: #f9f9f9; 
              padding: 20px; 
              text-align: center; 
              font-size: 12px; 
              color: #666; 
              border-radius: 0 0 10px 10px; 
            }
            .benefits { 
              background: #f0f4ff; 
              padding: 20px; 
              border-radius: 8px; 
              margin: 20px 0; 
            }
            .benefit-item {
              display: flex;
              align-items: flex-start;
              margin: 12px 0;
            }
            .checkmark {
              color: #10b981;
              font-size: 20px;
              margin-right: 12px;
              flex-shrink: 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 32px;">🎉 Welcome to BlogSpace!</h1>
              <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.95;">
                Thank you for subscribing to our newsletter
              </p>
            </div>
            <div class="content">
              <p style="font-size: 16px;">Hello there! 👋</p>
              
              <p>Welcome to the BlogSpace community! We're thrilled to have you join our growing family of readers who are passionate about technology, design, and innovation.</p>
              
              ${verificationToken ? `
                <div style="text-align: center; margin: 30px 0;">
                  <p style="font-size: 16px; margin-bottom: 20px;">
                    <strong>Please verify your email to complete your subscription:</strong>
                  </p>
                  <a href="${verificationLink}" class="button">Verify Email Address</a>
                  <p style="font-size: 13px; color: #666; margin-top: 15px;">
                    Or copy and paste this link: <br>
                    <a href="${verificationLink}" style="color: #667eea;">${verificationLink}</a>
                  </p>
                </div>
              ` : ''}
              
              <div class="benefits">
                <h3 style="margin-top: 0; color: #667eea;">What You'll Get:</h3>
                <div class="benefit-item">
                  <span class="checkmark">✓</span>
                  <span><strong>Weekly Digest:</strong> The best articles handpicked just for you</span>
                </div>
                <div class="benefit-item">
                  <span class="checkmark">✓</span>
                  <span><strong>Exclusive Content:</strong> Subscriber-only insights and guides</span>
                </div>
                <div class="benefit-item">
                  <span class="checkmark">✓</span>
                  <span><strong>Early Access:</strong> Be the first to read new articles</span>
                </div>
                <div class="benefit-item">
                  <span class="checkmark">✓</span>
                  <span><strong>Industry News:</strong> Latest trends and developments</span>
                </div>
              </div>
              
              <p style="margin-top: 30px;">
                We respect your inbox and promise to only send you valuable content. No spam, ever.
              </p>
              
              <p style="margin-top: 20px;">
                Happy reading! 📚<br>
                <strong>The BlogSpace Team</strong>
              </p>
            </div>
            <div class="footer">
              <p>You're receiving this email because you subscribed to BlogSpace newsletter.</p>
              <p>
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" style="color: #667eea; text-decoration: none;">Visit BlogSpace</a> | 
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/unsubscribe?email=${encodeURIComponent(email)}" style="color: #666; text-decoration: none;">Unsubscribe</a>
              </p>
              <p>© ${new Date().getFullYear()} BlogSpace. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('✅ Welcome email sent to:', email);
  } catch (error) {
    console.error('❌ Error sending welcome email:', error);
    // Don't throw - subscription should still succeed even if email fails
  }
}