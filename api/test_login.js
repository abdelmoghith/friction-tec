const fetch = require('node-fetch');

async function testLogin() {
  try {
    console.log('🧪 Testing Staff Login API...');
    
    const response = await fetch('http://localhost:3001/api/staff/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@company.com',
        password: 'admin123'
      })
    });

    console.log('Response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Login successful!');
      console.log('Token:', data.token ? 'Present' : 'Missing');
      console.log('Staff:', data.staff ? data.staff.name : 'Missing');
      console.log('Role:', data.staff ? data.staff.role : 'Missing');
      console.log('Permissions:', data.staff ? data.staff.permissions.length : 0);
      
      // Test authenticated request
      console.log('\n🔐 Testing authenticated request...');
      const staffResponse = await fetch('http://localhost:3001/api/staff', {
        headers: {
          'Authorization': `Bearer ${data.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (staffResponse.ok) {
        const staffData = await staffResponse.json();
        console.log('✅ Authenticated request successful!');
        console.log('Staff count:', staffData.length);
      } else {
        console.log('❌ Authenticated request failed:', staffResponse.status);
        const errorText = await staffResponse.text();
        console.log('Error:', errorText);
      }
      
    } else {
      const errorData = await response.json();
      console.log('❌ Login failed:', errorData.error);
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n💡 Make sure:');
    console.log('1. API server is running on port 3001');
    console.log('2. Database is connected');
    console.log('3. Staff migration has been run');
    console.log('4. Admin user exists with correct password');
  }
}

testLogin();