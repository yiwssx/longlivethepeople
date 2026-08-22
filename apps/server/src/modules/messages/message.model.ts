import mongoose, { Schema, type InferSchemaType } from 'mongoose';
import messageLimits from './message.constants.ts';

const messageSchema = new Schema(
  {
    codename: { type: String, required: true, trim: true, maxlength: messageLimits.codenameMaxLength },
    affiliation: { type: String, required: true, trim: true, maxlength: messageLimits.affiliationMaxLength },
    message: { type: String, required: true, trim: true, maxlength: messageLimits.messageMaxLength },
    status: { type: String, enum: ['published', 'hidden'], default: 'published' },
    hiddenAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    collection: 'messages',
    bufferCommands: false,
  },
);

messageSchema.index({ status: 1, createdAt: -1, _id: -1 });

export type MessageDocumentShape = InferSchemaType<typeof messageSchema>;

const Message = mongoose.model('Messages', messageSchema);
export default Message;
