const url = "https://graph.facebook.com/v21.0/test_id?status=ACTIVE&access_token=test_token";
fetch(url, { method: 'POST' }).then(async r => {
  console.log('Status:', r.status);
  const text = await r.text();
  console.log('Body:', text);
});
