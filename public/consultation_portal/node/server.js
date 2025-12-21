  console.log("--- SERVER.JS EXECUTION STARTED --- Path: c:\\Users\\Madhav\\Desktop\\SEVENPOINTFOUR\\server.js ---"); // Add this line at the very top
  const express = require('express');
  const mysql = require('mysql2'); // or mysql
  const bcrypt = require('bcrypt');
  const jwt = require('jsonwebtoken');
  const nodemailer = require('nodemailer');
  const {decrypt, getDefaultKey} = require('./decrypt');
require('dotenv').config(); // Load environment variables from .env file

  const app = express();
  app.use(express.json()); // Middleware for parsing JSON bodies
 
 // Serve static files (HTML, CSS, frontend JS) from a 'public' directory
 // Create a folder named 'public' in your project root and put register.html and style.css there.
 app.use(express.static('public'));

 // Get encryption key from a secure env var (not in .env file)
const ENC_KEY = process.env.ENC_KEY || getDefaultKey();
 
  // Database connection
  const db = mysql.createPool({
        host: process.env.DB_HOST || 'localhost', // Or your MySQL host
        user: process.env.DB_USER,      // Your MySQL username
        password: decrypt(process.env.DB_PASSWORD, ENC_KEY),  // Your MySQL password from environment variable
        database: process.env.DB_NAME, // Your database name
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
  }).promise(); // Use promise-based API for cleaner async/await

  const JWT_SECRET = decrypt(process.env.JWT_SECRET, ENC_KEY); // Replace with a strong, random secret
  const EMAIL_USER = process.env.EMAIL_USER; // Your email for sending
  const EMAIL_PASS = decrypt(process.env.EMAIL_PASSWORD, ENC_KEY); // Your email password (or an app password)
  // Email transporter setup
  const transporter = nodemailer.createTransport({
      service: 'Gmail', // Or your email provider
      auth: {
          user: EMAIL_USER,
          pass:  EMAIL_PASS,
      },
  });
 
  // 1. Client Registration
  app.post('/register', async (req, res) => {
     const { first_name, last_name, mobile_number, email, password } = req.body;
 
     // Input Validation
     if (!first_name || !last_name || !mobile_number || !email || !password) {
         return res.status(400).json({ error: 'All fields are required' });
     }
 
     // Basic email format validation
     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
     if (!emailRegex.test(email)) {
         return res.status(400).json({ error: 'Invalid email format' });
     }
 
     if (password.length < 6) {
         return res.status(400).json({ error: 'Password must be at least 6 characters long' });
     }
 
      const generateOTP = () => {
          return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
      };
      const otp = generateOTP();
 
      const otpExpiry = new Date();
      otpExpiry.setMinutes(otpExpiry.getMinutes() + 10); // OTP expires in 10 minutes
 
      try {
          // Check if email or mobile number already exists
          const [existingUsers] = await db.execute(
              'SELECT client_id FROM clients WHERE email = ? OR mobile_number = ?',
              [email, mobile_number]
          );

          if (existingUsers.length > 0) {
              return res.status(409).json({ error: 'Email or mobile number already registered' }); // 409 Conflict
          }

          const hashedPassword = await bcrypt.hash(password, 10);
          const [result] = await db.execute(
              'INSERT INTO clients (first_name, last_name, mobile_number, email, password_hash, email_otp, email_otp_expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
              [first_name, last_name, mobile_number, email, hashedPassword, otp, otpExpiry]
          );
 
          // *** Send Email ***
          const mailOptions = {
                from: `"Consultation Service" <${EMAIL_USER}>`,
                to: email,
                subject: 'Welcome to Consultation Service - Verify Your Email & Next Steps',
                html: `
                    <p>Dear ${first_name},</p>
                    <p>Thank you for registering with our Consultation Service!</p>
                    <p>Your One-Time Password (OTP) for email verification is: <b>${otp}</b></p>
                    <p>This OTP will expire in 10 minutes. Please use it to verify your email address promptly.</p>
                    
                    <h2>Next Steps:</h2>
                    <ol>
                        <li><strong>Verify Your Email:</strong> Use the OTP above on our verification page (you'll be directed there or can find a link on our site).</li>
                        <li><strong>Payment of Fees:</strong> To activate your account and access our full services, a one-time fee is required.
                            <ul>
                                <li>Fee Amount: [Specify Fee Amount Here, e.g., $50 USD]</li>
                                <li>Payment Methods: We accept [Specify Methods, e.g., Credit Card, PayPal, Bank Transfer].</li>
                                <li>Bank Account Details (for Bank Transfer):
                                    <ul>
                                        <li>Bank Name: [Your Bank Name]</li>
                                        <li>Account Name: [Your Account Name]</li>
                                        <li>Account Number: [Your Account Number]</li>
                                        <li>SWIFT/BIC Code: [Your SWIFT Code]</li>
                                        <li>Reference: Please use your Client ID (which will be provided upon successful registration) or your email address as the payment reference.</li>
                                    </ul>
                                </li>
                                <li>Once payment is made, please allow up to [e.g., 24-48 hours] for verification and account activation. You will receive another email once your account is active.</li>
                            </ul>
                        </li>
                        <li><strong>Login:</strong> After your account is activated, you can log in using your email and the password you registered with. Initially, your access might be to specific sections until full activation.</li>
                    </ol>
                    <p>Your password is currently set but your account will require activation after payment to gain full access.</p>
                    <p>If you have any questions, please don't hesitate to contact our support team.</p>
                    <p>Sincerely,<br>The Consultation Service Team</p>
                `,
          };
          try {
            if (transporter) {
              await transporter.sendMail(mailOptions);
              console.log(`Sent verification email to ${email}`);
            } else {
                console.log(JSON.stringify(mailOptions));
                throw 'Email Transporter is not Configured';
            }
          } catch (emailError) {
              console.error('Error sending email:', emailError);
              // Handle email sending failure gracefully.  You might want to log this or retry.
              // For now, we'll just proceed with registration but inform the client.
              return res.status(500).json({
                  message: 'Client registered, but email sending failed. Please try again later.',
                  client_id: result.insertId,
              });
          }
 
          // If the email sends successfully, proceed with the registration success message:
          res.status(201).json({ message: 'Client registered successfully', client_id: result.insertId });
      } catch (error) {
          console.error('Registration error:', error);
          res.status(500).json({ error: 'Registration failed' }); // Improved error message
      }
  });
 
  // 2. Email OTP Verification
  app.post('/verify-email', async (req, res) => {
      const { email, otp } = req.body;

     // Input Validation for verify-email
     if (!email || !otp) {
         return res.status(400).json({ error: 'Email and OTP are required' });
     }
 
      try {
          const [rows] = await db.execute(
              'SELECT * FROM clients WHERE email = ? AND email_otp = ? AND email_otp_expires_at > NOW()',
              [email, otp]
          );
 
          if (rows.length === 0) {
              return res.status(400).json({ error: 'Invalid or expired OTP' });
          }
 
          const client = rows[0];
 
          // Update is_email_verified and clear OTP fields
          await db.execute(
              'UPDATE clients SET is_email_verified = TRUE, email_otp = NULL, email_otp_expires_at = NULL WHERE client_id = ?',
              [client.client_id]
          );
 
          res.json({ message: 'Email verified successfully' });
      } catch (error) {
          console.error('Email verification error:', error);
          res.status(500).json({ error: 'Email verification failed' });
      }
  });
 
  // --- Initial Admin Setup ---
  app.post('/api/setup/first-admin', async (req, res) => {
    const { first_name, last_name, email, password } = req.body;

    if (!first_name || !last_name || !email || !password) {
        return res.status(400).json({ error: 'All fields are required' });
    }
    if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
    }

    try {
        // Check if an admin already exists
        const [adminUsers] = await db.execute("SELECT user_id FROM users WHERE role = 'admin' LIMIT 1");
        if (adminUsers.length > 0) {
            return res.status(403).json({ error: 'Forbidden: An admin account already exists. Setup is complete.' });
        }

        // Check if the email is already in use by any user (not just admin)
        const [existingEmail] = await db.execute("SELECT user_id FROM users WHERE email = ?", [email]);
        if (existingEmail.length > 0) {
            return res.status(409).json({ error: 'Email already in use.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await db.execute(
            'INSERT INTO users (first_name, last_name, email, password_hash, role, is_active) VALUES (?, ?, ?, ?, ?, ?)',
            [first_name, last_name, email, hashedPassword, 'admin', true]
        );
        res.status(201).json({ message: 'First admin account created successfully!', user_id: result.insertId });

    } catch (error) {
        console.error('Error creating first admin:', error);
        if (error.code === 'ER_DUP_ENTRY') { // Should be caught by pre-check, but as a fallback
            return res.status(409).json({ error: 'Email already exists.' });
        }
        res.status(500).json({ error: 'Failed to create first admin' });
    }
});
  // --- Admin Authentication ---
  app.post('/api/admin/login', async (req, res) => {
      const { email, password } = req.body;
      if (!email || !password) {
          return res.status(400).json({ error: 'Email and password are required' });
      }

      try {
          const [users] = await db.execute(
              'SELECT user_id, password_hash, role FROM users WHERE email = ? AND role = ?',
              [email, 'admin']
          );

          if (users.length === 0) {
              return res.status(401).json({ error: 'Invalid credentials or not an admin' });
          }

          const adminUser = users[0];
          const isPasswordValid = await bcrypt.compare(password, adminUser.password_hash);

          if (!isPasswordValid) {
              return res.status(401).json({ error: 'Invalid credentials' });
          }

          const token = jwt.sign(
              { userId: adminUser.user_id, role: adminUser.role },
              JWT_SECRET,
              { expiresIn: '1h' } // Token expires in 1 hour
          );

          res.json({ message: 'Admin login successful', token });

      } catch (error) {
          console.error('Admin login error:', error);
          res.status(500).json({ error: 'Admin login failed' });
      }
  });

  // Middleware to verify Admin JWT
  const verifyAdminToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7, authHeader.length);
        console.log('[verifyAdminToken] Token received by server:', token);
        jwt.verify(token, JWT_SECRET, (err, decoded) => {
            if (err) {
                console.error('[verifyAdminToken] JWT verification error:', err.name, err.message, 'ExpiredAt:', err.expiredAt); // Log specific JWT error
                return res.status(403).json({ error: `Forbidden: Token verification failed (${err.name})` });
            }
            if (!decoded || decoded.role !== 'admin') {
                console.error('[verifyAdminToken] Verification failed. Decoded payload:', decoded, 'Role check failed or payload missing.');
                return res.status(403).json({ error: 'Forbidden: Invalid or missing admin token' });
            }
            req.user = decoded;
            next();
        });
    } else {
        console.log('[verifyAdminToken] Unauthorized: Missing admin token in headers.');
        res.status(401).json({ error: 'Unauthorized: Missing admin token' });
    }
};

  // --- Admin Routes ---
  // Get all nutritionists
  app.get('/api/admin/nutritionists', verifyAdminToken, async (req, res) => {
      try {
          const [nutritionists] = await db.execute(
              "SELECT user_id, first_name, last_name, email, is_active FROM users WHERE role = 'nutritionist' ORDER BY last_name, first_name"
          );
          res.json(nutritionists);
      } catch (error) {
          console.error('Error fetching nutritionists:', error);
          res.status(500).json({ error: 'Failed to fetch nutritionists' });
      }
  });
 
  // Add a new nutritionist
  app.post('/api/admin/nutritionists', verifyAdminToken, async (req, res) => {
      const { first_name, last_name, email, password } = req.body;
 
      if (!first_name || !last_name || !email || !password) {
          return res.status(400).json({ error: 'All fields are required' });
      }
      if (password.length < 6) {
          return res.status(400).json({ error: 'Password must be at least 6 characters long' });
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
          return res.status(400).json({ error: 'Invalid email format' });
      }
 
      try {
          // Check if email already exists
          const [existingUsers] = await db.execute('SELECT user_id FROM users WHERE email = ?', [email]);
          if (existingUsers.length > 0) {
              return res.status(409).json({ error: 'Email already registered for another user' });
          }
 
          const hashedPassword = await bcrypt.hash(password, 10);
          const [result] = await db.execute(
              'INSERT INTO users (first_name, last_name, email, password_hash, role, is_active) VALUES (?, ?, ?, ?, ?, ?)',
              [first_name, last_name, email, hashedPassword, 'nutritionist', true]
          );
          res.status(201).json({ message: 'Nutritionist added successfully', user_id: result.insertId });
      } catch (error) {
          console.error('Error adding nutritionist:', error);
          if (error.code === 'ER_DUP_ENTRY') { // Should be caught by pre-check, but as a fallback
              return res.status(409).json({ error: 'Email already exists.' });
          }
          res.status(500).json({ error: 'Failed to add nutritionist' });
      }
  });

  // Update nutritionist details
  app.put('/api/admin/nutritionists/:userId', verifyAdminToken, async (req, res) => {
    const { userId } = req.params;
    const { first_name, last_name, email } = req.body;

    if (!first_name || !last_name || !email) {
        return res.status(400).json({ error: 'First name, last name, and email are required' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
    }

    try {
        // Check if the new email already exists for another user
        const [existingUsers] = await db.execute(
            'SELECT user_id FROM users WHERE email = ? AND user_id != ?',
            [email, userId]
        );
        if (existingUsers.length > 0) {
            return res.status(409).json({ error: 'Email already registered for another user' });
        }

        const [result] = await db.execute(
            'UPDATE users SET first_name = ?, last_name = ?, email = ? WHERE user_id = ? AND role = ?',
            [first_name, last_name, email, userId, 'nutritionist']
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Nutritionist not found or no changes made' });
        }
        res.json({ message: 'Nutritionist updated successfully' });
    } catch (error) {
        console.error('Error updating nutritionist:', error);
        res.status(500).json({ error: 'Failed to update nutritionist' });
    }
});

// Toggle nutritionist active status
app.patch('/api/admin/nutritionists/:userId/status', verifyAdminToken, async (req, res) => {
    const { userId } = req.params;
    const { is_active } = req.body; // Expecting { is_active: true/false }

    if (typeof is_active !== 'boolean') {
        return res.status(400).json({ error: 'is_active field must be a boolean' });
    }

    try {
        const [result] = await db.execute(
            'UPDATE users SET is_active = ? WHERE user_id = ? AND role = ?',
            [is_active, userId, 'nutritionist']
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Nutritionist not found' });
        }
        res.json({ message: `Nutritionist ${is_active ? 'activated' : 'deactivated'} successfully` });
    } catch (error) {
        console.error('Error updating nutritionist status:', error);
        res.status(500).json({ error: 'Failed to update nutritionist status' });
    }
});

// --- Executive Management Routes ---
// Get all executives
app.get('/api/admin/executives', verifyAdminToken, async (req, res) => {
    try {
        const [executives] = await db.execute(
            "SELECT user_id, first_name, last_name, email, is_active FROM users WHERE role = 'executive' ORDER BY last_name, first_name"
        );
        res.json(executives);
    } catch (error) {
        console.error('Error fetching executives:', error);
        res.status(500).json({ error: 'Failed to fetch executives' });
    }
});

// Add a new executive
app.post('/api/admin/executives', verifyAdminToken, async (req, res) => {
    const { first_name, last_name, email, password } = req.body;

    if (!first_name || !last_name || !email || !password) {
        return res.status(400).json({ error: 'All fields are required' });
    }
    if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
    }

    try {
        const [existingUsers] = await db.execute('SELECT user_id FROM users WHERE email = ?', [email]);
        if (existingUsers.length > 0) {
            return res.status(409).json({ error: 'Email already registered for another user' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await db.execute(
            'INSERT INTO users (first_name, last_name, email, password_hash, role, is_active) VALUES (?, ?, ?, ?, ?, ?)',
            [first_name, last_name, email, hashedPassword, 'executive', true]
        );
        res.status(201).json({ message: 'Executive added successfully', user_id: result.insertId });
    } catch (error) {
        console.error('Error adding executive:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Email already exists.' });
        }
        res.status(500).json({ error: 'Failed to add executive' });
    }
});

// Update executive details (Similar to nutritionists, ensure role = 'executive')
app.put('/api/admin/executives/:userId', verifyAdminToken, async (req, res) => {
    const { userId } = req.params;
    const { first_name, last_name, email } = req.body;

    if (!first_name || !last_name || !email) {
        return res.status(400).json({ error: 'First name, last name, and email are required' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
    }

    try {
        const [existingUsers] = await db.execute(
            'SELECT user_id FROM users WHERE email = ? AND user_id != ?',
            [email, userId]
        );
        if (existingUsers.length > 0) {
            return res.status(409).json({ error: 'Email already registered for another user' });
        }

        const [result] = await db.execute(
            'UPDATE users SET first_name = ?, last_name = ?, email = ? WHERE user_id = ? AND role = ?',
            [first_name, last_name, email, userId, 'executive']
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Executive not found or no changes made' });
        }
        res.json({ message: 'Executive updated successfully' });
    } catch (error) {
        console.error('Error updating executive:', error);
        res.status(500).json({ error: 'Failed to update executive' });
    }
});

// Toggle executive active status (Similar to nutritionists, ensure role = 'executive')
app.patch('/api/admin/executives/:userId/status', verifyAdminToken, async (req, res) => {
    const { userId } = req.params;
    const { is_active } = req.body;

    if (typeof is_active !== 'boolean') {
        return res.status(400).json({ error: 'is_active field must be a boolean' });
    }

    try {
        const [result] = await db.execute(
            'UPDATE users SET is_active = ? WHERE user_id = ? AND role = ?',
            [is_active, userId, 'executive']
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Executive not found' });
        }
        res.json({ message: `Executive ${is_active ? 'activated' : 'deactivated'} successfully` });
    } catch (error) {
        console.error('Error updating executive status:', error);
        res.status(500).json({ error: 'Failed to update executive status' });
    }
});
 
// Route to serve admin.html, protected by admin token
app.get('/admin.html', verifyAdminToken, (req, res) => {
    res.sendFile(__dirname + '/public/admin.html');
});

// Middleware to verify Staff (Nutritionist/Executive) JWT
const verifyStaffToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7, authHeader.length);
        jwt.verify(token, JWT_SECRET, (err, decoded) => {
            if (err || !['nutritionist', 'executive'].includes(decoded.role)) {
                // More specific error or redirect can be handled by client-side check
                return res.status(403).json({ error: 'Forbidden: Invalid or missing staff token' });
            }
            req.user = decoded;
            next();
        });
    } else {
        res.status(401).json({ error: 'Unauthorized: Missing staff token' });
    }
};

// --- Staff (Nutritionist & Executive) Authentication ---
app.post('/api/staff/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        const [users] = await db.execute(
            'SELECT user_id, password_hash, role FROM users WHERE email = ? AND role IN (?, ?)',
            [email, 'nutritionist', 'executive']
        );

        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials or not a valid staff member' });
        }

        const staffUser = users[0];
        const isPasswordValid = await bcrypt.compare(password, staffUser.password_hash);

        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { userId: staffUser.user_id, role: staffUser.role },
            JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({ message: 'Staff login successful', token, role: staffUser.role });

    } catch (error) {
        console.error('Staff login error:', error);
        res.status(500).json({ error: 'Staff login failed' });
    }
});

// Serve nutritionist dashboard, protected by staff token
app.get('/nutritionist-dashboard.html', (req, res) => { // No server-side token check here, will be done on client
    res.sendFile(__dirname + '/public/nutritionist-dashboard.html');
});

// Serve executive dashboard, protected by staff token
app.get('/executive-dashboard.html', (req, res) => { // No server-side token check here, will be done on client
    res.sendFile(__dirname + '/public/executive-dashboard.html');
});

// API endpoint for a nutritionist to get their assigned clients
app.get('/api/nutritionist/my-clients', verifyStaffToken, async (req, res) => {
    if (req.user.role !== 'nutritionist') {
        return res.status(403).json({ error: 'Forbidden: Access denied for this role' });
    }
    const nutritionistId = req.user.userId;

    try {
        // Assuming your 'clients' table has a 'nutritionist_id' column
        // and a 'is_account_active' column (or similar for active clients)
        const [clients] = await db.execute(
            `SELECT client_id, first_name, last_name, email, mobile_number 
             FROM clients 
             WHERE nutritionist_id = ? AND is_account_active = TRUE 
             ORDER BY last_name, first_name`,
            [nutritionistId]
        );
        res.json(clients);
    } catch (error) {
        console.error('Error fetching nutritionist clients:', error);
        res.status(500).json({ error: 'Failed to fetch assigned clients' });
    }
});

// API endpoint for a nutritionist to search their assigned clients
app.get('/api/nutritionist/my-clients/search', verifyStaffToken, async (req, res) => {
    if (req.user.role !== 'nutritionist') {
        return res.status(403).json({ error: 'Forbidden: Access denied for this role' });
    }
    const nutritionistId = req.user.userId;
    console.log(`[${new Date().toISOString()}] NUTRITIONIST ${nutritionistId} /api/nutritionist/my-clients/search HIT with query:`, req.query);

    try {
        let sql = `SELECT client_id, first_name, last_name, email, mobile_number 
                   FROM clients 
                   WHERE nutritionist_id = ? AND is_account_active = TRUE`;
        const params = [nutritionistId];

        if (req.query.client_id) {
            sql += " AND client_id = ?";
            params.push(req.query.client_id);
        }
        if (req.query.first_name) {
            sql += " AND first_name LIKE ?";
            params.push(`%${req.query.first_name}%`);
        }
        if (req.query.last_name) {
            sql += " AND last_name LIKE ?";
            params.push(`%${req.query.last_name}%`);
        }
        if (req.query.email) {
            sql += " AND email LIKE ?";
            params.push(`%${req.query.email}%`);
        }
        // Add mobile_number search if you added it to the form
        // if (req.query.mobile_number) {
        //     sql += " AND mobile_number LIKE ?";
        //     params.push(`%${req.query.mobile_number}%`);
        // }
        sql += " ORDER BY last_name, first_name";

        const [clients] = await db.execute(sql, params);
        res.json(clients);
    } catch (error) {
        console.error('Error searching nutritionist clients:', error);
        res.status(500).json({ error: 'Failed to search assigned clients' });
    }
});


// API endpoint for an executive to get their enrolled clients
app.get('/api/executive/my-clients', verifyStaffToken, async (req, res) => {
    if (req.user.role !== 'executive') {
        return res.status(403).json({ error: 'Forbidden: Access denied for this role' });
    }
    const executiveId = req.user.userId;

    try {
        // Assuming your 'clients' table has an 'enrolled_by_executive_id' column
        // and 'is_account_active' or similar
        const [clients] = await db.execute(
            `SELECT client_id, first_name, last_name, email, mobile_number, registration_date 
             FROM clients 
             WHERE enrolled_by_executive_id = ? 
             ORDER BY registration_date DESC, last_name, first_name`, // Example ordering
            [executiveId]
        );
        res.json(clients);
    } catch (error) {
        console.error('Error fetching executive clients:', error);
        res.status(500).json({ error: 'Failed to fetch enrolled clients' });
    }
});

// API endpoint for an executive to search their enrolled clients
app.get('/api/executive/my-clients/search', verifyStaffToken, async (req, res) => {
    if (req.user.role !== 'executive') {
        return res.status(403).json({ error: 'Forbidden: Access denied for this role' });
    }
    const executiveId = req.user.userId;
    console.log(`[${new Date().toISOString()}] EXECUTIVE ${executiveId} /api/executive/my-clients/search HIT with query:`, req.query);

    try {
        let sql = `SELECT client_id, first_name, last_name, email, mobile_number, registration_date 
                   FROM clients 
                   WHERE enrolled_by_executive_id = ?`;
        const params = [executiveId];

        if (req.query.client_id) {
            sql += " AND client_id = ?";
            params.push(req.query.client_id);
        }
        if (req.query.first_name) {
            sql += " AND first_name LIKE ?";
            params.push(`%${req.query.first_name}%`);
        }
        if (req.query.last_name) {
            sql += " AND last_name LIKE ?";
            params.push(`%${req.query.last_name}%`);
        }
        if (req.query.email) {
            sql += " AND email LIKE ?";
            params.push(`%${req.query.email}%`);
        }
        // Add mobile_number search if you added it to the form
        // if (req.query.mobile_number) {
        //     sql += " AND mobile_number LIKE ?";
        //     params.push(`%${req.query.mobile_number}%`);
        // }
        sql += " ORDER BY registration_date DESC, last_name, first_name";

        const [clients] = await db.execute(sql, params);
        res.json(clients);
    } catch (error) {
        console.error('Error searching executive clients:', error);
        res.status(500).json({ error: 'Failed to search enrolled clients' });
    }
});

// --- Admin Client Management Routes ---
// Get all clients for Admin
app.get('/api/admin/clients', verifyAdminToken, async (req, res) => {
    try {
        // Fetching more details including nutritionist and executive names if available
        const [clients] = await db.execute(`
            SELECT 
                c.client_id, c.first_name, c.last_name, c.email, c.mobile_number, 
                c.registration_date, c.is_email_verified, c.is_account_active,
                c.nutritionist_id, 
                CONCAT(nutri.first_name, ' ', nutri.last_name) as nutritionist_name,
                c.enrolled_by_executive_id,
                CONCAT(exec.first_name, ' ', exec.last_name) as executive_name
            FROM clients c
            LEFT JOIN users nutri ON c.nutritionist_id = nutri.user_id AND nutri.role = 'nutritionist'
            LEFT JOIN users exec ON c.enrolled_by_executive_id = exec.user_id AND exec.role = 'executive'
            ORDER BY c.registration_date DESC
        `);
        res.json(clients);
    } catch (error) {
        console.error('Error fetching all clients for admin:', error);
        res.status(500).json({ error: 'Failed to fetch clients' });
    }
});

// Toggle client account active status by Admin
app.patch('/api/admin/clients/:clientId/status', verifyAdminToken, async (req, res) => {
    const { clientId } = req.params;
    const { is_active } = req.body; // Expecting { is_active: true/false }

    if (typeof is_active !== 'boolean') {
        return res.status(400).json({ error: 'is_active field must be a boolean' });
    }

    try {
        const [result] = await db.execute(
            'UPDATE clients SET is_account_active = ? WHERE client_id = ?',
            [is_active, clientId]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Client not found' });
        }

        // If account was activated, send an email to the client
        if (is_active) {
            const [clients] = await db.execute('SELECT email, first_name FROM clients WHERE client_id = ?', [clientId]);
            if (clients.length > 0) {
                const client = clients[0];
                const mailOptions = {
                    from: `"Consultation Service" <${EMAIL_USER}>`,
                    to: client.email,
                    subject: 'Your Account Has Been Activated!',
                    html: `
                        <p>Dear ${client.first_name},</p>
                        <p>Great news! Your account with Consultation Service has been activated by our admin team.</p>
                        <p>You can now log in using your registered email address and the password you created during registration.</p>
                        <p>If you have any questions or need assistance, please feel free to contact us.</p>
                        <p>Welcome aboard!</p>
                        <p>Sincerely,<br>The Consultation Service Team</p>
                    `,
                };
                try {
                    await transporter.sendMail(mailOptions);
                    console.log(`Sent account activation email to ${client.email}`);
                } catch (emailError) {
                    console.error('Error sending activation email:', emailError);
                    // Don't fail the whole request, but log the error
                }
            }
        }
        res.json({ message: `Client account ${is_active ? 'activated' : 'deactivated'} successfully` });
    } catch (error) {
        console.error('Error updating client account status:', error);
        res.status(500).json({ error: 'Failed to update client account status' });
    }
});

// Admin: Assign Nutritionist to Client
app.patch('/api/admin/clients/:clientId/assign-nutritionist', verifyAdminToken, async (req, res) => {
    const { clientId } = req.params;
    const { staff_id } = req.body; // staff_id here is the nutritionist's user_id

    if (!staff_id) {
        return res.status(400).json({ error: 'Nutritionist ID (staff_id) is required.' });
    }

    try {
        // Optional: Verify staff_id is a valid active nutritionist
        const [nutritionistUser] = await db.execute("SELECT user_id FROM users WHERE user_id = ? AND role = 'nutritionist' AND is_active = TRUE", [staff_id]);
        if (nutritionistUser.length === 0) {
            return res.status(404).json({ error: 'Active nutritionist not found with the provided ID.' });
        }

        const [result] = await db.execute(
            'UPDATE clients SET nutritionist_id = ? WHERE client_id = ?',
            [staff_id, clientId]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Client not found or no change made.' });
        }
        res.json({ message: 'Nutritionist assigned successfully to client.' });
    } catch (error) {
        console.error('Error assigning nutritionist to client:', error);
        res.status(500).json({ error: 'Failed to assign nutritionist.' });
    }
});

// Admin: Assign Executive to Client
app.patch('/api/admin/clients/:clientId/assign-executive', verifyAdminToken, async (req, res) => {
    const { clientId } = req.params;
    const { staff_id } = req.body; // staff_id here is the executive's user_id

    if (!staff_id) {
        return res.status(400).json({ error: 'Executive ID (staff_id) is required.' });
    }

    try {
        // Optional: Verify staff_id is a valid active executive
        const [executiveUser] = await db.execute("SELECT user_id FROM users WHERE user_id = ? AND role = 'executive' AND is_active = TRUE", [staff_id]);
        if (executiveUser.length === 0) {
            return res.status(404).json({ error: 'Active executive not found with the provided ID.' });
        }

        const [result] = await db.execute(
            'UPDATE clients SET enrolled_by_executive_id = ? WHERE client_id = ?',
            [staff_id, clientId]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Client not found or no change made.' });
        }
        res.json({ message: 'Executive linked successfully to client.' });
    } catch (error) {
        console.error('Error linking executive to client:', error);
        res.status(500).json({ error: 'Failed to link executive.' });
    }
});

// Admin: Get specific client details
app.get('/api/admin/clients/:clientId/details', verifyAdminToken, async (req, res) => {
    const { clientId } = req.params;
    try {
        const [clients] = await db.execute(
            'SELECT client_id, first_name, last_name, email, mobile_number FROM clients WHERE client_id = ?',
            [clientId]
        );
        if (clients.length === 0) {
            return res.status(404).json({ error: 'Client not found' });
        }
        res.json(clients[0]);
    } catch (error) {
        console.error('Error fetching client details for admin:', error);
        res.status(500).json({ error: 'Failed to fetch client details' });
    }
});

// Admin: Update specific client details
app.put('/api/admin/clients/:clientId/details', verifyAdminToken, async (req, res) => {
    const { clientId } = req.params;
    const { first_name, last_name, email, mobile_number } = req.body;

    if (!first_name || !last_name || !email || !mobile_number) {
        return res.status(400).json({ error: 'All fields (first_name, last_name, email, mobile_number) are required' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
    }

    try {
        // Check if the new email already exists for another client
        const [existingClients] = await db.execute(
            'SELECT client_id FROM clients WHERE email = ? AND client_id != ?',
            [email, clientId]
        );
        if (existingClients.length > 0) {
            return res.status(409).json({ error: 'Email already registered for another client' });
        }

        const [result] = await db.execute(
            'UPDATE clients SET first_name = ?, last_name = ?, email = ?, mobile_number = ? WHERE client_id = ?',
            [first_name, last_name, email, mobile_number, clientId]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Client not found or no changes made' });
        }
        res.json({ message: 'Client details updated successfully' });
    } catch (error) {
        console.error('Error updating client details by admin:', error);
        res.status(500).json({ error: 'Failed to update client details' });
    }
});

// Admin: Search Clients
app.get('/api/admin/clients/search', verifyAdminToken, async (req, res) => {
    console.log(`[${new Date().toISOString()}] /api/admin/clients/search HIT with query:`, req.query);
    try {
        let baseQuery = `
            SELECT 
                c.client_id, c.first_name, c.last_name, c.email, c.mobile_number, 
                c.registration_date, c.is_email_verified, c.is_account_active,
                c.nutritionist_id, 
                CONCAT(nutri.first_name, ' ', nutri.last_name) as nutritionist_name,
                c.enrolled_by_executive_id,
                CONCAT(exec.first_name, ' ', exec.last_name) as executive_name
            FROM clients c
            LEFT JOIN users nutri ON c.nutritionist_id = nutri.user_id AND nutri.role = 'nutritionist'
            LEFT JOIN users exec ON c.enrolled_by_executive_id = exec.user_id AND exec.role = 'executive'
        `;
        const conditions = [];
        const params = [];

        if (req.query.client_id) {
            conditions.push("c.client_id = ?");
            params.push(req.query.client_id);
        }
        if (req.query.first_name) {
            conditions.push("c.first_name LIKE ?");
            params.push(`%${req.query.first_name}%`);
        }
        if (req.query.last_name) {
            conditions.push("c.last_name LIKE ?");
            params.push(`%${req.query.last_name}%`);
        }
        if (req.query.email) {
            conditions.push("c.email LIKE ?");
            params.push(`%${req.query.email}%`);
        }
        // Add mobile_number search if needed
        // if (req.query.mobile_number) {
        //     conditions.push("c.mobile_number LIKE ?");
        //     params.push(`%${req.query.mobile_number}%`);
        // }

        if (conditions.length > 0) {
            baseQuery += " WHERE " + conditions.join(" AND ");
        }
        baseQuery += " ORDER BY c.registration_date DESC";

        const [clients] = await db.execute(baseQuery, params);
        res.json(clients);
    } catch (error) {
        console.error('Error searching clients for admin:', error);
        res.status(500).json({ error: 'Failed to search clients' });
    }
});

// --- Client Staff Selection API Routes ---

// API to list active nutritionists for client selection
app.get('/api/staff/list/nutritionists', async (req, res) => { // No token needed, public list
    console.log(`[${new Date().toISOString()}] Request received for /api/staff/list/nutritionists`); // Adjusted log
    try {
        const [nutritionists] = await db.execute(
            "SELECT user_id, first_name, last_name FROM users WHERE role = 'nutritionist' AND is_active = TRUE ORDER BY last_name, first_name"
        );
        res.json(nutritionists);
    } catch (error) {
        console.error('Error fetching list of nutritionists:', error);
        res.status(500).json({ error: 'Failed to fetch nutritionists list.' });
    }
});

// API to list active executives for client selection
app.get('/api/staff/list/executives', async (req, res) => { // No token needed, public list
    console.log(`[${new Date().toISOString()}] Request received for /api/staff/list/executives`);
    try {
        const [executives] = await db.execute(
            "SELECT user_id, first_name, last_name FROM users WHERE role = 'executive' AND is_active = TRUE ORDER BY last_name, first_name"
        );
        res.json(executives);
    } catch (error) {
        console.error('Error fetching list of executives:', error);
        res.status(500).json({ error: 'Failed to fetch executives list.' });
    }
});

// API for client to update their staff preferences
// This endpoint should be protected by client authentication (once client login is implemented)
// For now, let's assume client_id is passed in the body for simplicity,
// but in a real app, it would come from the client's JWT.
app.post('/api/client/update-staff-preference', async (req, res) => {
    // IMPORTANT: In a real app, get client_id from a verified client JWT
    const { client_id, nutritionist_id, executive_id } = req.body; 
    const ADMIN_USER_ID = 3; // **IMPORTANT**: Replace with your actual admin user_id from the 'users' table

    if (!client_id) {
        return res.status(400).json({ error: 'Client ID is required.' });
    }

    // Use admin ID as default if no selection is made or if '0' or empty string is passed
    const finalNutritionistId = (nutritionist_id && nutritionist_id !== "0" && nutritionist_id !== "") ? nutritionist_id : ADMIN_USER_ID;
    const finalExecutiveId = (executive_id && executive_id !== "0" && executive_id !== "") ? executive_id : ADMIN_USER_ID;

    try {
        const [result] = await db.execute(
            'UPDATE clients SET nutritionist_id = ?, enrolled_by_executive_id = ? WHERE client_id = ?',
            [finalNutritionistId, finalExecutiveId, client_id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Client not found or no update made.' });
        }
        res.json({ message: 'Staff preferences updated successfully.' });

    } catch (error) {
        console.error('Error updating client staff preferences:', error);
        res.status(500).json({ error: 'Failed to update staff preferences.' });
    }
});

// --- Client Authentication ---
app.post('/api/client/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        const [clients] = await db.execute(
            'SELECT client_id, password_hash, is_email_verified, is_account_active FROM clients WHERE email = ?',
            [email]
        );

        if (clients.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials or client not found' });
        }

        const client = clients[0];

        if (!client.is_email_verified) {
            return res.status(403).json({ error: 'Email not verified. Please verify your email first.' });
        }

        if (!client.is_account_active) {
            return res.status(403).json({ error: 'Account is not active. Please contact support.' });
        }

        const isPasswordValid = await bcrypt.compare(password, client.password_hash);

        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { clientId: client.client_id, email: client.email }, // Add relevant client info to token
            JWT_SECRET,
            { expiresIn: '1h' } // Token expires in 1 hour
        );
        res.json({ message: 'Client login successful', token });
    } catch (error) {
        console.error('Client login error:', error);
        res.status(500).json({ error: 'Client login failed' });
    }
});

// Middleware to verify Client JWT
const verifyClientToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7, authHeader.length);
        jwt.verify(token, JWT_SECRET, (err, decoded) => {
            if (err) {
                console.error('[verifyClientToken] JWT verification error:', err.name, err.message);
                return res.status(403).json({ error: `Forbidden: Token verification failed (${err.name})` });
            }
            // Ensure it's a client token, e.g., by checking for clientId
            if (!decoded || !decoded.clientId) {
                console.error('[verifyClientToken] Verification failed. Decoded payload:', decoded, 'clientId missing.');
                return res.status(403).json({ error: 'Forbidden: Invalid client token' });
            }
            req.client = decoded; // Add client info to request object
            next();
        });
    } else {
        console.log('[verifyClientToken] Unauthorized: Missing client token in headers.');
        res.status(401).json({ error: 'Unauthorized: Missing client token' });
    }
};

// API endpoint for client to get their own details
app.get('/api/client/me', verifyClientToken, async (req, res) => {
    try {
        const [clients] = await db.execute('SELECT client_id, first_name, last_name, email FROM clients WHERE client_id = ?', [req.client.clientId]);
        if (clients.length === 0) {
            return res.status(404).json({ error: 'Client not found' });
        }
        res.json(clients[0]);
    } catch (error) {
        console.error('Error fetching client details for /api/client/me:', error);
        res.status(500).json({ error: 'Failed to fetch client details' });
    }
});

// API endpoint for client to save/update their personal details
app.post('/api/client/personal-details', verifyClientToken, async (req, res) => {
    console.log(`[${new Date().toISOString()}] HIT: POST /api/client/personal-details`); // <-- ADD THIS LINE
    const clientId = req.client.clientId; // Get clientId from verified token
    const {
        first_name, last_name, mobile_number, email, // Core details, might also be updatable here
        height_cms, weight_kg, age_years, gender, marital_status,
        address_1, address_2, address_3, city, pincode,
        shift_duty, joint_family, is_vegetarian, is_non_vegetarian, is_vegan, is_jain,
        has_lactose_intolerance, date_of_payment: raw_date_of_payment, reference_source,
        // health_executive_id, // This is enrolled_by_executive_id, handle separately if needed or via admin
        health_issues, food_liking, food_disliking,
        job_description, job_timings, sedentary_status, travelling_frequency
    } = req.body;

    // Basic validation (you can add more specific validation as needed)
    if (!first_name || !last_name || !email || !mobile_number) {
        return res.status(400).json({ error: 'Basic contact information (name, email, mobile) is required.' });
    }

    // Handle date_of_payment: convert empty string to null
    const date_of_payment = (raw_date_of_payment === '' || raw_date_of_payment === undefined) ? null : raw_date_of_payment;

    try {
        // Check if the new email (if changed) already exists for another client
        const [existingClients] = await db.execute(
            'SELECT client_id FROM clients WHERE email = ? AND client_id != ?',
            [email, clientId]
        );
        if (existingClients.length > 0) {
            return res.status(409).json({ error: 'Email already registered for another client.' });
        }

        // Construct the SQL query dynamically based on provided fields
        // For simplicity, this example updates all fields.
        // In a more complex scenario, you might only update fields that are actually sent.
        const sql = `
            UPDATE clients SET
            first_name = ?, last_name = ?, mobile_number = ?, email = ?,
            height_cms = ?, weight_kg = ?, age_years = ?, gender = ?, marital_status = ?,
            address_1 = ?, address_2 = ?, address_3 = ?, city = ?, pincode = ?,
            shift_duty = ?, joint_family = ?, is_vegetarian = ?, is_non_vegetarian = ?, is_vegan = ?, is_jain = ?,
            has_lactose_intolerance = ?, date_of_payment = ?, reference_source = ?,
            health_issues = ?, food_liking = ?, food_disliking = ?,
            job_description = ?, job_timings = ?, sedentary_status = ?, travelling_frequency = ?,
            last_updated_personal_details = CURRENT_TIMESTAMP
            WHERE client_id = ?
        `;
        const params = [
            first_name, last_name, mobile_number, email,
            height_cms, weight_kg, age_years, gender, marital_status,
            address_1, address_2, address_3, city, pincode,
            shift_duty, joint_family, is_vegetarian, is_non_vegetarian, is_vegan, is_jain,
            has_lactose_intolerance, date_of_payment, reference_source,
            health_issues, food_liking, food_disliking,
            job_description, job_timings, sedentary_status, travelling_frequency,
            clientId
        ];

        const [result] = await db.execute(sql, params);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Client not found or no changes made.' });
        }

        res.json({ message: 'Personal details updated successfully.' });

    } catch (error) {
        console.error('Error updating client personal details:', error);
        res.status(500).json({ error: 'Failed to update personal details.' });
    }
});

// API endpoint for client to GET their own full personal details
app.get('/api/client/me/personal-details', verifyClientToken, async (req, res) => {
    const clientId = req.client.clientId;
    try {
        const [clients] = await db.execute(
            `SELECT 
                first_name, last_name, mobile_number, email,
                height_cms, weight_kg, age_years, gender, marital_status,
                address_1, address_2, address_3, city, pincode,
                shift_duty, joint_family, is_vegetarian, is_non_vegetarian, is_vegan, is_jain,
                has_lactose_intolerance, date_of_payment, reference_source,
                health_issues, food_liking, food_disliking,
                job_description, job_timings, sedentary_status, travelling_frequency,
                enrolled_by_executive_id, nutritionist_id 
            FROM clients 
            WHERE client_id = ?`,
            [clientId]
        );
        if (clients.length === 0) {
            return res.status(404).json({ error: 'Client not found' });
        }
        res.json(clients[0]); // Send all fetched details
    } catch (error) {
        console.error('Error fetching client personal details for /api/client/me/personal-details:', error);
        res.status(500).json({ error: 'Failed to fetch your personal details' });
    }
});

// API endpoint for client to save their blood test results
app.post('/api/client/blood-tests', verifyClientToken, async (req, res) => {
    const clientId = req.client.clientId;
    const formData = req.body; // This is the raw data from the client

    console.log(`[${new Date().toISOString()}] /api/client/blood-tests HIT for clientId: ${clientId}`);
    console.log('Received blood test formData:', JSON.stringify(formData, null, 2));
    // Extract report dates, convert empty strings to null
    const report_date_1 = formData.report_date_1 || null;
    const report_date_2 = formData.report_date_2 || null;
    const report_date_3 = formData.report_date_3 || null;
    const report_date_4 = formData.report_date_4 || null;
    const report_date_5 = formData.report_date_5 || null;

    console.log('Parsed report dates:', { report_date_1, report_date_2, report_date_3, report_date_4, report_date_5 });
    // Basic validation: at least one report date should ideally be present if saving a report
    // This is optional and depends on your requirements.
    // if (!report_date_1 && !report_date_2 && !report_date_3 && !report_date_4 && !report_date_5) {
    //     return res.status(400).json({ error: 'At least one report date must be provided.' });
    // }

    const connection = await db.getConnection(); // Get a connection from the pool for transaction

    try {
        await connection.beginTransaction();

        console.log('Transaction started.');
        // 1. Insert into client_blood_test_reports
        const [reportResult] = await connection.execute(
            `INSERT INTO client_blood_test_reports (client_id, report_date_1, report_date_2, report_date_3, report_date_4, report_date_5)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [clientId, report_date_1, report_date_2, report_date_3, report_date_4, report_date_5]
        );
        const reportId = reportResult.insertId;
        console.log('Inserted into client_blood_test_reports, reportId:', reportId);

        // 2. Prepare and insert into client_blood_test_results
        const testResults = [];
        const testData = {}; // To group values by test_code

        for (const key in formData) {
            if (key.startsWith('report_date_')) continue; // Skip already processed report dates

            const parts = key.match(/^([a-zA-Z0-9_]+)_d([1-5])$/);
            if (parts) {
                const testCode = parts[1];
                const dateIndex = parts[2]; // 1 to 5

                if (!testData[testCode]) {
                    testData[testCode] = { value_d1: null, value_d2: null, value_d3: null, value_d4: null, value_d5: null };
                }
                testData[testCode][`value_d${dateIndex}`] = formData[key] === '' ? null : formData[key];
            }
        }

        console.log('Processed testData object:', JSON.stringify(testData, null, 2));
        for (const testCode in testData) {
            if (Object.values(testData[testCode]).some(val => val !== null)) { // Only insert if there's at least one value
                testResults.push([
                    reportId,
                    testCode,
                    testData[testCode].value_d1,
                    testData[testCode].value_d2,
                    testData[testCode].value_d3,
                    testData[testCode].value_d4,
                    testData[testCode].value_d5
                ]);
            }
        }

        console.log('Prepared testResults for bulk insert (first 5 rows if many):', JSON.stringify(testResults.slice(0,5), null, 2));
        console.log('Total testResult rows to insert:', testResults.length);

        if (testResults.length > 0) {
            const [resultsInsertResult] = await connection.query( // Capture result
                'INSERT INTO client_blood_test_results (report_id, test_code, value_d1, value_d2, value_d3, value_d4, value_d5) VALUES ?',
                [testResults] // Bulk insert
            );
            console.log('Bulk insert into client_blood_test_results result:', resultsInsertResult);
        } else {
            console.log('No test results to insert into client_blood_test_results.');
        }

        await connection.commit();
        console.log('Transaction committed successfully.');
        res.json({ message: 'Blood test results saved successfully.', reportId: reportId });

    } catch (error) {
        if (connection) await connection.rollback(); // Ensure connection exists before rollback
        console.error('Error saving blood test results (ROLLBACK EXECUTED):', error);
        res.status(500).json({ error: 'Failed to save blood test results.' });
    } finally {
        if (connection) connection.release();
    }
});

// API endpoint for client to GET their latest blood test results
app.get('/api/client/blood-tests/latest', verifyClientToken, async (req, res) => {
    const clientId = req.client.clientId;
    console.log(`[${new Date().toISOString()}] /api/client/blood-tests/latest HIT for clientId: ${clientId}`);

    try {
        // 1. Get the latest report_id for the client
        const [latestReportMeta] = await db.execute(
            `SELECT report_id, report_date_1, report_date_2, report_date_3, report_date_4, report_date_5
             FROM client_blood_test_reports
             WHERE client_id = ?
             ORDER BY created_at DESC 
             LIMIT 1`,
            [clientId]
        );

        if (latestReportMeta.length === 0) {
            return res.json({ message: 'No blood test reports found for this client.' }); // Not an error, just no data
        }

        const report = latestReportMeta[0];
        const reportId = report.report_id;

        // 2. Get all results for that report_id
        const [results] = await db.execute(
            `SELECT test_code, value_d1, value_d2, value_d3, value_d4, value_d5
             FROM client_blood_test_results
             WHERE report_id = ?`,
            [reportId]
        );

        // Combine report dates and results into a single response object
        const fullReportData = {
            ...report, // Includes report_id and the 5 report_date_N fields
            results: results // Array of test results
        };

        res.json(fullReportData);
    } catch (error) {
        console.error('Error fetching latest blood test results:', error);
        res.status(500).json({ error: 'Failed to fetch latest blood test results.' });
    }
});

// API endpoint for client to save their food plan
app.post('/api/client/food-plan', verifyClientToken, async (req, res) => {
    const clientId = req.client.clientId;
    const { hourly_plan, additional_personal_recommendations } = req.body;

    console.log(`[${new Date().toISOString()}] /api/client/food-plan HIT for clientId: ${clientId}`);
    console.log('Received food plan data:', JSON.stringify(req.body, null, 2));

    if (!hourly_plan || typeof hourly_plan !== 'object') {
        return res.status(400).json({ error: 'Hourly plan data is missing or invalid.' });
    }

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();
        console.log('Food plan save: Transaction started.');

        // Step 1: Set all existing plans for this client to is_latest = FALSE
        await connection.execute(
            'UPDATE client_food_plans SET is_latest = FALSE WHERE client_id = ?',
            [clientId]
        );
        console.log(`Food plan save: Marked existing plans as not latest for client_id: ${clientId}`);

        // Step 2: Insert the new food plan into client_food_plans
        const [planResult] = await connection.execute(
            'INSERT INTO client_food_plans (client_id, additional_personal_recommendations, is_latest) VALUES (?, ?, TRUE)',
            [clientId, additional_personal_recommendations]
        );
        const planId = planResult.insertId;
        console.log(`Food plan save: Inserted into client_food_plans, planId: ${planId}`);

        // Step 3: Prepare and insert hourly details
        const hourlyDetailsToInsert = [];
        for (const timeSlot in hourly_plan) {
            if (hourly_plan.hasOwnProperty(timeSlot)) {
                const slotData = hourly_plan[timeSlot];
                // Only insert if at least one field for the time slot has data
                if (slotData.present_intake || slotData.proposed_structure || slotData.additional_points) {
                    hourlyDetailsToInsert.push([
                        planId,
                        timeSlot, // e.g., "06:00"
                        slotData.present_intake || null,
                        slotData.proposed_structure || null,
                        slotData.additional_points || null
                    ]);
                }
            }
        }

        if (hourlyDetailsToInsert.length > 0) {
            await connection.query(
                'INSERT INTO client_food_plan_hourly_details (plan_id, time_slot, present_intake, proposed_structure, additional_points) VALUES ?',
                [hourlyDetailsToInsert] // Bulk insert
            );
            console.log(`Food plan save: Inserted ${hourlyDetailsToInsert.length} hourly details for planId: ${planId}`);
        } else {
            console.log(`Food plan save: No hourly details to insert for planId: ${planId}`);
        }

        await connection.commit();
        console.log('Food plan save: Transaction committed successfully.');
        res.json({ message: 'Food plan saved successfully.', planId: planId });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Error saving food plan (ROLLBACK EXECUTED):', error);
        res.status(500).json({ error: 'Failed to save food plan.' });
    } finally {
        if (connection) connection.release();
    }
});

// API endpoint for clients to GET general food recommendations
app.get('/api/general-food-recommendations', async (req, res) => { // No client token needed, public info
    console.log(`[${new Date().toISOString()}] /api/general-food-recommendations HIT`);
    try {
        // Fetch the most recent (or only) general recommendation
        // Assuming we'll mostly have one row that gets updated, or we take the latest if multiple exist.
        const [rows] = await db.execute(
            'SELECT recommendations_text FROM general_food_recommendations ORDER BY updated_at DESC LIMIT 1'
        );

        if (rows.length > 0) {
            res.json({ recommendations: rows[0].recommendations_text });
        } else {
            res.json({ recommendations: 'No general recommendations are currently set.' });
        }
    } catch (error) {
        console.error('Error fetching general food recommendations:', error);
        res.status(500).json({ error: 'Failed to fetch general food recommendations.' });
    }
});

// API endpoint for ADMIN to SET/UPDATE general food recommendations
app.post('/api/admin/general-food-recommendations', verifyAdminToken, async (req, res) => {
    const { recommendations_text } = req.body;
    const adminUserId = req.user.userId; // From verifyAdminToken

    console.log(`[${new Date().toISOString()}] ADMIN /api/admin/general-food-recommendations HIT by admin_id: ${adminUserId}`);

    if (typeof recommendations_text === 'undefined') { // Allow empty string, but not missing field
        return res.status(400).json({ error: 'recommendations_text field is required.' });
    }

    try {
        // Simple approach: Delete existing and insert new, or update if one exists.
        // For simplicity, let's assume we update row with id=1, or insert if it doesn't exist.
        // A more robust way might be to always update the single row or create if not present.
        await db.execute(
            'INSERT INTO general_food_recommendations (id, recommendations_text, last_updated_by) VALUES (1, ?, ?) ON DUPLICATE KEY UPDATE recommendations_text = VALUES(recommendations_text), last_updated_by = VALUES(last_updated_by)',
            [recommendations_text, adminUserId]
        );
        res.json({ message: 'General food recommendations updated successfully.' });
    } catch (error) {
        console.error('Error updating general food recommendations by admin:', error);
        res.status(500).json({ error: 'Failed to update general food recommendations.' });
    }
});

// API endpoint for client to save/update their medical history
app.post('/api/client/medical-history', verifyClientToken, async (req, res) => {
    const clientId = req.client.clientId;
    const { self_medical_history, family_medical_history, medications, is_final_submission } = req.body;

    console.log(`[${new Date().toISOString()}] /api/client/medical-history HIT for clientId: ${clientId}`);
    console.log('Received medical history data:', JSON.stringify(req.body, null, 2));

    if (typeof self_medical_history === 'undefined' || typeof family_medical_history === 'undefined') {
        return res.status(400).json({ error: 'Self and family medical history fields are required, even if empty.' });
    }

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();
        console.log('Medical history save: Transaction started.');

        // Step 1: Insert the new medical history into client_medical_history
        // We'll always create a new record for simplicity in this version.
        // A more complex version might update an existing non-finalized record.
        const [historyResult] = await connection.execute(
            'INSERT INTO client_medical_history (client_id, self_medical_history, family_medical_history, is_finalized) VALUES (?, ?, ?, ?)',
            [clientId, self_medical_history, family_medical_history, is_final_submission || false]
        );
        const historyId = historyResult.insertId;
        console.log(`Medical history save: Inserted into client_medical_history, historyId: ${historyId}`);

        // Step 2: Prepare and insert medications, if any
        if (medications && Array.isArray(medications) && medications.length > 0) {
            const medicationsToInsert = medications.map(med => [
                historyId,
                med.diagnosis || null,
                med.name || null, // Assuming 'name' is 'medicine_name'
                med.power || null,
                med.time || null,  // Assuming 'time' is 'timing'
                med.since || null // Assuming 'since' is 'since_when'
            ]);

            if (medicationsToInsert.length > 0) {
                await connection.query(
                    'INSERT INTO client_medications (history_id, diagnosis, medicine_name, power, timing, since_when) VALUES ?',
                    [medicationsToInsert] // Bulk insert
                );
                console.log(`Medical history save: Inserted ${medicationsToInsert.length} medications for historyId: ${historyId}`);
            }
        } else {
            console.log(`Medical history save: No medications to insert for historyId: ${historyId}`);
        }

        await connection.commit();
        console.log('Medical history save: Transaction committed successfully.');
        res.json({ message: `Medical history ${is_final_submission ? 'submitted' : 'saved'} successfully.`, historyId: historyId });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Error saving medical history (ROLLBACK EXECUTED):', error);
        res.status(500).json({ error: 'Failed to save medical history.' });
    } finally {
        if (connection) connection.release();
    }
});

// API endpoint for client to GET their latest medical history
app.get('/api/client/medical-history/latest', verifyClientToken, async (req, res) => {
    const clientId = req.client.clientId;
    console.log(`[${new Date().toISOString()}] /api/client/medical-history/latest HIT for clientId: ${clientId}`);

    try {
        // 1. Get the latest history_id for the client
        const [latestHistoryMeta] = await db.execute(
            `SELECT history_id, self_medical_history, family_medical_history, is_finalized, created_at, updated_at
             FROM client_medical_history
             WHERE client_id = ?
             ORDER BY updated_at DESC 
             LIMIT 1`,
            [clientId]
        );

        if (latestHistoryMeta.length === 0) {
            return res.json({ message: 'No medical history found for this client.' });
        }

        const history = latestHistoryMeta[0];
        const historyId = history.history_id;

        // 2. Get all medications for that history_id
        const [medications] = await db.execute(
            `SELECT medication_id, diagnosis, medicine_name, power, timing, since_when
             FROM client_medications
             WHERE history_id = ?`,
            [historyId]
        );

        res.json({ ...history, medications: medications });
    } catch (error) {
        console.error('Error fetching latest medical history:', error);
        res.status(500).json({ error: 'Failed to fetch latest medical history.' });
    }
});

// Admin: Get latest food plan for a specific client
app.get('/api/admin/clients/:clientId/food-plan/latest', verifyAdminToken, async (req, res) => {
    const { clientId } = req.params;
    console.log(`[${new Date().toISOString()}] ADMIN /api/admin/clients/${clientId}/food-plan/latest HIT`);

    try {
        // 1. Get the latest plan_id for the client
        const [latestPlanMeta] = await db.execute(
            `SELECT plan_id, additional_personal_recommendations, created_at, updated_at
             FROM client_food_plans
             WHERE client_id = ? AND is_latest = TRUE
             ORDER BY updated_at DESC 
             LIMIT 1`,
            [clientId]
        );

        if (latestPlanMeta.length === 0) {
            return res.json({ message: 'No food plan found for this client.' });
        }

        const plan = latestPlanMeta[0];
        const planId = plan.plan_id;

        // 2. Get all hourly details for that plan_id
        const [hourlyDetails] = await db.execute(
            `SELECT time_slot, present_intake, proposed_structure, additional_points
             FROM client_food_plan_hourly_details
             WHERE plan_id = ?
             ORDER BY time_slot ASC`, // Ensure consistent order
            [planId]
        );

        res.json({ 
            ...plan, 
            hourly_details: hourlyDetails 
        });
    } catch (error) {
        console.error(`Error fetching latest food plan for client ${clientId} by admin:`, error);
        res.status(500).json({ error: 'Failed to fetch latest food plan for client.' });
    }
});

// Admin: Save/Update food plan for a specific client
app.post('/api/admin/clients/:clientId/food-plan', verifyAdminToken, async (req, res) => {
    const { clientId } = req.params;
    const adminUserId = req.user.userId; // Admin who is making the change
    const { hourly_plan, additional_personal_recommendations } = req.body;

    console.log(`[${new Date().toISOString()}] ADMIN /api/admin/clients/${clientId}/food-plan POST HIT by admin_id: ${adminUserId}`);
    console.log('Received food plan data from admin:', JSON.stringify(req.body, null, 2));

    if (!hourly_plan || typeof hourly_plan !== 'object') {
        return res.status(400).json({ error: 'Hourly plan data is missing or invalid.' });
    }

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();
        console.log(`Admin food plan save for client ${clientId}: Transaction started.`);

        // Step 1: Set all existing plans for this client to is_latest = FALSE
        await connection.execute(
            'UPDATE client_food_plans SET is_latest = FALSE WHERE client_id = ?',
            [clientId]
        );
        console.log(`Admin food plan save: Marked existing plans as not latest for client_id: ${clientId}`);

        // Step 2: Insert the new food plan into client_food_plans
        const [planResult] = await connection.execute(
            'INSERT INTO client_food_plans (client_id, additional_personal_recommendations, is_latest, created_by_admin_id) VALUES (?, ?, TRUE, ?)',
            [clientId, additional_personal_recommendations, adminUserId]
        );
        const planId = planResult.insertId;
        console.log(`Admin food plan save: Inserted into client_food_plans, planId: ${planId}`);

        // Step 3: Prepare and insert hourly details
        const hourlyDetailsToInsert = [];
        for (const timeSlot in hourly_plan) {
            if (hourly_plan.hasOwnProperty(timeSlot)) {
                const slotData = hourly_plan[timeSlot];
                if (slotData.present_intake || slotData.proposed_structure || slotData.additional_points) {
                    hourlyDetailsToInsert.push([
                        planId, timeSlot, slotData.present_intake || null,
                        slotData.proposed_structure || null, slotData.additional_points || null
                    ]);
                }
            }
        }

        if (hourlyDetailsToInsert.length > 0) {
            await connection.query(
                'INSERT INTO client_food_plan_hourly_details (plan_id, time_slot, present_intake, proposed_structure, additional_points) VALUES ?',
                [hourlyDetailsToInsert]
            );
            console.log(`Admin food plan save: Inserted ${hourlyDetailsToInsert.length} hourly details for planId: ${planId}`);
        }
        await connection.commit();
        console.log(`Admin food plan save for client ${clientId}: Transaction committed successfully.`);
        res.json({ message: 'Client food plan updated successfully by admin.', planId: planId });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error(`Error saving food plan for client ${clientId} by admin (ROLLBACK EXECUTED):`, error);
        res.status(500).json({ error: 'Failed to save client food plan.' });
    } finally {
        if (connection) connection.release();
    }
});

// Admin: Get latest medical history for a specific client
app.get('/api/admin/clients/:clientId/medical-history/latest', verifyAdminToken, async (req, res) => {
    const { clientId } = req.params;
    console.log(`[${new Date().toISOString()}] ADMIN /api/admin/clients/${clientId}/medical-history/latest HIT`);

    try {
        const [latestHistoryMeta] = await db.execute(
            `SELECT history_id, self_medical_history, family_medical_history, is_finalized, created_at, updated_at
             FROM client_medical_history
             WHERE client_id = ?
             ORDER BY updated_at DESC 
             LIMIT 1`,
            [clientId]
        );

        if (latestHistoryMeta.length === 0) {
            return res.json({ message: 'No medical history found for this client.' });
        }

        const history = latestHistoryMeta[0];
        const historyId = history.history_id;

        const [medications] = await db.execute(
            `SELECT medication_id, diagnosis, medicine_name, power, timing, since_when
             FROM client_medications
             WHERE history_id = ?`,
            [historyId]
        );
        res.json({ ...history, medications: medications });
    } catch (error) {
        console.error(`Error fetching latest medical history for client ${clientId} by admin:`, error);
        res.status(500).json({ error: 'Failed to fetch latest medical history for client.' });
    }
});

// Admin: Get personal details for a specific client
app.get('/api/admin/clients/:clientId/personal-details', verifyAdminToken, async (req, res) => {
    const { clientId } = req.params;
    console.log(`[${new Date().toISOString()}] ADMIN /api/admin/clients/${clientId}/personal-details HIT`);
    try {
        const [clients] = await db.execute(
            `SELECT 
                client_id, first_name, last_name, mobile_number, email,
                height_cms, weight_kg, age_years, gender, marital_status,
                address_1, address_2, address_3, city, pincode,
                shift_duty, joint_family, is_vegetarian, is_non_vegetarian, is_vegan, is_jain,
                has_lactose_intolerance, date_of_payment, reference_source,
                health_issues, food_liking, food_disliking,
                job_description, job_timings, sedentary_status, travelling_frequency,
                enrolled_by_executive_id, nutritionist_id, 
                registration_date, is_email_verified, is_account_active
            FROM clients 
            WHERE client_id = ?`,
            [clientId]
        );
        if (clients.length === 0) {
            return res.status(404).json({ error: 'Client not found' });
        }
        res.json(clients[0]);
    } catch (error) {
        console.error(`Error fetching personal details for client ${clientId} by admin:`, error);
        res.status(500).json({ error: 'Failed to fetch client personal details.' });
    }
});

// Admin: Get latest blood test results for a specific client
app.get('/api/admin/clients/:clientId/blood-tests/latest', verifyAdminToken, async (req, res) => {
    const { clientId } = req.params;
    console.log(`[${new Date().toISOString()}] ADMIN /api/admin/clients/${clientId}/blood-tests/latest HIT`);

    try {
        // 1. Get the latest report_id for the client
        const [latestReportMeta] = await db.execute(
            `SELECT report_id, report_date_1, report_date_2, report_date_3, report_date_4, report_date_5, created_at
             FROM client_blood_test_reports
             WHERE client_id = ?
             ORDER BY created_at DESC 
             LIMIT 1`,
            [clientId]
        );

        if (latestReportMeta.length === 0) {
            return res.json({ message: 'No blood test reports found for this client.' });
        }

        const report = latestReportMeta[0];
        const reportId = report.report_id;

        // 2. Get all results for that report_id
        const [results] = await db.execute(
            `SELECT test_code, value_d1, value_d2, value_d3, value_d4, value_d5
             FROM client_blood_test_results
             WHERE report_id = ?`,
            [reportId]
        );
        res.json({ ...report, results: results });
    } catch (error) {
        console.error(`Error fetching latest blood tests for client ${clientId} by admin:`, error);
        res.status(500).json({ error: 'Failed to fetch latest blood tests for client.' });
    }
});

// --- Staff (Nutritionist/Executive) Access to Client Details ---

// Helper function to check if staff is authorized for a client
async function isStaffAuthorizedForClient(staffId, staffRole, clientId) {
    const [clientRows] = await db.execute(
        'SELECT nutritionist_id, enrolled_by_executive_id FROM clients WHERE client_id = ?',
        [clientId]
    );
    if (clientRows.length === 0) {
        return false; // Client not found
    }
    const client = clientRows[0];
    if (staffRole === 'nutritionist' && client.nutritionist_id === staffId) {
        return true;
    }
    if (staffRole === 'executive' && client.enrolled_by_executive_id === staffId) {
        return true;
    }
    return false;
}

// Staff: Get personal details for a specific client
app.get('/api/staff/clients/:clientId/personal-details', verifyStaffToken, async (req, res) => {
    const { clientId } = req.params;
    const staffId = req.user.userId;
    const staffRole = req.user.role;

    console.log(`[${new Date().toISOString()}] STAFF (${staffRole} ${staffId}) /api/staff/clients/${clientId}/personal-details HIT`);
    if (!await isStaffAuthorizedForClient(staffId, staffRole, clientId)) {
        return res.status(403).json({ error: 'Forbidden: You are not authorized to view this client.' });
    }
    // Reuse admin logic for fetching
    try {
        const [clients] = await db.execute(
            `SELECT client_id, first_name, last_name, mobile_number, email, height_cms, weight_kg, age_years, gender, marital_status, address_1, address_2, address_3, city, pincode, shift_duty, joint_family, is_vegetarian, is_non_vegetarian, is_vegan, is_jain, has_lactose_intolerance, date_of_payment, reference_source, health_issues, food_liking, food_disliking, job_description, job_timings, sedentary_status, travelling_frequency, enrolled_by_executive_id, nutritionist_id, registration_date, is_email_verified, is_account_active FROM clients WHERE client_id = ?`,
            [clientId]
        );
        if (clients.length === 0) return res.status(404).json({ error: 'Client not found' });
        res.json(clients[0]);
    } catch (error) {
        console.error(`Error fetching personal details for client ${clientId} by staff:`, error);
        res.status(500).json({ error: 'Failed to fetch client personal details.' });
    }
});

// Staff: Get latest medical history for a specific client
app.get('/api/staff/clients/:clientId/medical-history/latest', verifyStaffToken, async (req, res) => {
    const { clientId } = req.params;
    const staffId = req.user.userId;
    const staffRole = req.user.role;

    console.log(`[${new Date().toISOString()}] STAFF (${staffRole} ${staffId}) /api/staff/clients/${clientId}/medical-history/latest HIT`);
    if (!await isStaffAuthorizedForClient(staffId, staffRole, clientId)) {
        return res.status(403).json({ error: 'Forbidden: You are not authorized to view this client.' });
    }
    try {
        const [latestHistoryMeta] = await db.execute(`SELECT history_id, self_medical_history, family_medical_history, is_finalized, created_at, updated_at FROM client_medical_history WHERE client_id = ? ORDER BY updated_at DESC LIMIT 1`, [clientId]);
        if (latestHistoryMeta.length === 0) return res.json({ message: 'No medical history found for this client.' });
        const history = latestHistoryMeta[0];
        const [medications] = await db.execute(`SELECT medication_id, diagnosis, medicine_name, power, timing, since_when FROM client_medications WHERE history_id = ?`, [history.history_id]);
        res.json({ ...history, medications: medications });
    } catch (error) {
        console.error(`Error fetching medical history for client ${clientId} by staff:`, error);
        res.status(500).json({ error: 'Failed to fetch medical history.' });
    }
});

// Staff: Get latest blood test results for a specific client
app.get('/api/staff/clients/:clientId/blood-tests/latest', verifyStaffToken, async (req, res) => {
    const { clientId } = req.params;
    const staffId = req.user.userId;
    const staffRole = req.user.role;

    console.log(`[${new Date().toISOString()}] STAFF (${staffRole} ${staffId}) /api/staff/clients/${clientId}/blood-tests/latest HIT`);
    if (!await isStaffAuthorizedForClient(staffId, staffRole, clientId)) {
        return res.status(403).json({ error: 'Forbidden: You are not authorized to view this client.' });
    }
    try {
        const [latestReportMeta] = await db.execute(`SELECT report_id, report_date_1, report_date_2, report_date_3, report_date_4, report_date_5, created_at FROM client_blood_test_reports WHERE client_id = ? ORDER BY created_at DESC LIMIT 1`, [clientId]);
        if (latestReportMeta.length === 0) return res.json({ message: 'No blood test reports found for this client.' });
        const report = latestReportMeta[0];
        const [results] = await db.execute(`SELECT test_code, value_d1, value_d2, value_d3, value_d4, value_d5 FROM client_blood_test_results WHERE report_id = ?`, [report.report_id]);
        res.json({ ...report, results: results });
    } catch (error) {
        console.error(`Error fetching blood tests for client ${clientId} by staff:`, error);
        res.status(500).json({ error: 'Failed to fetch blood tests.' });
    }
});

// Staff: Get latest food plan for a specific client
app.get('/api/staff/clients/:clientId/food-plan/latest', verifyStaffToken, async (req, res) => {
    const { clientId } = req.params;
    const staffId = req.user.userId;
    const staffRole = req.user.role;

    console.log(`[${new Date().toISOString()}] STAFF (${staffRole} ${staffId}) /api/staff/clients/${clientId}/food-plan/latest HIT`);
    if (!await isStaffAuthorizedForClient(staffId, staffRole, clientId)) {
        return res.status(403).json({ error: 'Forbidden: You are not authorized to view this client.' });
    }
    try {
        const [latestPlanMeta] = await db.execute(`SELECT plan_id, additional_personal_recommendations, created_at, updated_at FROM client_food_plans WHERE client_id = ? AND is_latest = TRUE ORDER BY updated_at DESC LIMIT 1`, [clientId]);
        if (latestPlanMeta.length === 0) return res.json({ message: 'No food plan found for this client.' });
        const plan = latestPlanMeta[0];
        const [hourlyDetails] = await db.execute(`SELECT time_slot, present_intake, proposed_structure, additional_points FROM client_food_plan_hourly_details WHERE plan_id = ? ORDER BY time_slot ASC`, [plan.plan_id]);
        res.json({ ...plan, hourly_details: hourlyDetails });
    } catch (error) {
        console.error(`Error fetching food plan for client ${clientId} by staff:`, error);
        res.status(500).json({ error: 'Failed to fetch food plan.' });
    }
});

// Nutritionist: Save/Update food plan for a specific client
app.post('/api/nutritionist/clients/:clientId/food-plan', verifyStaffToken, async (req, res) => {
    const { clientId } = req.params;
    const nutritionistId = req.user.userId;
    const { hourly_plan, additional_personal_recommendations } = req.body;

    if (req.user.role !== 'nutritionist') {
        return res.status(403).json({ error: 'Forbidden: Only nutritionists can save food plans.' });
    }
    console.log(`[${new Date().toISOString()}] NUTRITIONIST ${nutritionistId} /api/nutritionist/clients/${clientId}/food-plan POST HIT`);
    if (!await isStaffAuthorizedForClient(nutritionistId, 'nutritionist', clientId)) {
        return res.status(403).json({ error: 'Forbidden: You are not assigned to this client.' });
    }
    if (!hourly_plan || typeof hourly_plan !== 'object') {
        return res.status(400).json({ error: 'Hourly plan data is missing or invalid.' });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        await connection.execute('UPDATE client_food_plans SET is_latest = FALSE WHERE client_id = ?', [clientId]);
        const [planResult] = await connection.execute(
            'INSERT INTO client_food_plans (client_id, additional_personal_recommendations, is_latest, created_by_nutritionist_id) VALUES (?, ?, TRUE, ?)',
            [clientId, additional_personal_recommendations, nutritionistId]
        );
        const planId = planResult.insertId;
        const hourlyDetailsToInsert = Object.entries(hourly_plan).map(([timeSlot, slotData]) => [planId, timeSlot, slotData.present_intake || null, slotData.proposed_structure || null, slotData.additional_points || null]).filter(detail => detail[2] || detail[3] || detail[4]);
        if (hourlyDetailsToInsert.length > 0) {
            await connection.query('INSERT INTO client_food_plan_hourly_details (plan_id, time_slot, present_intake, proposed_structure, additional_points) VALUES ?', [hourlyDetailsToInsert]);
        }
        await connection.commit();
        res.json({ message: 'Client food plan updated successfully by nutritionist.', planId: planId });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error(`Error saving food plan for client ${clientId} by nutritionist (ROLLBACK EXECUTED):`, error);
        res.status(500).json({ error: 'Failed to save client food plan.' });
    } finally {
        if (connection) connection.release();
    }
});

  app.listen(3000, '127.0.0.1', () => {
      console.log('Server listening on http://127.0.0.1:3000');
    console.log('new message from checkin');
  });
