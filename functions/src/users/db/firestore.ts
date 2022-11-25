import { firestore } from "firebase-admin";
import { UserId, User, CreateUser, UserUpdate, UserRepository } from "./repository";

export class FirebaseUserRepository implements UserRepository {
    readonly db: firestore.Firestore

    constructor(db: firestore.Firestore) {
        this.db = db;
    }

    public async getUserById(id: UserId): Promise<User | undefined> {
        const doc = await this.db.collection("users").doc(id).get();
        const data = doc.data();
        if (!doc.exists || !data) {
            return undefined;
        } else {
            return {
                id: doc.id,
                email: data.email,
                phone: data.phone,
                firstName: data.firstName,
                lastName: data.lastName,
                company: data.company,
                gender: data.gender,
                passwordHash: data.passwordHash,
                refreshToken: data.refreshToken,
                registrationDate: data.registrationDate,
            }
        }
    }

    public async getUserByEmail(email: string): Promise<User | undefined> {
        const result = await this.db.collection("users").where("email", "==", email).get();
        if (result.empty || result.docs.length < 1) {
            return undefined;
        } else {
            const doc = result.docs[0];
            const data = doc.data();
            return {
                id: doc.id,
                email: data.email,
                phone: data.phone,
                firstName: data.firstName,
                lastName: data.lastName,
                company: data.company,
                gender: data.gender,
                passwordHash: data.passwordHash,
                refreshToken: data.refreshToken,
                registrationDate: data.registrationDate,
            };
        }
    }

    public async createUser(u: CreateUser): Promise<User | undefined> {
        const ref = this.db.collection("users").doc();
        const tRes = await this.db.runTransaction(async (t) => {
            const docs = await t.get(this.db.collection("users").where("email", "==", u.email));
            if (docs.empty) {
                const record: {[name: string]: any} = {
                    "email": u.email,
                    "phone": u.phone,
                    "firstName": u.firstName,
                    "lastName": u.lastName,
                    "passwordHash": u.passwordHash,
                    "refreshToken": u.refreshToken,
                };

                if(u.company) { record.company = u.company; }
                if(u.gender) { record.gender = u.gender; }
                if(u.registrationDate) { record.registrationDate = u.registrationDate; }

                t.create(ref, record);

                return ref;
            } else {
                return undefined;
            }
        });
        if (!tRes) {
            return undefined;
        } else {
            return {
                id: tRes.id,
                email: u.email,
                phone: u.phone,
                firstName: u.firstName,
                lastName: u.lastName,
                company: u.company,
                gender: u.gender,
                passwordHash: u.passwordHash,
                refreshToken: u.refreshToken,
                registrationDate: u.registrationDate,
            }
        }
    }

    public async updateUser(updated: UserUpdate): Promise<void> {
        const dbUpdate: firestore.UpdateData = {};

        if (updated.email) { dbUpdate["email"] = updated.email; }
        if (updated.phone) { dbUpdate["phone"] = updated.phone; }
        if (updated.firstName) { dbUpdate["firstName"] = updated.firstName; }
        if (updated.lastName) { dbUpdate["lastName"] = updated.lastName; }
        if (updated.company) { dbUpdate["company"] = updated.company; }
        if (updated.gender) { dbUpdate["gender"] = updated.gender; }
        if (updated.passwordHash) { dbUpdate["passwordHash"] = updated.passwordHash; }
        if (updated.refreshToken) { dbUpdate["refreshToken"] = updated.refreshToken; }
        if (updated.registrationDate) { dbUpdate["registrationDate"] = updated.registrationDate; }

        await this.db.collection("users").doc(updated.id).update(dbUpdate);
    }

    public async deleteUser(id: UserId): Promise<void> {
        await this.db.collection("users").doc(id).delete();
    }
}
