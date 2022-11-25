export type UserId = string;

export type User = {
    id: UserId,
    email: string,
    phone: string,
    firstName: string,
    lastName: string,
    company?: string | undefined,
    gender?: string | undefined,
    passwordHash: string,
    refreshToken?: string | undefined,
    loggedOut?: boolean | undefined,
    registrationDate?: Date | undefined,
}

export type CreateUser = {
    email: string,
    phone: string,
    firstName: string,
    lastName: string,
    company?: string | undefined,
    gender?: string | undefined,
    passwordHash: string,
    refreshToken?: string | undefined,
    registrationDate?: Date | undefined,
}

export type UserUpdate = {
    id: UserId,

    email?: string | undefined,
    phone?: string | undefined,
    firstName?: string | undefined,
    lastName?: string | undefined,
    company?: string | undefined,
    gender?: string | undefined,
    passwordHash?: string | undefined,
    refreshToken?: string | undefined,
    loggedOut?: boolean | undefined,
    registrationDate?: Date | undefined,
};

export interface UserRepository {
    getUserById(u: UserId): Promise<User | undefined>;
    getUserByEmail(email: string): Promise<User | undefined>;
    createUser(u: CreateUser): Promise<User | undefined>;
    updateUser(updated: UserUpdate): Promise<void>;
    deleteUser(id: UserId): Promise<void>;
}
