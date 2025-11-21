import fetch from 'node-fetch';

const PRODUCTION_URL = process.env.PRODUCTION_URL || 'https://vaaney-marketplace.replit.app';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'ranuka.wijayapala@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Devindha@11';

async function testImageAcl() {
  console.log('🔐 Logging in as admin...');
  const loginResponse = await fetch(`${PRODUCTION_URL}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    }),
  });

  if (!loginResponse.ok) {
    throw new Error(`Login failed: ${loginResponse.statusText}`);
  }

  const setCookie = loginResponse.headers.get('set-cookie');
  if (!setCookie) {
    throw new Error('No session cookie received');
  }

  const sessionCookie = setCookie.split(';')[0];
  console.log('✅ Logged in successfully\n');

  // Get upload URL
  console.log('📤 Getting upload URL...');
  const uploadData = await fetch(`${PRODUCTION_URL}/api/object-storage/upload-url`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': sessionCookie,
    },
  }).then(r => r.json());
  
  console.log('Upload URL obtained:', uploadData.objectPath);

  // Upload a dummy file
  console.log('📁 Uploading test file...');
  const testContent = Buffer.from('test image content');
  await fetch(uploadData.uploadUrl, {
    method: 'PUT',
    body: testContent,
    headers: {
      'Content-Type': 'image/jpeg',
    },
  });
  console.log('✅ File uploaded\n');

  // Finalize with public visibility
  console.log('🔓 Finalizing upload with public visibility...');
  const finalizeResponse = await fetch(`${PRODUCTION_URL}/api/object-storage/finalize-upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': sessionCookie,
    },
    body: JSON.stringify({
      objectPath: uploadData.objectPath,
      visibility: 'public'
    }),
  });

  if (!finalizeResponse.ok) {
    const error = await finalizeResponse.text();
    throw new Error(`Finalize failed: ${error}`);
  }

  const finalizeData = await finalizeResponse.json();
  console.log('✅ Upload finalized:', finalizeData.objectPath);
  console.log('\n🧪 Testing public access...');

  // Test public access (without authentication)
  const publicAccessResponse = await fetch(`${PRODUCTION_URL}${finalizeData.objectPath}`);
  console.log('Status:', publicAccessResponse.status);
  console.log('Headers:', Object.fromEntries(publicAccessResponse.headers.entries()));
  
  if (publicAccessResponse.ok) {
    console.log('✅ Public access works!');
  } else {
    const errorBody = await publicAccessResponse.text();
    console.log('❌ Public access failed:', errorBody);
  }
}

testImageAcl().catch(console.error);
