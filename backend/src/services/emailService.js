import nodemailer from 'nodemailer';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

// Create transporter
const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: false, // true for 465, false for other ports
  auth: {
    user: config.email.user,
    pass: config.email.password,
  },
});

/**
 * Send weapon detection notification email
 */
export async function sendDetectionEmail(detection) {
  try {
    const { cameraLabel, timestamp, videoUrl, confidence, weaponType, metadata } = detection;

    const hasWeapon = weaponType !== 'plate' && weaponType !== 'suspicious' && weaponType !== 'unknown';
    const plate = metadata?.plate;
    const suspicious = metadata?.suspicious;

    let subject = `🚨 DETECTION ALERT - ${cameraLabel}`;
    let alertTitle = 'DETECTION ALERT';
    let alertColor = '#6c757d'; // Default gray
    let description = 'The surveillance system has detected activity requiring attention.';

    if (hasWeapon) {
      subject = `🚨 WEAPON DETECTED - ${cameraLabel}`;
      alertTitle = 'WEAPON DETECTION ALERT';
      alertColor = '#dc3545'; // Red
      description = 'A weapon has been detected by the surveillance system. Immediate attention required.';
    } else if (plate) {
      subject = `📋 PLATE DETECTED - ${cameraLabel}`;
      alertTitle = 'LICENSE PLATE DETECTION';
      alertColor = '#007bff'; // Blue
      description = 'A license plate of interest has been detected.';
    } else if (suspicious && suspicious.length > 0) {
      subject = `⚠️ SUSPICIOUS BEHAVIOUR - ${cameraLabel}`;
      alertTitle = 'SUSPICIOUS BEHAVIOUR ALERT';
      alertColor = '#ffc107'; // Yellow
      description = 'Suspicious activity has been detected by the surveillance system.';
    }

    const mailOptions = {
      from: config.email.from,
      to: config.email.recipients.join(', '),
      subject: subject,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: ${alertColor}; color: ${alertColor === '#ffc107' ? '#333' : 'white'}; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background-color: #f8f9fa; padding: 20px; border-radius: 0 0 5px 5px; }
            .detail { margin: 10px 0; padding: 10px; background-color: white; border-left: 4px solid ${alertColor}; }
            .label { font-weight: bold; color: ${alertColor}; }
            .button { display: inline-block; padding: 12px 24px; background-color: ${alertColor}; color: ${alertColor === '#ffc107' ? '#333' : 'white'}; text-decoration: none; border-radius: 5px; margin-top: 15px; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${alertTitle}</h1>
            </div>
            <div class="content">
              <p>${description}</p>
              
              <div class="detail">
                <span class="label">Camera:</span> ${cameraLabel}
              </div>
              
              <div class="detail">
                <span class="label">Detection Time:</span> ${new Date(timestamp).toLocaleString()}
              </div>

              ${hasWeapon ? `
              <div class="detail">
                <span class="label">Weapon Type:</span> ${weaponType.toUpperCase()}
              </div>
              <div class="detail">
                <span class="label">Confidence:</span> ${(confidence * 100).toFixed(2)}%
              </div>
              ` : ''}

              ${plate ? `
              <div class="detail">
                <span class="label">Plate Number:</span> ${plate.text}
              </div>
              <div class="detail">
                <span class="label">Confidence:</span> ${(plate.confidence * 100).toFixed(2)}%
              </div>
              ` : ''}

              ${suspicious && suspicious.length > 0 ? `
              <div class="detail">
                <span class="label">Activities Found:</span> ${suspicious.map(s => s.label).join(', ')}
              </div>
              ` : ''}
              
              <div style="text-align: center;">
                <a href="${videoUrl}" class="button">📹 VIEW VIDEO FOOTAGE</a>
              </div>
              
              <div class="footer">
                <p>This is an automated alert from the Surveillance System.</p>
                <p>Please follow standard security protocols.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
${alertTitle}

${description}

Camera: ${cameraLabel}
Detection Time: ${new Date(timestamp).toLocaleString()}
${hasWeapon ? `Weapon Type: ${weaponType.toUpperCase()}\nConfidence: ${(confidence * 100).toFixed(2)}%` : ''}
${plate ? `Plate Number: ${plate.text}\nConfidence: ${(plate.confidence * 100).toFixed(2)}%` : ''}
${suspicious && suspicious.length > 0 ? `Activities: ${suspicious.map(s => s.label).join(', ')}` : ''}

View Video Footage: ${videoUrl}

This is an automated alert.
      `,
    };

    const info = await transporter.sendMail(mailOptions);

    logger.info(`Detection email sent: ${info.messageId}`);

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    logger.error(`Failed to send detection email: ${error.message}`);
    throw error;
  }
}

/**
 * Verify email configuration
 */
export async function verifyEmailConfig() {
  try {
    await transporter.verify();
    logger.info('Email configuration verified successfully');
    return true;
  } catch (error) {
    logger.error(`Email configuration error: ${error.message}`);
    return false;
  }
}

/**
 * Send test email
 */
export async function sendTestEmail() {
  try {
    const mailOptions = {
      from: config.email.from,
      to: config.email.recipients.join(', '),
      subject: 'Test Email - Weapon Detection System',
      html: `
        <h2>Email Configuration Test</h2>
        <p>This is a test email from the Weapon Detection System.</p>
        <p>If you received this, your email configuration is working correctly.</p>
        <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Test email sent: ${info.messageId}`);
    return true;
  } catch (error) {
    logger.error(`Failed to send test email: ${error.message}`);
    return false;
  }
}
