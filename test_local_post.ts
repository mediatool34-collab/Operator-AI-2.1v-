fetch('http://localhost:3000/api/campaigns/update', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-user-id': 'mock-user',
    'x-meta-token': 'EAACtest'
  },
  body: JSON.stringify({
    campaignId: 'camp_123',
    objectId: 'camp_123',
    platform: 'meta',
    type: 'campaign',
    dailyBudget: 100
  })
}).then(async r => {
  console.log('Status:', r.status);
  console.log('Body:', await r.text());
});
