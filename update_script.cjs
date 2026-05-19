const fs = require('fs');

// ----- UPDATE main.js -----
let mainJs = fs.readFileSync('main.js', 'utf8');

// Replace HR_USERS and handleLogin
const hrUsersRegex = /const HR_USERS = \[\s*\{[\s\S]*?\];\s*function handleLogin\(\) \{[\s\S]*?\n\}\n/m;
const newLoginLogic = `async function handleLogin() {
  const oracleUrl = document.getElementById('login-oracle-url')
    .value.trim();
  const username = document.getElementById('login-username')
    .value.trim();
  const password = document.getElementById('login-password')
    .value.trim();
  const errorEl = document.getElementById('login-error');
  const btnText = document.getElementById('login-btn-text');
  const spinner = document.getElementById('login-spinner');
  
  // Validation
  if (!oracleUrl || !username || !password) {
    errorEl.textContent = 'Please fill in all fields';
    errorEl.style.display = 'block';
    return;
  }
  
  if (!oracleUrl.startsWith('https://')) {
    errorEl.textContent = 'Oracle URL must start with https://';
    errorEl.style.display = 'block';
    return;
  }
  
  // Show loading
  btnText.style.display = 'none';
  spinner.style.display = 'inline';
  errorEl.style.display = 'none';
  document.getElementById('login-btn').disabled = true;
  
  try {
    const response = await fetch(\`\${API_BASE}/auth/verify\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oracleUrl, username, password })
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      // Save session - store auth token and oracle URL
      sessionStorage.setItem('loggedIn', 'true');
      sessionStorage.setItem('userName', username);
      sessionStorage.setItem('oracleUrl', data.oracleUrl);
      sessionStorage.setItem('oracleAuth', data.authToken);
      
      // Update app state with dynamic credentials
      appState.oracleUrl = data.oracleUrl;
      appState.oracleAuth = data.authToken;
      
      // Hide login show app
      document.getElementById('login-screen')
        .style.display = 'none';
      document.getElementById('main-app')
        .style.display = 'block';
      
      // Show username in header
      const userBadge = document.getElementById('user-badge');
      if (userBadge) userBadge.textContent = username;
      
      console.log('Login successful for:', username);
      
    } else {
      errorEl.textContent = data.error || 'Login failed';
      errorEl.style.display = 'block';
    }
    
  } catch (err) {
    errorEl.textContent = 'Connection error. Please try again.';
    errorEl.style.display = 'block';
    console.error('Login error:', err);
    
  } finally {
    btnText.style.display = 'inline';
    spinner.style.display = 'none';
    document.getElementById('login-btn').disabled = false;
  }
}
`;
mainJs = mainJs.replace(hrUsersRegex, newLoginLogic);

// Replace session restore
const sessionRestoreRegex = /window\.addEventListener\('load', \(\) => \{[\s\S]*?\}\);/m;
const newSessionRestore = `window.addEventListener('load', () => {
  const loggedIn = sessionStorage.getItem('loggedIn');
  if (loggedIn === 'true') {
    const oracleUrl = sessionStorage.getItem('oracleUrl');
    const oracleAuth = sessionStorage.getItem('oracleAuth');
    const userName = sessionStorage.getItem('userName');
    
    // Restore session
    appState.oracleUrl = oracleUrl;
    appState.oracleAuth = oracleAuth;
    
    document.getElementById('login-screen')
      .style.display = 'none';
    document.getElementById('main-app')
      .style.display = 'block';
      
    const userBadge = document.getElementById('user-badge');
    if (userBadge && userName) userBadge.textContent = userName;
  }
});`;
mainJs = mainJs.replace(sessionRestoreRegex, newSessionRestore);

// Replace logout
const logoutRegex = /window\.logout = function\(\) \{[\s\S]*?\}\s*$/m;
const newLogout = `window.logout = function() {
  sessionStorage.clear();
  appState.oracleUrl = null;
  appState.oracleAuth = null;
  document.getElementById('login-screen')
    .style.display = 'flex';
  document.getElementById('main-app')
    .style.display = 'none';
  document.getElementById('login-username').value = '';
  document.getElementById('login-password').value = '';
  document.getElementById('login-oracle-url').value = '';
}`;
mainJs = mainJs.replace(logoutRegex, newLogout);

// Update fetch calls
// First, single argument fetch calls:
mainJs = mainJs.replace(/fetch\(\`(.*?)\`\)/g, 
  "fetch(`$1`, { headers: { 'Content-Type': 'application/json', 'x-oracle-auth': appState.oracleAuth, 'x-oracle-url': appState.oracleUrl } })"
);

// Second, fetch calls with options (already have headers)
mainJs = mainJs.replace(/headers:\s*\{\s*'Content-Type':\s*'application\/json'\s*\}/g, 
  "headers: { 'Content-Type': 'application/json', 'x-oracle-auth': appState.oracleAuth, 'x-oracle-url': appState.oracleUrl }"
);

fs.writeFileSync('main.js', mainJs);

// ----- UPDATE server.js -----
let serverJs = fs.readFileSync('../voice-action-server/server.js', 'utf8');

// Insert new route
const newRoute = `// Oracle SSO verification endpoint
app.post('/api/auth/verify', async (req, res) => {
  try {
    const { oracleUrl, username, password } = req.body;
    
    if (!oracleUrl || !username || !password) {
      return res.status(400).json({ 
        error: 'Oracle URL, username and password required' 
      });
    }
    
    // Clean the URL
    const cleanUrl = oracleUrl.replace(/\\/$/, '');
    
    console.log('Verifying Oracle credentials for:', username);
    console.log('Oracle URL:', cleanUrl);
    
    // Generate Basic Auth token
    const authToken = Buffer.from(\`\${username}:\${password}\`)
      .toString('base64');
    const authHeader = \`Basic \${authToken}\`;
    
    const https = require('https');
    const agent = new https.Agent({ rejectUnauthorized: false });
    
    // Verify by calling Oracle API
    const response = await axios.get(
      \`\${cleanUrl}/hcmRestApi/resources/11.13.18.05/workers?limit=1&fields=PersonId\`,
      {
        httpsAgent: agent,
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );
    
    if (response.status === 200) {
      console.log('Oracle credentials verified successfully');
      
      // Return success with auth token
      // Never store password - only return encoded token
      res.json({
        success: true,
        authToken: authHeader,
        oracleUrl: cleanUrl,
        username: username,
        message: 'Login successful'
      });
    }
    
  } catch (err) {
    console.error('Auth verify error:', err.response?.status);
    
    if (err.response?.status === 401) {
      res.status(401).json({ 
        error: 'Invalid Oracle username or password' 
      });
    } else if (err.code === 'ENOTFOUND' || 
               err.code === 'ECONNREFUSED') {
      res.status(400).json({ 
        error: 'Cannot connect to Oracle URL. Please check the URL.' 
      });
    } else if (err.code === 'ETIMEDOUT') {
      res.status(400).json({ 
        error: 'Connection timeout. Please check Oracle URL.' 
      });
    } else {
      res.status(500).json({ 
        error: 'Verification failed. Please try again.' 
      });
    }
  }
});

`;

if (!serverJs.includes('/api/auth/verify')) {
  serverJs = serverJs.replace('// 1. Sarvam STT Proxy', newRoute + '// 1. Sarvam STT Proxy');
}

// Update app.get, app.post, app.patch for Oracle routes
const routeRegex = /(app\.(?:get|post|patch)\('(\/api\/oracle\/[^']+)',\s*async\s*\(req,\s*res\)\s*=>\s*\{)([^]*?)(?=\n\}\);)/g;

serverJs = serverJs.replace(routeRegex, (match, signature, path, body) => {
  if (body.includes("req.headers['")) return match; // Already updated
  
  const headersInjection = `
  const oracleAuth = req.headers['x-oracle-auth'] || 
    'Basic dXNlcl9yMTRfYTJmOmhUOD8yc1U/';
  const oracleBaseUrl = req.headers['x-oracle-url'] || 
    'https://fa-eubg-test-saasfademo1.ds-fa.oraclepdemos.com';`;
    
  let updatedBody = body.replace(/process\.env\.ORACLE_BASE_URL/g, 'oracleBaseUrl');
  updatedBody = updatedBody.replace(/process\.env\.ORACLE_AUTH/g, 'oracleAuth');
  
  return signature + headersInjection + updatedBody;
});

fs.writeFileSync('../voice-action-server/server.js', serverJs);
console.log('Script completed successfully.');
