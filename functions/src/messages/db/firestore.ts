import { firestore } from "firebase-admin";

import { MessageState, MessageStateRepository, MessageStateUpdate } from "./repository";

export class FirebaseMessageStateRepository implements MessageStateRepository {
    readonly db: firestore.Firestore

    constructor(db: firestore.Firestore) {
        this.db = db;
    }

    private getRef(userId: string, messageId: string): firestore.DocumentReference<firestore.DocumentData> {
        return this.db.collection("users").doc(userId).collection("messages").doc(messageId);
    }

    async getMessageState(userId: string, messageId: string): Promise<MessageState | undefined> {
        const ref = this.getRef(userId, messageId);

        const doc = await ref.get();
        if(!doc || !doc.exists) {
            return undefined;
        }

        const data = doc.data();
        if(!data) {
            return undefined;
        }

        return {
            userId, messageId,
            read: data.read || false,
        };
    }

    async updateMessageStates(updates: MessageStateUpdate[]): Promise<void> {
        const batch = this.db.batch();

        for(const update of updates) {
            const { userId, messageId } = update;
            const ref = this.getRef(userId, messageId);

            const firestoreUpdate: firestore.UpdateData = {};
            if(update.read) { firestoreUpdate["read"] = update.read; }

            batch.set(ref, firestoreUpdate, { merge: true });
        }

        await batch.commit();
    }

}
