const express = require('express');
const router = express.Router();
const { ensureAuthenticated, ensureAdmin } = require('../middleware/auth');
const fs = require('fs');
const path = require('path');

// Dashboard Home - Main dashboard route
router.get('/dashboard', ensureAuthenticated, (req, res) => {
  // Get bot status and statistics
  const client = req.app.get('client');
  
  const botStatus = client.ws.status === 0 ? 'Online' : 'Offline';
  const botPing = Math.round(client.ws.ping) || 0;
  
  // Count total accounts across all stock folders
  const stockFolders = ['basicstock', 'bstock', 'extreme', 'fstock'];
  let totalAccounts = 0;
  
  stockFolders.forEach(folder => {
    if (fs.existsSync(`./${folder}`)) {
      const files = fs.readdirSync(`./${folder}`);
      files.forEach(file => {
        try {
          const content = fs.readFileSync(`./${folder}/${file}`, 'utf8');
          const accounts = content.split('\n').filter(line => line.trim() !== '');
          totalAccounts += accounts.length;
        } catch (err) {
          console.error(`Error reading file ${folder}/${file}:`, err);
        }
      });
    }
  });
  
  res.render('dashboard', {
    title: 'Dashboard',
    activePage: 'dashboard',
    user: req.session.user,
    botStatus,
    botPing,
    totalAccounts,
    error: req.flash('error'),
    success_msg: req.flash('success_msg'),
    error_msg: req.flash('error_msg')
  });
});

// Stock Management - List all stock categories and files
router.get('/stock', ensureAuthenticated, (req, res) => {
  const stockFolders = ['basicstock', 'bstock', 'extreme', 'fstock'];
  const stockData = {};
  
  stockFolders.forEach(folder => {
    stockData[folder] = [];
    
    if (fs.existsSync(`./${folder}`)) {
      const files = fs.readdirSync(`./${folder}`);
      
      files.forEach(file => {
        try {
          const content = fs.readFileSync(`./${folder}/${file}`, 'utf8');
          const accounts = content.split('\n').filter(line => line.trim() !== '');
          
          stockData[folder].push({
            name: file,
            count: accounts.length
          });
        } catch (err) {
          console.error(`Error reading file ${folder}/${file}:`, err);
          
          stockData[folder].push({
            name: file,
            count: 0,
            error: true
          });
        }
      });
    }
  });
  
  res.render('stock', {
    title: 'Stock Management',
    activePage: 'stock',
    user: req.session.user,
    stockData,
    error: req.flash('error'),
    success_msg: req.flash('success_msg'),
    error_msg: req.flash('error_msg')
  });
});

// View specific stock file
router.get('/stock/:folder/:file', ensureAuthenticated, (req, res) => {
  const { folder, file } = req.params;
  const filePath = `./${folder}/${file}`;
  
  // Check if folder and file exist
  if (!fs.existsSync(filePath)) {
    req.flash('error_msg', 'The requested file could not be found');
    return res.redirect('/stock');
  }
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const accounts = content.split('\n').filter(line => line.trim() !== '');
    
    res.render('view-accounts', {
      title: file,
      activePage: 'stock',
      user: req.session.user,
      folder,
      file,
      accounts,
      accountCount: accounts.length,
      error: req.flash('error'),
      success_msg: req.flash('success_msg'),
      error_msg: req.flash('error_msg')
    });
  } catch (err) {
    console.error(`Error reading file ${filePath}:`, err);
    req.flash('error_msg', 'Error reading file content');
    res.redirect('/stock');
  }
});

// Create new stock file
router.post('/stock/:folder/create', ensureAuthenticated, (req, res) => {
  const { folder } = req.params;
  const { filename } = req.body;
  
  if (!filename) {
    req.flash('error_msg', 'Filename is required');
    return res.redirect('/stock');
  }
  
  // Sanitize filename
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9_-]/g, '') + '.txt';
  const filePath = `./${folder}/${sanitizedFilename}`;
  
  // Check if folder exists
  if (!fs.existsSync(`./${folder}`)) {
    req.flash('error_msg', 'The specified folder does not exist');
    return res.redirect('/stock');
  }
  
  // Check if file already exists
  if (fs.existsSync(filePath)) {
    req.flash('error_msg', 'A file with this name already exists');
    return res.redirect('/stock');
  }
  
  try {
    // Create empty file
    fs.writeFileSync(filePath, '', 'utf8');
    req.flash('success_msg', `File ${sanitizedFilename} created successfully`);
    res.redirect(`/stock/${folder}/${sanitizedFilename}`);
  } catch (err) {
    console.error(`Error creating file ${filePath}:`, err);
    req.flash('error_msg', 'Error creating file');
    res.redirect('/stock');
  }
});

// Add accounts to stock file
router.post('/stock/:folder/:file/add', ensureAuthenticated, (req, res) => {
  const { folder, file } = req.params;
  const { accounts } = req.body;
  const filePath = `./${folder}/${file}`;
  
  if (!accounts) {
    req.flash('error_msg', 'No accounts provided');
    return res.redirect(`/stock/${folder}/${file}`);
  }
  
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    req.flash('error_msg', 'The specified file does not exist');
    return res.redirect('/stock');
  }
  
  try {
    // Read existing content
    const existingContent = fs.readFileSync(filePath, 'utf8');
    const existingAccounts = existingContent.split('\n').filter(line => line.trim() !== '');
    
    // Add new accounts (filtering out empty lines)
    const newAccounts = accounts.split('\n').filter(line => line.trim() !== '');
    
    // Combine accounts and remove duplicates
    const combinedAccounts = [...new Set([...existingAccounts, ...newAccounts])];
    
    // Write back to file
    fs.writeFileSync(filePath, combinedAccounts.join('\n'), 'utf8');
    
    req.flash('success_msg', `Added ${newAccounts.length} accounts to ${file}`);
    res.redirect(`/stock/${folder}/${file}`);
  } catch (err) {
    console.error(`Error adding accounts to ${filePath}:`, err);
    req.flash('error_msg', 'Error adding accounts to file');
    res.redirect(`/stock/${folder}/${file}`);
  }
});

// Delete stock file
router.delete('/stock/:folder/:file', ensureAuthenticated, (req, res) => {
  const { folder, file } = req.params;
  const filePath = `./${folder}/${file}`;
  
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    req.flash('error_msg', 'The specified file does not exist');
    return res.redirect('/stock');
  }
  
  try {
    fs.unlinkSync(filePath);
    req.flash('success_msg', `File ${file} deleted successfully`);
    res.redirect('/stock');
  } catch (err) {
    console.error(`Error deleting file ${filePath}:`, err);
    req.flash('error_msg', 'Error deleting file');
    res.redirect('/stock');
  }
});

// Handle file upload
router.post('/stock/:folder/:file/upload', ensureAuthenticated, (req, res) => {
  const { folder, file } = req.params;
  
  // This is a placeholder - file upload handling will be implemented 
  // with multer middleware in a future version
  req.flash('error_msg', 'File upload functionality is coming soon');
  res.redirect(`/stock/${folder}/${file}`);
});

// Login page
router.get('/login', (req, res) => {
  if (req.session.isAuthenticated) {
    return res.redirect('/dashboard');
  }
  
  res.render('login', {
    title: 'Login',
    error: req.flash('error'),
    success_msg: req.flash('success_msg'),
    error_msg: req.flash('error_msg')
  });
});

// Login authentication
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  // Basic authentication - to be enhanced in future versions
  if (username === 'admin' && password === 'admin') {
    req.session.isAuthenticated = true;
    req.session.user = {
      username: 'admin',
      isAdmin: true
    };
    
    // Redirect to original requested URL or dashboard
    const returnTo = req.session.returnTo || '/dashboard';
    delete req.session.returnTo;
    
    req.flash('success_msg', 'You are now logged in');
    res.redirect(returnTo);
  } else {
    req.flash('error_msg', 'Invalid username or password');
    res.redirect('/login');
  }
});

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

// Root route - redirect to login or dashboard
router.get('/', (req, res) => {
  if (req.session.isAuthenticated) {
    return res.redirect('/dashboard');
  }
  res.redirect('/login');
});

module.exports = router;