/*
Copyright 2025 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/
const nodemailer = require('nodemailer');

/**
 * Send an email
 * @param {object} params - The parameters for the email
 * @param {object} logger - The logger object
 * @returns {Promise<void>} - A promise that resolves when the email is sent
 */
async function sendEmail(params, logger) {
  logger.info('Sending email...');
  logger.debug(params);

  // Create a transporter object using SMTP
  const transporter = nodemailer.createTransport({
    host: params.EMAIL_HOST,
    port: params.EMAIL_PORT,
    secure: false,
    auth: {
      user: params.EMAIL_USER,
      pass: params.EMAIL_PASSWORD,
    },
  });

  logger.info('Transporter created');

  // Defensive: check params.data exists
  const data = params.data || {};
  const firstName = data.firstname || '';
  const lastName = data.lastname || '';
  const email = data.email || '';
  const message = data.message || '';
  logger.info('Email params', { firstName, lastName, email, message });

  // Email options
  const mailOptions = {
    from: params.EMAIL_FROM,
    to: params.EMAIL_TO || email,
    subject: params.EMAIL_SUBJECT,
    html: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>${params.EMAIL_HEADER} - Contact Us</title>
    <style>
        body { font-family: 'Open Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif}
        table.container {
            width: 400px;
            margin: 50px auto;
            border-collapse: collapse;
            background-color: #efefef;
        }
        .contact-title {
            font-size: 18px;
            font-weight: bold;
            border-bottom: 1px solid #ccc;
            padding-bottom: 8px;
            padding-left: 10px
        }
        .field-label {
            font-weight: bold;
            width: 100px;
            display: inline-block;
            padding-left: 10px
        }
        .footer {
            text-align: center;
            font-size: 15px;
            background-color: #000000;
            color: white;
            padding: 20px;
        }
        td {
            padding: 8px 0;
        }
    </style>
</head>
<body>
<table class="container">
    <tr>
        <td colspan="2" style="border-top: 4px solid #e60000; padding-left: 10px;">
            <img src="${params.EMAIL_LOGO}" alt="Adobe" style="border:0;height:auto;line-height:100%;text-decoration:none;max-width:150px;padding-top: 16px;">
        </td>
    </tr>
    <tr>
        <td colspan="2" class="contact-title">Contact Us</td>
    </tr>
    <tr>
        <td class="field-label" style="padding-top: 20px;">First Name:</td>
        <td style="padding-top: 20px;">${firstName}</td>
    </tr>
    <tr>
        <td class="field-label">Last Name:</td>
        <td>${lastName}</td>
    </tr>
    <tr>
        <td class="field-label">Email:</td>
        <td>${email}</td>
    </tr>
    <tr>
        <td class="field-label">Message:</td>
        <td>${message}</td>
    </tr>
    <tr>
        <td>&nbsp;</td>
    </tr>
    <tr>
        <td colspan="2" class="footer">${params.EMAIL_FOOTER}</td>
    </tr>
</table>
</body>
</html>`,
  };

  logger.info('Email options', mailOptions);

  try {
    const info = await transporter.sendMail(mailOptions);
    logger.info('Email sent:', info.response);
    return true;
  } catch (error) {
    logger.error('Failed to send email:', error);
    return false;
  }
}

module.exports = {
  sendEmail,
};
