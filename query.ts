import { db } from './src/db/index.js';
import { adAccounts } from './src/db/schema.js';

db.select().from(adAccounts).then(a => {
  console.log('AD ACCOUNTS:', a);
}).catch(console.error);
