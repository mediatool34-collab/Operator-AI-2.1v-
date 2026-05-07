import { db } from './src/db/index.js';
import { users } from './src/db/schema.js';

async function verify() {
  try {
    const testId = `test_${Date.now()}`;
    await db.insert(users).values({
      id: testId,
      email: `${testId}@example.com`,
      displayName: 'CLI Test User'
    });

    const rows = await db.select().from(users);
    console.log("SUCCESS");
    console.log("ROWS:", JSON.stringify(rows, null, 2));
    process.exit(0);
  } catch(e) {
    console.error("ERROR", e);
    process.exit(1);
  }
}

verify();
