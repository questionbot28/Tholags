// Authentication middleware

// Check if user is authenticated
function ensureAuthenticated(req, res, next) {
  if (req.session.isAuthenticated) {
    return next();
  }
  
  // Store the requested URL to redirect after login
  req.session.returnTo = req.originalUrl;
  
  // Redirect to login page
  req.flash('error_msg', 'Please log in to access this page');
  res.redirect('/login');
}

// Check if user is admin
function ensureAdmin(req, res, next) {
  if (req.session.isAuthenticated && req.session.user.isAdmin) {
    return next();
  }
  
  // Redirect to dashboard if authenticated but not admin
  if (req.session.isAuthenticated) {
    req.flash('error_msg', 'You do not have permission to access this page');
    return res.redirect('/dashboard');
  }
  
  // Redirect to login page if not authenticated
  req.flash('error_msg', 'Please log in to access this page');
  res.redirect('/login');
}

module.exports = {
  ensureAuthenticated,
  ensureAdmin
};