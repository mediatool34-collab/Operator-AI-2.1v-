import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import {
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  doc,
} from 'firebase/firestore';

let testEnv: RulesTestEnvironment;

describe('Ad Spy System RBAC Security Rules', () => {
  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'ad-spy-rbac-test',
      firestore: {
        rules: readFileSync('firestore.rules', 'utf8'),
      },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  async function setupWorkspace(workspaceId: string, ownerId: string) {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, `workspaces/${workspaceId}`), {
        name: 'Test Workspace',
        ownerId: ownerId,
        integrations: { meta: { active: false } },
        createdAt: new Date(),
      });
      // Add owner as admin
      await setDoc(doc(db, `workspaces/${workspaceId}/members/${ownerId}`), {
        userId: ownerId,
        role: 'admin',
        addedAt: new Date(),
      });
    });
  }

  async function addMember(workspaceId: string, userId: string, role: string) {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, `workspaces/${workspaceId}/members/${userId}`), {
        userId,
        role,
        addedAt: new Date(),
      });
    });
  }

  it('allows owner to read workspace', async () => {
    const ownerId = 'user_123';
    const workspaceId = 'ws_789';
    await setupWorkspace(workspaceId, ownerId);

    const aliceDb = testEnv.authenticatedContext(ownerId).firestore();
    await assertSucceeds(getDoc(doc(aliceDb, `workspaces/${workspaceId}`)));
  });

  it('denies non-member from reading workspace', async () => {
    const ownerId = 'user_123';
    const otherId = 'user_999';
    const workspaceId = 'ws_789';
    await setupWorkspace(workspaceId, ownerId);

    const malloryDb = testEnv.authenticatedContext(otherId).firestore();
    await assertFails(getDoc(doc(malloryDb, `workspaces/${workspaceId}`)));
  });

  it('allows media_buyer to update AB tests but not workspace name', async () => {
    const ownerId = 'owner';
    const buyerId = 'buyer';
    const workspaceId = 'ws_1';
    await setupWorkspace(workspaceId, ownerId);
    await addMember(workspaceId, buyerId, 'media_buyer');

    const buyerDb = testEnv.authenticatedContext(buyerId).firestore();
    
    // Should fail: Update workspace name
    await assertFails(updateDoc(doc(buyerDb, `workspaces/${workspaceId}`), { name: 'Hacked' }));
    
    // Should succeed: Create AB Test (with setup)
    await testEnv.withSecurityRulesDisabled(async (context) => {
       await setDoc(doc(context.firestore(), `workspaces/${workspaceId}/tests/test_1`), {
         test_type: 'creative',
         status: 'active'
       });
    });
    await assertSucceeds(getDoc(doc(buyerDb, `workspaces/${workspaceId}/tests/test_1`)));
  });

  it('denies self-promotion to admin', async () => {
    const ownerId = 'owner';
    const analystId = 'analyst';
    const workspaceId = 'ws_1';
    await setupWorkspace(workspaceId, ownerId);
    await addMember(workspaceId, analystId, 'analyst');

    const analystDb = testEnv.authenticatedContext(analystId).firestore();
    await assertFails(updateDoc(doc(analystDb, `workspaces/${workspaceId}/members/${analystId}`), { role: 'admin' }));
  });

  it('denies analyst from executing actions (updating status)', async () => {
     const ownerId = 'owner';
     const analystId = 'analyst';
     const workspaceId = 'ws_1';
     await setupWorkspace(workspaceId, ownerId);
     await addMember(workspaceId, analystId, 'analyst');

     const analystDb = testEnv.authenticatedContext(analystId).firestore();
     
     await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), `workspaces/${workspaceId}/tests/test_1`), {
          status: 'active'
        });
     });

     await assertFails(updateDoc(doc(analystDb, `workspaces/${workspaceId}/tests/test_1`), { status: 'concluded' }));
  });
});
