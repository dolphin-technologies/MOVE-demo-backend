export type MessageId = number;

export type MessageState = {
    userId: string,
    messageId: string,
    read: boolean
}

export type MessageStateUpdate = {
    userId: string,
    messageId: string,
    read?: boolean | undefined,
}

export interface MessageStateRepository {
    getMessageState(userId: string, messageId: string): Promise<MessageState | undefined>;
    updateMessageStates(updates: MessageStateUpdate[]): Promise<void>;
}
