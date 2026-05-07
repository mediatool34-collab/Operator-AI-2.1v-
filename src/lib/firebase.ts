export const auth = {
  currentUser: {
    uid: 'mock-user-123',
    email: 'test@example.com'
  },
  onAuthStateChanged: (callback: any) => {
    callback({ uid: 'mock-user-123', email: 'test@example.com' });
    return () => {};
  }
};

export const db = {} as any;

export const signInWithGoogle = async () => {
    return auth.currentUser;
};

export const logOut = async () => {
};

export async function testConnection() {
}

export function handleFirestoreError(error: any, operationType: string, path: string | null = null) {
  console.error("Mock firestore error handled", error, operationType, path);
}
